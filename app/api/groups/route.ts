import { NextResponse } from 'next/server';

import { createGroup, listGroups } from '@/lib/group';

export async function GET() {
  try {
    const groups = await listGroups();
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Failed to list groups:', error);
    return NextResponse.json({ error: 'Failed to list groups' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, password } = body;

    if (!name || !slug || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug, password' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters' },
        { status: 400 }
      );
    }

    const group = await createGroup(name, slug, password);
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Group name or slug already exists' }, { status: 409 });
    }
    console.error('Failed to create group:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
