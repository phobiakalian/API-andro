import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { z } from 'zod';
// Validasi input menggunakan Zod
const passwordSchema = z.object({
  oldPassword: z.string().min(1, 'Password lama wajib diisi'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter')
});

export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    const payload = verifyToken(token);

    const body = await req.json();
    const parsed = passwordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }

    const { oldPassword, newPassword } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return NextResponse.json({ error: 'Password lama salah' }, { status: 401 });

    const hashedNew = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedNew } });

    return NextResponse.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}