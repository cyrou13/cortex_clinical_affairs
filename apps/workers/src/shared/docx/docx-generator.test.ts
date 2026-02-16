import { describe, it, expect } from 'vitest';
import { generateDocxBuffer, isDocxPackageAvailable } from './docx-generator.js';
import { DocxBuilder } from './docx-builder.js';

describe('DocxGenerator', () => {
  it('should generate buffer from DocxDocument', async () => {
    const builder = new DocxBuilder();
    builder.setTitle('Test Document');
    builder.setAuthor('Test Author');
    builder.createHeading('Introduction', 1);
    builder.createParagraph('This is a test paragraph.');
    builder.createTable(['Header 1', 'Header 2'], [['Cell 1', 'Cell 2']]);

    const document = builder.build();
    const buffer = await generateDocxBuffer(document);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Since we're using stub implementation, verify it's JSON
    const content = buffer.toString('utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('should preserve document metadata', async () => {
    const builder = new DocxBuilder();
    builder.setTitle('Validation Report');
    builder.setAuthor('John Doe');
    const document = builder.build();

    const buffer = await generateDocxBuffer(document);
    const content = JSON.parse(buffer.toString('utf-8'));

    expect(content.metadata.title).toBe('Validation Report');
    expect(content.metadata.author).toBe('John Doe');
    expect(content.metadata.createdAt).toBeDefined();
  });

  it('should handle complex document with multiple elements', async () => {
    const builder = new DocxBuilder();
    builder.setTitle('Complex Report');
    builder.setAuthor('Test Author');

    builder.createHeading('Section 1', 1);
    builder.createParagraph('Introduction text.');

    builder.createHeading('Section 2', 2);
    builder.createBulletList(['Item 1', 'Item 2', 'Item 3']);

    builder.addPageBreak();

    builder.createHeading('Results', 1);
    builder.createTable(
      ['Metric', 'Value', 'Target'],
      [
        ['Sensitivity', '0.95', '0.90'],
        ['Specificity', '0.92', '0.85'],
      ],
    );

    const document = builder.build();
    const buffer = await generateDocxBuffer(document);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    const content = JSON.parse(buffer.toString('utf-8'));
    expect(content.elements).toHaveLength(7); // 3 headings, 1 paragraph, 1 list, 1 page break, 1 table
  });

  it('should check if docx package is available', () => {
    const isAvailable = isDocxPackageAvailable();
    // Since docx is not installed, this should return false
    expect(typeof isAvailable).toBe('boolean');
  });
});
