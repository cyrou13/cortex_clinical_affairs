import { describe, it, expect } from 'vitest';
import { ChecksumService } from './checksum-service.js';

describe('ChecksumService', () => {
  const service = new ChecksumService();

  describe('computeHash', () => {
    it('returns a SHA-256 hex string', () => {
      const hash = service.computeHash('hello world');

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('returns consistent hash for same input', () => {
      const hash1 = service.computeHash('test content');
      const hash2 = service.computeHash('test content');

      expect(hash1).toBe(hash2);
    });

    it('returns different hash for different input', () => {
      const hash1 = service.computeHash('content A');
      const hash2 = service.computeHash('content B');

      expect(hash1).not.toBe(hash2);
    });

    it('handles empty string', () => {
      const hash = service.computeHash('');

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('verifyHash', () => {
    it('returns true when content matches hash', () => {
      const content = 'verify me';
      const hash = service.computeHash(content);

      expect(service.verifyHash(content, hash)).toBe(true);
    });

    it('returns false when content does not match hash', () => {
      const hash = service.computeHash('original');

      expect(service.verifyHash('modified', hash)).toBe(false);
    });

    it('returns false for invalid hash format', () => {
      expect(service.verifyHash('content', 'invalidhash')).toBe(false);
    });
  });

  describe('computeDocumentHash', () => {
    it('computes hash of concatenated sections', () => {
      const sections = [
        { content: 'Section 1' },
        { content: 'Section 2' },
      ];

      const hash = service.computeDocumentHash(sections);
      const expected = service.computeHash('Section 1Section 2');

      expect(hash).toBe(expected);
    });

    it('handles empty sections array', () => {
      const hash = service.computeDocumentHash([]);
      const expected = service.computeHash('');

      expect(hash).toBe(expected);
    });

    it('handles sections with empty content', () => {
      const sections = [
        { content: '' },
        { content: 'Some content' },
        { content: '' },
      ];

      const hash = service.computeDocumentHash(sections);
      const expected = service.computeHash('Some content');

      expect(hash).toBe(expected);
    });

    it('order of sections matters', () => {
      const hash1 = service.computeDocumentHash([
        { content: 'A' },
        { content: 'B' },
      ]);
      const hash2 = service.computeDocumentHash([
        { content: 'B' },
        { content: 'A' },
      ]);

      expect(hash1).not.toBe(hash2);
    });
  });
});
