'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Document, getAllDocuments, saveDocument, deleteDocument } from '@/lib/storage';
import { FileText, Trash2, Plus } from 'lucide-react';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DocList() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setDocs(getAllDocuments().sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  function createDoc() {
    const now = Date.now();
    const doc: Document = {
      id: uuidv4(),
      title: 'Untitled document',
      content: '',
      createdAt: now,
      updatedAt: now,
    };
    saveDocument(doc);
    router.push(`/docs/${doc.id}`);
  }

  function confirmDelete(id: string) {
    setDeleteId(id);
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteDocument(deleteId);
    setDocs((prev) => prev.filter((d) => d.id !== deleteId));
    setDeleteId(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
          <span className="text-white font-bold text-sm">D</span>
        </div>
        <h1 className="text-xl font-medium text-gray-800">Docs</h1>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* New doc card */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wide">
            Start a new document
          </h2>
          <button
            onClick={createDoc}
            className="flex flex-col items-center justify-center w-36 h-48 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors group"
          >
            <Plus size={28} className="text-gray-400 group-hover:text-blue-500 mb-2" />
            <span className="text-sm text-gray-500 group-hover:text-blue-600">Blank</span>
          </button>
        </div>

        {/* Recent docs */}
        {docs.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wide">
              Recent documents
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center px-4 py-3 hover:bg-gray-50 group cursor-pointer"
                  onClick={() => router.push(`/docs/${doc.id}`)}
                >
                  <FileText size={18} className="text-blue-400 mr-3 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Last modified {formatDate(doc.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(doc.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {docs.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-12">
            No documents yet. Create one above to get started.
          </p>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete document?</h3>
            <p className="text-sm text-gray-500 mb-5">
              This action cannot be undone. The document will be permanently deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
