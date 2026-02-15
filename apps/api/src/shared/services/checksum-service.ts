import { createHash } from 'crypto';

/**
 * ChecksumService — SHA-256 hash computation for document integrity verification.
 */
export class ChecksumService {
  /**
   * Compute SHA-256 hash of a string content.
   */
  computeHash(content: string): string {
    return createHash('sha256').update(content, 'utf-8').digest('hex');
  }

  /**
   * Verify that content matches a given hash.
   */
  verifyHash(content: string, hash: string): boolean {
    const computed = this.computeHash(content);
    return computed === hash;
  }

  /**
   * Compute hash of multiple document sections concatenated together.
   */
  computeDocumentHash(sections: { content: string }[]): string {
    const concatenated = sections.map((s) => s.content).join('');
    return this.computeHash(concatenated);
  }
}
