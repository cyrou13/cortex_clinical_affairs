import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtService } from './jwt-service.js';
import jwt from 'jsonwebtoken';

// Mock Redis
const mockRedis = {
  set: vi.fn().mockResolvedValue('OK'),
  get: vi.fn(),
  del: vi.fn().mockResolvedValue(1),
  exists: vi.fn().mockResolvedValue(1),
  ttl: vi.fn().mockResolvedValue(600000),
};

describe('JwtService', () => {
  const JWT_SECRET = 'test-jwt-secret-at-least-16-chars';
  const JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-16';
  let jwtService: JwtService;

  beforeEach(() => {
    vi.clearAllMocks();
    jwtService = new JwtService(JWT_SECRET, JWT_REFRESH_SECRET, mockRedis as never);
  });

  describe('generateAccessToken', () => {
    it('generates a valid JWT token', () => {
      const token = jwtService.generateAccessToken('user-123', 'ADMIN');
      const decoded = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
      expect(decoded['sub']).toBe('user-123');
      expect(decoded['role']).toBe('ADMIN');
    });

    it('token expires in 15 minutes', () => {
      const token = jwtService.generateAccessToken('user-123', 'ADMIN');
      const decoded = jwt.decode(token) as Record<string, number>;
      const ttl = decoded['exp']! - decoded['iat']!;
      expect(ttl).toBe(15 * 60); // 15 minutes in seconds
    });
  });

  describe('verifyAccessToken', () => {
    it('returns payload for valid token', () => {
      const token = jwtService.generateAccessToken('user-123', 'CLINICAL_SPECIALIST');
      const payload = jwtService.verifyAccessToken(token);
      expect(payload.sub).toBe('user-123');
      expect(payload.role).toBe('CLINICAL_SPECIALIST');
    });

    it('throws for invalid token', () => {
      expect(() => jwtService.verifyAccessToken('invalid-token')).toThrow();
    });

    it('throws for expired token', () => {
      const token = jwt.sign({ sub: 'user-123', role: 'ADMIN' }, JWT_SECRET, {
        expiresIn: '-1s',
      });
      expect(() => jwtService.verifyAccessToken(token)).toThrow();
    });
  });

  describe('generateRefreshToken', () => {
    it('returns a string token', async () => {
      const token = await jwtService.generateRefreshToken('user-123');
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes hex
    });

    it('stores token hash in Redis with 7-day TTL', async () => {
      await jwtService.generateRefreshToken('user-123', { ipAddress: '127.0.0.1' });
      expect(mockRedis.set).toHaveBeenCalledTimes(1);
      const call = mockRedis.set.mock.calls[0]!;
      expect(call[0]).toMatch(/^session:user-123:/);
      expect(call[2]).toBe('EX');
      expect(call[3]).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('generateTokenPair', () => {
    it('returns both access and refresh tokens', async () => {
      const pair = await jwtService.generateTokenPair('user-123', 'ADMIN');
      expect(pair.accessToken).toBeDefined();
      expect(pair.refreshToken).toBeDefined();

      const decoded = jwt.verify(pair.accessToken, JWT_SECRET) as Record<string, unknown>;
      expect(decoded['sub']).toBe('user-123');
    });
  });

  describe('invalidateRefreshToken', () => {
    it('deletes token from Redis', async () => {
      await jwtService.invalidateRefreshToken('some-token', 'user-123');
      expect(mockRedis.del).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateLastActivity', () => {
    it('returns false when session not found', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await jwtService.updateLastActivity('token', 'user-123');
      expect(result).toBe(false);
    });

    it('returns false when session expired (30min inactivity)', async () => {
      const oldTime = new Date(Date.now() - 31 * 60 * 1000).toISOString();
      mockRedis.get.mockResolvedValue(
        JSON.stringify({ userId: 'user-123', lastActivityAt: oldTime }),
      );
      const result = await jwtService.updateLastActivity('token', 'user-123');
      expect(result).toBe(false);
    });

    it('returns true and updates for active session', async () => {
      const recentTime = new Date().toISOString();
      mockRedis.get.mockResolvedValue(
        JSON.stringify({ userId: 'user-123', lastActivityAt: recentTime }),
      );
      const result = await jwtService.updateLastActivity('token', 'user-123');
      expect(result).toBe(true);
    });
  });
});
