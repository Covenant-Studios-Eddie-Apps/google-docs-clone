'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import Image from '@tiptap/extension-image';
import { Document, saveDocument } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import EditorToolbar from './EditorToolbar';
import AiChat from './AiChat';

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
  // Track whether the current update came from a remote realtime event to avoid loops
  const isRemoteUpdate = useRef(false);

  titleRef.current = title;

  const persistDoc = useCallback(
    async (content: Record<string, unknown> | null, currentTitle: string) => {
      const updated = await saveDocument({
        id: docRef.current.id,
        title: currentTitle,
        content,
      });
      if (updated) {
        docRef.current = updated;
      }
      setSaveStatus('saved');
    },
    []
  );

  const scheduleSave = useCallback(
    (content: Record<string, unknown>) => {
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
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: doc.content ?? '<p></p>',
    onUpdate: ({ editor }) => {
      if (isRemoteUpdate.current) return;
      const text = editor.getText();
      setWordCount(countWords(text));
      scheduleSave(editor.getJSON() as Record<string, unknown>);
    },
    editorProps: {
      attributes: {
        class:
          'max-w-none focus:outline-none min-h-[calc(100vh-300px)] px-16 py-12',
      },
    },
  });

  // Set initial word count
  useEffect(() => {
    if (editor) {
      setWordCount(countWords(editor.getText()));
    }
  }, [editor]);

  // Real-time subscription — listen for changes from other users
  useEffect(() => {
    const channel = supabase
      .channel(`document:${doc.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `id=eq.${doc.id}`,
        },
        (payload) => {
          const updated = payload.new as Document;
          // Update title if changed remotely
          if (updated.title !== titleRef.current) {
            setTitle(updated.title);
          }
          // Update editor content if changed remotely
          if (editor && updated.content) {
            const currentJson = JSON.stringify(editor.getJSON());
            const remoteJson = JSON.stringify(updated.content);
            if (currentJson !== remoteJson) {
              isRemoteUpdate.current = true;
              // Preserve cursor position by using setContent cautiously
              const { from, to } = editor.state.selection;
              editor.commands.setContent(updated.content);
              // Attempt to restore cursor (best effort)
              try {
                editor.commands.setTextSelection({ from, to });
              } catch {
                // ignore if selection is out of bounds after content change
              }
              isRemoteUpdate.current = false;
              setWordCount(countWords(editor.getText()));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [editor, doc.id]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        if (editor) {
          persistDoc(editor.getJSON() as Record<string, unknown>, titleRef.current);
        }
      }
    };
  }, [editor, persistDoc]);

  function handleTitleBlur() {
    setEditingTitle(false);
    const trimmed = title.trim() || 'Untitled document';
    setTitle(trimmed);
    if (editor) {
      persistDoc(editor.getJSON() as Record<string, unknown>, trimmed);
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
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs text-gray-400">
            {saveStatus === 'saving' ? 'Saving...' : 'All changes saved'}
          </div>
          <button
            onClick={() => {
              if (editor) {
                setSaveStatus('saving');
                persistDoc(editor.getJSON() as Record<string, unknown>, titleRef.current);
              }
            }}
            className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded transition-colors"
          >
            Save
          </button>
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

      {/* AI Chat */}
      <AiChat
        editor={editor}
        docId={doc.id}
        onDocUpdate={(newContent) => {
          setSaveStatus('saving');
          persistDoc(newContent, titleRef.current);
        }}
      />
    </div>
  );
}
