'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Document, getDocument, saveDocument } from '@/lib/storage';
import DocEditor from '@/components/DocEditor';

export default function DocPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [doc, setDoc] = useState<Document | null>(null);

  useEffect(() => {
    let found = getDocument(id);
    if (!found) {
      const now = Date.now();
      found = {
        id: id ?? uuidv4(),
        title: 'Untitled document',
        content: '',
        createdAt: now,
        updatedAt: now,
      };
      saveDocument(found);
    }
    setDoc(found);
  }, [id, router]);

  if (!doc) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return <DocEditor doc={doc} />;
}
