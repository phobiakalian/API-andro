import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { z } from 'zod';

const updateProfileSchema = z.object({
  fullName: z.string().max(50).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(255).optional(),
  avatarUrl: z.string().url().optional(),
});

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, username: true, fullName: true, email: true, bio: true, avatarUrl: true, createdAt: true },
    });

    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    const payload = verifyToken(token);

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.id },
      data: parsed.data,
      select: { id: true, username: true, fullName: true, email: true, bio: true, avatarUrl: true, updatedAt: true },
    });

    return NextResponse.json({ message: 'Profil berhasil diperbarui', user: updatedUser });
  } catch (error) {
    const isAuthError = error instanceof Error && error.message.toLowerCase().includes('token');
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal update profil' }, { status: isAuthError ? 401 : 500 });
  }
}