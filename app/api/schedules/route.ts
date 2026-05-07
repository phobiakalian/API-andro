// app/api/schedules/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { z } from 'zod';

const scheduleSchema = z.object({
  subjectName: z.string().min(1, 'Nama mata kuliah wajib diisi'),
  lecturer: z.string().max(100).optional(),
  room: z.string().max(50).optional(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format waktu: HH:mm'),
  durationMin: z.number().min(15).max(180).default(90),
  alarmOffsetMin: z.number().min(5).max(120).default(30),
  soundUri: z.string().optional(),
});

// GET: Ambil semua jadwal user
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    const payload = verifyToken(token);

    const schedules = await prisma.lectureSchedule.findMany({
      where: { userId: payload.id, isEnabled: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Get schedules error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// POST: Tambah jadwal baru
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    const payload = verifyToken(token);

    const body = await req.json();
    const parsed = scheduleSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Data tidak valid', 
        details: parsed.error.flatten() 
      }, { status: 400 });
    }

    const schedule = await prisma.lectureSchedule.create({
      data: {
        ...parsed.data,
        userId: payload.id,
      },
    });

    return NextResponse.json({ 
      message: 'Jadwal berhasil ditambahkan', 
      schedule 
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create schedule error:', error);
    return NextResponse.json({ error: 'Gagal menambah jadwal' }, { status: 500 });
  }
}

// PUT: Update jadwal
export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    const payload = verifyToken(token);

    const { id, ...updates } = await req.json();
    
    const parsed = scheduleSchema.partial().safeParse(updates);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    const schedule = await prisma.lectureSchedule.update({
      where: { id, userId: payload.id },
      data: parsed.data,
    });

    return NextResponse.json({ message: 'Jadwal berhasil diupdate', schedule });
    
  } catch (error) {
    console.error('Update schedule error:', error);
    return NextResponse.json({ error: 'Gagal update jadwal' }, { status: 500 });
  }
}

// DELETE: Hapus jadwal
export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    const payload = verifyToken(token);

    const { id } = await req.json();
    
    await prisma.lectureSchedule.delete({
      where: { id, userId: payload.id },
    });

    return NextResponse.json({ message: 'Jadwal berhasil dihapus' });
    
  } catch (error) {
    console.error('Delete schedule error:', error);
    return NextResponse.json({ error: 'Gagal hapus jadwal' }, { status: 500 });
  }
}