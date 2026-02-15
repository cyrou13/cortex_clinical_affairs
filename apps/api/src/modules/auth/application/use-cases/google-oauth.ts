import { OAuth2Client } from 'google-auth-library';
import type { PrismaClient } from '@prisma/client';
import type { JwtService, TokenPair } from '../../infrastructure/services/jwt-service.js';
import { logger } from '../../../../shared/utils/logger.js';

export interface GoogleOAuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl: string | null;
  };
  tokens: TokenPair;
  isNewUser: boolean;
}

export class GoogleOAuthUseCase {
  private readonly oauthClient: OAuth2Client;
  private readonly googleClientId: string;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly jwtService: JwtService,
    googleClientId: string,
  ) {
    this.googleClientId = googleClientId;
    this.oauthClient = new OAuth2Client(googleClientId);
  }

  async execute(
    googleToken: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<GoogleOAuthResult> {
    // Verify Google token with explicit audience validation
    const ticket = await this.oauthClient.verifyIdToken({
      idToken: googleToken,
      audience: this.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      await this.logFailedLogin(null, 'Invalid Google token payload');
      throw new Error('Invalid Google token');
    }

    const { email, name, sub: googleId, picture } = payload;

    // Find or create user
    let user = await this.prisma.user.findUnique({ where: { googleId } });
    let isNewUser = false;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: name ?? email.split('@')[0] ?? 'User',
          googleId,
          avatarUrl: picture ?? null,
          role: 'CLINICAL_SPECIALIST',
        },
      });
      isNewUser = true;
      logger.info({ userId: user.id, email }, 'New user created via Google OAuth');
    }

    if (!user.isActive) {
      await this.logFailedLogin(email, 'Account disabled');
      throw new Error('Account is disabled');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.jwtService.generateTokenPair(user.id, user.role, meta);

    // Create session record
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken.substring(0, 16) + '***',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'auth.login.success',
        targetType: 'User',
        targetId: user.id,
        metadata: { method: 'google', isNewUser },
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      tokens,
      isNewUser,
    };
  }

  private async logFailedLogin(email: string | null, reason: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: 'system',
        action: 'auth.login.failed',
        targetType: 'User',
        targetId: 'unknown',
        metadata: { reason, email },
      },
    });
    logger.warn({ email, reason }, 'Failed login attempt');
  }
}
