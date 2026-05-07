import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error('JWT_SECRET tidak diatur di environment variables');

export interface JWTPayload {
  id: string;
  username: string;
  iat: number;
  exp: number;
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function extractTokenFromHeader(authHeader: string | null): string {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing atau format Authorization header salah');
  }
  return authHeader.split(' ')[1];
}