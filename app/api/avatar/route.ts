// app/api/avatar/route.ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // 1. Verify JWT
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    const payload = verifyToken(token);

    // 2. Parse multipart form
    const formData = await req.formData();
    const file = formData.get('avatar') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'File avatar tidak ditemukan' }, { status: 400 });
    }
    
    // 3. Validasi file
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Hanya file gambar yang diperbolehkan' }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) { // 4MB limit
      return NextResponse.json({ error: 'Ukuran file maksimal 4MB' }, { status: 400 });
    }

    // 4. Upload ke Vercel Blob
    // ✅ access: 'public' WAJIB ada (untuk tipe TypeScript + agar URL bisa diakses publik)
    const blob = await put(`avatars/${payload.id}-${Date.now()}.jpg`, file, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false, // Opsional: biar URL predictable
    });

    // 5. Update database
    await prisma.user.update({
      where: { id: payload.id },
      data: { avatarUrl: blob.url },
    });

    return NextResponse.json({ 
      message: 'Avatar berhasil diupload', 
      url: blob.url,
      pathname: blob.pathname 
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    
    // Handle specific Vercel Blob errors
    if (error instanceof Error && error.message.includes('private store')) {
      return NextResponse.json({ 
        error: 'Konfigurasi store tidak valid. Hubungi admin untuk set akses Blob ke Public.' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Gagal upload avatar' }, { status: 500 });
  }
}