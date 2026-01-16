import { NextResponse } from 'next/server';

import { getGroupBySlug, verifyGroupPassword } from '@/lib/group';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const group = await getGroupBySlug(slug);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isValid = await verifyGroupPassword(group.id, password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    return NextResponse.json({ success: true, groupId: group.id });
  } catch (error) {
    console.error('Failed to verify password:', error);
    return NextResponse.json({ error: 'Failed to verify password' }, { status: 500 });
  }
}
