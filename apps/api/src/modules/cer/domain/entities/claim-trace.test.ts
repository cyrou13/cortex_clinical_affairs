import { describe, it, expect } from 'vitest';
import {
  createClaimTrace,
  verifyClaimTrace,
  updateClaimVerification,
} from './claim-trace.js';
import type { ClaimTraceData, ClaimSource } from './claim-trace.js';

function makeClaim(overrides?: Partial<ClaimTraceData>): ClaimTraceData {
  return {
    id: 'claim-1',
    cerSectionId: 'sec-1',
    claimText: 'The device demonstrates clinical benefit',
    sources: [{ sourceType: 'LITERATURE', sourceId: 'art-1' }],
    verified: false,
    verifiedAt: null,
    verifiedById: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ClaimTrace entity', () => {
  describe('createClaimTrace', () => {
    it('creates a claim trace with valid data', () => {
      const sources: ClaimSource[] = [
        { sourceType: 'LITERATURE', sourceId: 'art-1', quote: 'p < 0.05' },
      ];
      const claim = createClaimTrace('sec-1', 'Clinical benefit proven', sources);
      expect(claim.cerSectionId).toBe('sec-1');
      expect(claim.claimText).toBe('Clinical benefit proven');
      expect(claim.sources).toHaveLength(1);
      expect(claim.verified).toBe(false);
      expect(claim.id).toBeTruthy();
    });

    it('accepts multiple sources', () => {
      const sources: ClaimSource[] = [
        { sourceType: 'LITERATURE', sourceId: 'art-1' },
        { sourceType: 'EXTERNAL_DOC', sourceId: 'doc-1' },
        { sourceType: 'VIGILANCE', sourceId: 'vig-1' },
      ];
      const claim = createClaimTrace('sec-1', 'Claim text', sources);
      expect(claim.sources).toHaveLength(3);
    });

    it('throws for empty claim text', () => {
      expect(() =>
        createClaimTrace('sec-1', '', [{ sourceType: 'LITERATURE', sourceId: 'art-1' }]),
      ).toThrow('Claim text is required');
    });

    it('throws for whitespace-only claim text', () => {
      expect(() =>
        createClaimTrace('sec-1', '  ', [{ sourceType: 'LITERATURE', sourceId: 'art-1' }]),
      ).toThrow('Claim text is required');
    });

    it('throws for empty sources array', () => {
      expect(() => createClaimTrace('sec-1', 'Claim', [])).toThrow(
        'At least one source is required',
      );
    });

    it('throws for source with empty sourceId', () => {
      expect(() =>
        createClaimTrace('sec-1', 'Claim', [{ sourceType: 'LITERATURE', sourceId: '' }]),
      ).toThrow('Source ID is required');
    });

    it('trims claim text', () => {
      const claim = createClaimTrace('sec-1', '  Trimmed claim  ', [
        { sourceType: 'LITERATURE', sourceId: 'art-1' },
      ]);
      expect(claim.claimText).toBe('Trimmed claim');
    });

    it('accepts UPSTREAM_DATA source type', () => {
      const claim = createClaimTrace('sec-1', 'Claim', [
        { sourceType: 'UPSTREAM_DATA', sourceId: 'data-1' },
      ]);
      expect(claim.sources[0]!.sourceType).toBe('UPSTREAM_DATA');
    });
  });

  describe('verifyClaimTrace', () => {
    it('sets verified to true', () => {
      const claim = makeClaim({ verified: false });
      const result = verifyClaimTrace(claim, 'user-1');
      expect(result.verified).toBe(true);
      expect(result.verifiedById).toBe('user-1');
      expect(result.verifiedAt).toBeTruthy();
    });

    it('throws if already verified', () => {
      const claim = makeClaim({ verified: true });
      expect(() => verifyClaimTrace(claim, 'user-1')).toThrow('already verified');
    });
  });

  describe('updateClaimVerification', () => {
    it('marks as verified', () => {
      const claim = makeClaim({ verified: false });
      const result = updateClaimVerification(claim, true, 'user-1');
      expect(result.verified).toBe(true);
      expect(result.verifiedAt).toBeTruthy();
      expect(result.verifiedById).toBe('user-1');
    });

    it('marks as unverified', () => {
      const claim = makeClaim({
        verified: true,
        verifiedAt: '2024-01-01T00:00:00Z',
        verifiedById: 'user-1',
      });
      const result = updateClaimVerification(claim, false, 'user-2');
      expect(result.verified).toBe(false);
      expect(result.verifiedAt).toBeNull();
      expect(result.verifiedById).toBeNull();
    });

    it('updates updatedAt timestamp', () => {
      const claim = makeClaim();
      const result = updateClaimVerification(claim, true, 'user-1');
      expect(result.updatedAt).not.toBe(claim.updatedAt);
    });
  });
});
