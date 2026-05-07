import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    const payload = verifyToken(token);

    const formData = await req.formData();
    const file = formData.get('avatar') as File;
    
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Hanya file gambar yang diperbolehkan' }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'Ukuran file maksimal 4MB' }, { status: 400 });

    // Upload ke Vercel Blob (otomatis dapat URL publik)
    const blob = await put(`avatars/${payload.id}-${Date.now()}.jpg`, file, {
      access: 'public',
      contentType: file.type,
    });

    // Simpan URL ke database
    await prisma.user.update({ where: { id: payload.id }, data: { avatarUrl: blob.url } });

    return NextResponse.json({ message: 'Avatar berhasil diupload', url: blob.url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Gagal upload avatar' }, { status: 500 });
  }
}