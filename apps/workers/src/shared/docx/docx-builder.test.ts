import { describe, it, expect, beforeEach } from 'vitest';
import { DocxBuilder, MDR_STYLES } from './docx-builder.js';

describe('DocxBuilder', () => {
  let builder: DocxBuilder;

  beforeEach(() => {
    builder = new DocxBuilder();
  });

  describe('MDR_STYLES', () => {
    it('body text uses Times New Roman 12pt', () => {
      expect(MDR_STYLES.body.font).toBe('Times New Roman');
      expect(MDR_STYLES.body.size).toBe(12);
    });

    it('headings use Arial bold', () => {
      expect(MDR_STYLES.heading1.font).toBe('Arial');
      expect(MDR_STYLES.heading1.bold).toBe(true);
      expect(MDR_STYLES.heading2.font).toBe('Arial');
      expect(MDR_STYLES.heading2.bold).toBe(true);
      expect(MDR_STYLES.heading3.font).toBe('Arial');
      expect(MDR_STYLES.heading3.bold).toBe(true);
    });

    it('page margins are 2.5 cm', () => {
      expect(MDR_STYLES.pageMargins.top).toBe(2.5);
      expect(MDR_STYLES.pageMargins.bottom).toBe(2.5);
      expect(MDR_STYLES.pageMargins.left).toBe(2.5);
      expect(MDR_STYLES.pageMargins.right).toBe(2.5);
      expect(MDR_STYLES.pageMargins.unit).toBe('cm');
    });
  });

  describe('createHeading', () => {
    it('creates heading level 1 with Arial 16pt bold', () => {
      const heading = builder.createHeading('Introduction', 1);

      expect(heading.type).toBe('heading');
      expect(heading.text).toBe('Introduction');
      expect(heading.level).toBe(1);
      expect(heading.style).toEqual(MDR_STYLES.heading1);
    });

    it('creates heading level 2', () => {
      const heading = builder.createHeading('Methods', 2);

      expect(heading.level).toBe(2);
      expect(heading.style).toEqual(MDR_STYLES.heading2);
    });

    it('creates heading level 3', () => {
      const heading = builder.createHeading('Submethod', 3);

      expect(heading.level).toBe(3);
      expect(heading.style).toEqual(MDR_STYLES.heading3);
    });

    it('adds heading to document elements', () => {
      builder.createHeading('Test', 1);
      expect(builder.getElementCount()).toBe(1);
    });
  });

  describe('createParagraph', () => {
    it('creates paragraph with default MDR body style', () => {
      const paragraph = builder.createParagraph('Some body text');

      expect(paragraph.type).toBe('paragraph');
      expect(paragraph.text).toBe('Some body text');
      expect(paragraph.style.font).toBe('Times New Roman');
      expect(paragraph.style.size).toBe(12);
    });

    it('creates paragraph with custom style overrides', () => {
      const paragraph = builder.createParagraph('Bold text', {
        bold: true,
        italic: true,
      });

      expect(paragraph.style.bold).toBe(true);
      expect(paragraph.style.italic).toBe(true);
      expect(paragraph.style.font).toBe('Times New Roman');
    });

    it('creates paragraph with fully custom style', () => {
      const paragraph = builder.createParagraph('Custom', {
        font: 'Courier New',
        size: 10,
      });

      expect(paragraph.style.font).toBe('Courier New');
      expect(paragraph.style.size).toBe(10);
    });
  });

  describe('createTable', () => {
    it('creates table with headers and rows', () => {
      const headers = ['Name', 'Value', 'Unit'];
      const rows = [
        ['Sensitivity', '95.2', '%'],
        ['Specificity', '98.1', '%'],
      ];

      const table = builder.createTable(headers, rows);

      expect(table.type).toBe('table');
      expect(table.headers).toEqual(headers);
      expect(table.rows).toEqual(rows);
    });

    it('applies MDR table styles', () => {
      const table = builder.createTable(['A'], [['B']]);

      expect(table.style.headerStyle).toEqual(MDR_STYLES.tableHeader);
      expect(table.style.cellStyle).toEqual(MDR_STYLES.tableCell);
    });

    it('handles empty table', () => {
      const table = builder.createTable([], []);

      expect(table.headers).toEqual([]);
      expect(table.rows).toEqual([]);
    });
  });

  describe('createNumberedList', () => {
    it('creates numbered list from items', () => {
      const list = builder.createNumberedList([
        'First item',
        'Second item',
        'Third item',
      ]);

      expect(list.type).toBe('numbered-list');
      expect(list.items).toHaveLength(3);
      expect(list.items[0].text).toBe('First item');
      expect(list.items[0].level).toBe(0);
    });

    it('uses body font style', () => {
      const list = builder.createNumberedList(['Item']);

      expect(list.style.font).toBe('Times New Roman');
      expect(list.style.size).toBe(12);
    });
  });

  describe('createBulletList', () => {
    it('creates bullet list from items', () => {
      const list = builder.createBulletList(['Alpha', 'Beta']);

      expect(list.type).toBe('bullet-list');
      expect(list.items).toHaveLength(2);
      expect(list.items[1].text).toBe('Beta');
    });

    it('handles single item', () => {
      const list = builder.createBulletList(['Only item']);

      expect(list.items).toHaveLength(1);
    });
  });

  describe('addPageBreak', () => {
    it('adds page break element', () => {
      const pb = builder.addPageBreak();

      expect(pb.type).toBe('page-break');
      expect(builder.getElementCount()).toBe(1);
    });
  });

  describe('build', () => {
    it('builds complete document with metadata', () => {
      builder.setTitle('Validation Report');
      builder.setAuthor('Cortex System');
      builder.createHeading('Title', 1);
      builder.createParagraph('Content');

      const doc = builder.build();

      expect(doc.metadata.title).toBe('Validation Report');
      expect(doc.metadata.author).toBe('Cortex System');
      expect(doc.metadata.createdAt).toBeDefined();
      expect(doc.elements).toHaveLength(2);
      expect(doc.pageSetup).toEqual(MDR_STYLES.pageMargins);
    });

    it('returns a copy of elements (immutable)', () => {
      builder.createHeading('H1', 1);
      const doc = builder.build();

      builder.createParagraph('Extra');

      expect(doc.elements).toHaveLength(1);
    });

    it('builds empty document', () => {
      const doc = builder.build();

      expect(doc.elements).toHaveLength(0);
      expect(doc.metadata.title).toBe('');
    });
  });

  describe('reset', () => {
    it('clears all elements and metadata', () => {
      builder.setTitle('Test');
      builder.setAuthor('Author');
      builder.createHeading('H1', 1);
      builder.createParagraph('P');

      builder.reset();

      const doc = builder.build();
      expect(doc.elements).toHaveLength(0);
      expect(doc.metadata.title).toBe('');
      expect(doc.metadata.author).toBe('');
    });

    it('returns this for chaining', () => {
      const result = builder.reset();
      expect(result).toBe(builder);
    });
  });

  describe('fluent chaining', () => {
    it('supports method chaining for setTitle and setAuthor', () => {
      const doc = builder
        .setTitle('Report')
        .setAuthor('System')
        .build();

      expect(doc.metadata.title).toBe('Report');
      expect(doc.metadata.author).toBe('System');
    });
  });

  describe('complex document assembly', () => {
    it('builds a multi-section report structure', () => {
      builder.setTitle('Clinical Validation Report');
      builder.setAuthor('Cortex');
      builder.createHeading('1. Executive Summary', 1);
      builder.createParagraph('This report describes...');
      builder.createHeading('2. Methods', 1);
      builder.createHeading('2.1 Study Design', 2);
      builder.createParagraph('The study used...');
      builder.createTable(
        ['Metric', 'Value'],
        [
          ['AUC', '0.95'],
          ['Sensitivity', '92%'],
        ],
      );
      builder.addPageBreak();
      builder.createHeading('3. Results', 1);
      builder.createNumberedList(['Finding 1', 'Finding 2']);
      builder.createBulletList(['Note A', 'Note B']);

      const doc = builder.build();

      expect(doc.elements).toHaveLength(10);
      expect(doc.elements[0].type).toBe('heading');
      expect(doc.elements[5].type).toBe('table');
      expect(doc.elements[6].type).toBe('page-break');
      expect(doc.elements[8].type).toBe('numbered-list');
      expect(doc.elements[9].type).toBe('bullet-list');
    });
  });
});
