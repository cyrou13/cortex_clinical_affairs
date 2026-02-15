import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import type { Redis } from 'ioredis';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../../../../shared/utils/logger.js';

export interface TokenPayload {
  sub: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export class JwtService {
  constructor(
    private readonly jwtSecret: string,
    private readonly jwtRefreshSecret: string,
    private readonly redis: Redis,
    private readonly prisma?: PrismaClient,
  ) {}

  generateAccessToken(userId: string, role: string): string {
    return jwt.sign({ sub: userId, role }, this.jwtSecret, {
      expiresIn: ACCESS_TOKEN_TTL,
    });
  }

  async generateRefreshToken(userId: string, meta?: { ipAddress?: string; userAgent?: string }): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const hash = this.hashToken(token);
    const key = `session:${userId}:${hash}`;

    await this.redis.set(
      key,
      JSON.stringify({
        userId,
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      }),
      'EX',
      REFRESH_TOKEN_TTL_SECONDS,
    );

    return token;
  }

  async generateTokenPair(userId: string, role: string, meta?: { ipAddress?: string; userAgent?: string }): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(userId, role);
    const refreshToken = await this.generateRefreshToken(userId, meta);
    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
    return { sub: decoded.sub, role: decoded.role };
  }

  async rotateRefreshToken(oldToken: string, userId: string, meta?: { ipAddress?: string; userAgent?: string }): Promise<TokenPair> {
    const oldHash = this.hashToken(oldToken);
    const oldKey = `session:${userId}:${oldHash}`;

    const exists = await this.redis.exists(oldKey);
    if (!exists) {
      throw new Error('Invalid or expired refresh token');
    }

    await this.redis.del(oldKey);

    const accessToken = this.generateAccessToken(userId, await this.getUserRole(userId));
    const refreshToken = await this.generateRefreshToken(userId, meta);
    return { accessToken, refreshToken };
  }

  async invalidateRefreshToken(token: string, userId: string): Promise<void> {
    const hash = this.hashToken(token);
    const key = `session:${userId}:${hash}`;
    await this.redis.del(key);
  }

  async updateLastActivity(token: string, userId: string): Promise<boolean> {
    const hash = this.hashToken(token);
    const key = `session:${userId}:${hash}`;

    const data = await this.redis.get(key);
    if (!data) return false;

    const session = JSON.parse(data) as Record<string, unknown>;
    const lastActivity = new Date(session['lastActivityAt'] as string);
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    if (lastActivity < thirtyMinutesAgo) {
      await this.redis.del(key);
      return false;
    }

    session['lastActivityAt'] = new Date().toISOString();
    const ttl = await this.redis.ttl(key);
    if (ttl > 0) {
      await this.redis.set(key, JSON.stringify(session), 'EX', ttl);
    }

    return true;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async getUserRole(userId: string): Promise<string> {
    if (!this.prisma) {
      logger.warn({ userId }, 'No Prisma client available for role lookup, using fallback');
      return 'CLINICAL_SPECIALIST';
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) {
      logger.warn({ userId }, 'User not found during role lookup');
      return 'CLINICAL_SPECIALIST';
    }
    return user.role;
  }
}
