import { NextResponse } from 'next/server';

import { getGroupBySlug } from '@/lib/group';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const group = await getGroupBySlug(slug);

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Failed to get group:', error);
    return NextResponse.json({ error: 'Failed to get group' }, { status: 500 });
  }
}
