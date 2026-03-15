'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Document, getDocument, saveDocument } from '@/lib/storage';
import DocEditor from '@/components/DocEditor';

export default function DocPage() {
  const params = useParams();
  const id = (params.id as string) ?? uuidv4();
  const [doc, setDoc] = useState<Document | null>(null);

  useEffect(() => {
    async function loadDoc() {
      let found = await getDocument(id);
      if (!found) {
        found = await saveDocument({
          id,
          title: 'Untitled document',
          content: null,
        });
      }
      setDoc(found);
    }
    loadDoc();
  }, [id]);

  if (!doc) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return <DocEditor doc={doc} />;
}
