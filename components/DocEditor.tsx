'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import { Document, saveDocument } from '@/lib/storage';
import EditorToolbar from './EditorToolbar';

interface Props {
  doc: Document;
}

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

export default function DocEditor({ doc }: Props) {
  const [title, setTitle] = useState(doc.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [wordCount, setWordCount] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docRef = useRef<Document>(doc);
  const titleRef = useRef(title);

  titleRef.current = title;

  const persistDoc = useCallback(
    (content: string, currentTitle: string) => {
      const updated: Document = {
        ...docRef.current,
        title: currentTitle,
        content,
        updatedAt: Date.now(),
      };
      docRef.current = updated;
      saveDocument(updated);
      setSaveStatus('saved');
    },
    []
  );

  const scheduleSave = useCallback(
    (content: string) => {
      setSaveStatus('saving');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        persistDoc(content, titleRef.current);
      }, 2000);
    },
    [persistDoc]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Typography,
    ],
    content: doc.content ? JSON.parse(doc.content) : '<p></p>',
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setWordCount(countWords(text));
      scheduleSave(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[calc(100vh-300px)] px-16 py-12',
      },
    },
  });

  useEffect(() => {
    if (editor && doc.content) {
      try {
        const parsed = JSON.parse(doc.content);
        const text = editor.getText();
        setWordCount(countWords(text));
        // Only set if editor is empty on mount
        if (!editor.getText()) {
          editor.commands.setContent(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, [editor, doc.content]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        if (editor) {
          persistDoc(JSON.stringify(editor.getJSON()), titleRef.current);
        }
      }
    };
  }, [editor, persistDoc]);

  function handleTitleBlur() {
    setEditingTitle(false);
    const trimmed = title.trim() || 'Untitled document';
    setTitle(trimmed);
    if (editor) {
      persistDoc(JSON.stringify(editor.getJSON()), trimmed);
    }
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3">
        <a href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">D</span>
          </div>
        </a>
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="text-lg font-medium text-gray-900 border border-blue-400 rounded px-2 py-0.5 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          ) : (
            <h1
              className="text-lg font-medium text-gray-900 truncate cursor-text hover:bg-gray-100 rounded px-2 py-0.5 max-w-md"
              onClick={() => setEditingTitle(true)}
            >
              {title}
            </h1>
          )}
        </div>
        <div className="text-xs text-gray-400 shrink-0">
          {saveStatus === 'saving' ? 'Saving...' : 'All changes saved'}
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[850px] mx-auto my-8 bg-white shadow-md rounded-sm">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Footer word count */}
      <div className="bg-white border-t border-gray-200 px-6 py-1.5 text-xs text-gray-500 flex justify-end">
        {wordCount} {wordCount === 1 ? 'word' : 'words'}
      </div>
    </div>
  );
}
