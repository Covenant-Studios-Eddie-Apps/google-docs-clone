import { supabase, Document } from './supabase';

export type { Document };

export async function getAllDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
  return data ?? [];
}

export async function getDocument(id: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    console.error('Error fetching document:', error);
    return null;
  }
  return data;
}

export async function saveDocument(doc: Partial<Document> & { id: string }): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .upsert({
      id: doc.id,
      title: doc.title ?? 'Untitled document',
      content: doc.content ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving document:', error);
    return null;
  }
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting document:', error);
  }
}
