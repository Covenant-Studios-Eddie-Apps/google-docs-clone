'use client';

import { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface Props {
  editor: Editor | null;
  docId: string;
  onDocUpdate: (newContent: Record<string, unknown>) => void;
}

export default function AiChat({ editor, onDocUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hey. Highlight text for context, then tell me what to change. Or just give me a full doc instruction.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Track editor selection for highlighted context
  useEffect(() => {
    if (!editor) return;
    const updateSelection = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to, ' ');
        setSelectedText(text);
      } else {
        setSelectedText('');
      }
    };
    editor.on('selectionUpdate', updateSelection);
    return () => { editor.off('selectionUpdate', updateSelection); };
  }, [editor]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading || !editor) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: selectedText ? `[Context: "${selectedText.slice(0, 80)}${selectedText.length > 80 ? '...' : ''}"]\n${userMsg}` : userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: userMsg,
          selectedText: selectedText || null,
          fullContent: editor.getJSON(),
        }),
      });

      const data = await res.json();
      const result: string = data.result ?? 'Something went wrong.';

      if (selectedText && result) {
        // Replace selected text in editor
        const { from, to } = editor.state.selection;
        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, result).run();
        setSelectedText('');
        setMessages(prev => [...prev, { role: 'assistant', text: `Done. Replaced selected text.` }]);
      } else {
        // Try to parse as JSON doc update
        try {
          const parsed = JSON.parse(result);
          if (parsed.type === 'doc') {
            editor.commands.setContent(parsed);
            onDocUpdate(parsed);
            setMessages(prev => [...prev, { role: 'assistant', text: 'Done. Doc updated.' }]);
          } else {
            setMessages(prev => [...prev, { role: 'assistant', text: result }]);
          }
        } catch {
          setMessages(prev => [...prev, { role: 'assistant', text: result }]);
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error connecting to AI.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
        title="AI Editor"
      >
        {open ? <X size={20} /> : <MessageSquare size={20} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col" style={{ height: '420px' }}>
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
            <Sparkles size={16} className="text-blue-500" />
            <span className="text-sm font-semibold text-gray-800">Eddie AI</span>
            {selectedText && (
              <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full truncate max-w-[120px]" title={selectedText}>
                "{selectedText.slice(0, 20)}..."
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-500 px-3 py-2 rounded-xl rounded-bl-sm text-sm">
                  thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100">
            {selectedText && (
              <div className="text-xs text-blue-600 mb-2 truncate">
                Context: "{selectedText.slice(0, 50)}{selectedText.length > 50 ? '...' : ''}"
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Tell Eddie what to change..."
                rows={2}
                className="flex-1 resize-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="self-end w-9 h-9 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg flex items-center justify-center transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
