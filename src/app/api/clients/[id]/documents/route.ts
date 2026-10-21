import { NextResponse } from 'next/server';
import { addDocument, deleteDocument } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: any }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const { name, file_type, content } = await request.json();

    if (!name || !content) {
      return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });
    }

    const added = await addDocument(id, {
      name,
      file_type: file_type || 'PDF',
      created_at: new Date().toISOString(),
      content
    });

    return NextResponse.json(added);
  } catch (error) {
    console.error('Error adding document:', error);
    return NextResponse.json({ error: 'Failed to add document' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: any }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('docId');

    if (!docId) {
      return NextResponse.json({ error: 'docId parameter is required' }, { status: 400 });
    }

    const success = await deleteDocument(id, docId);
    if (!success) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
