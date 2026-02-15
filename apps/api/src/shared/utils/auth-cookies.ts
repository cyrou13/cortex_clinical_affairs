import type { FastifyReply } from 'fastify';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string,
): void {
  reply.setCookie('access_token', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  reply.setCookie('refresh_token', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie('access_token', { path: '/' });
  reply.clearCookie('refresh_token', { path: '/' });
}
