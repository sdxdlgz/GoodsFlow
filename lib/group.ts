import bcrypt from 'bcryptjs';

import { prisma } from './prisma';

const SALT_ROUNDS = 10;

export async function createGroup(name: string, slug: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  return prisma.group.create({
    data: {
      name,
      slug,
      adminPassword: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
    },
  });
}

export async function verifyGroupPassword(groupId: string, password: string): Promise<boolean> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { adminPassword: true },
  });
  if (!group) return false;
  return bcrypt.compare(password, group.adminPassword);
}

export async function getGroupBySlug(slug: string) {
  return prisma.group.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
    },
  });
}

export async function listGroups() {
  return prisma.group.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
