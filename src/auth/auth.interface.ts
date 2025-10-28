// src/auth/auth.interfaces.ts
import { User } from '@prisma/client';

export interface JwtPayload {
  sub: string; // 'sub' is standard for subject (user ID)
  email: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

// Omit password from the user object returned on login/register
export type SanitizedUser = Omit<User, 'password'>;

export interface LoginResponse {
  user: SanitizedUser;
  tokens: Tokens;
}
