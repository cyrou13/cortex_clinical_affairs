import { describe, it, expect, beforeEach } from 'vitest';
import { PlateToDocx, type PlateNode, type PlateElement } from './plate-to-docx.js';

describe('PlateToDocx', () => {
  let converter: PlateToDocx;

  beforeEach(() => {
    converter = new PlateToDocx();
  });

  describe('paragraphs', () => {
    it('converts a simple paragraph', () => {
      const nodes: PlateNode[] = [{ type: 'p', children: [{ text: 'Hello world' }] }];

      const doc = converter.convert(nodes);

      expect(doc.elements).toHaveLength(1);
      expect(doc.elements[0]!.type).toBe('paragraph');
      expect((doc.elements[0] as any).text).toBe('Hello world');
    });

    it('preserves bold formatting in paragraph', () => {
      const nodes: PlateNode[] = [{ type: 'p', children: [{ text: 'Bold text', bold: true }] }];

      const doc = converter.convert(nodes);

      expect((doc.elements[0]! as any).style.bold).toBe(true);
    });

    it('preserves italic formatting in paragraph', () => {
      const nodes: PlateNode[] = [{ type: 'p', children: [{ text: 'Italic text', italic: true }] }];

      const doc = converter.convert(nodes);

      expect((doc.elements[0] as any).style.italic).toBe(true);
    });

    it('concatenates multiple text children', () => {
      const nodes: PlateNode[] = [
        {
          type: 'p',
          children: [{ text: 'Hello ' }, { text: 'world', bold: true }],
        },
      ];

      const doc = converter.convert(nodes);

      expect((doc.elements[0] as any).text).toBe('Hello world');
    });
  });

  describe('headings', () => {
    it('converts h1 heading', () => {
      const nodes: PlateNode[] = [{ type: 'h1', children: [{ text: 'Title' }] }];

      const doc = converter.convert(nodes);

      expect(doc.elements[0]!.type).toBe('heading');
      expect((doc.elements[0] as any).level).toBe(1);
      expect((doc.elements[0] as any).text).toBe('Title');
    });

    it('converts h2 heading', () => {
      const nodes: PlateNode[] = [{ type: 'h2', children: [{ text: 'Subtitle' }] }];

      const doc = converter.convert(nodes);

      expect((doc.elements[0] as any).level).toBe(2);
    });

    it('converts h3 heading', () => {
      const nodes: PlateNode[] = [{ type: 'h3', children: [{ text: 'Sub-subtitle' }] }];

      const doc = converter.convert(nodes);

      expect((doc.elements[0] as any).level).toBe(3);
    });

    it('maps h4 to h3 level', () => {
      const nodes: PlateNode[] = [{ type: 'h4', children: [{ text: 'Deep heading' }] }];

      const doc = converter.convert(nodes);

      expect((doc.elements[0] as any).level).toBe(3);
    });
  });

  describe('lists', () => {
    it('converts bullet list', () => {
      const nodes: PlateNode[] = [
        {
          type: 'ul',
          children: [
            { type: 'li', children: [{ text: 'Item 1' }] },
            { type: 'li', children: [{ text: 'Item 2' }] },
          ],
        },
      ];

      const doc = converter.convert(nodes);

      expect(doc.elements[0]!.type).toBe('bullet-list');
      expect((doc.elements[0] as any).items).toHaveLength(2);
      expect((doc.elements[0] as any).items[0].text).toBe('Item 1');
    });

    it('converts numbered list', () => {
      const nodes: PlateNode[] = [
        {
          type: 'ol',
          children: [
            { type: 'li', children: [{ text: 'First' }] },
            { type: 'li', children: [{ text: 'Second' }] },
            { type: 'li', children: [{ text: 'Third' }] },
          ],
        },
      ];

      const doc = converter.convert(nodes);

      expect(doc.elements[0]!.type).toBe('numbered-list');
      expect((doc.elements[0] as any).items).toHaveLength(3);
    });

    it('handles standalone li as bullet list', () => {
      const nodes: PlateNode[] = [{ type: 'li', children: [{ text: 'Solo item' }] }];

      const doc = converter.convert(nodes);

      expect(doc.elements[0]!.type).toBe('bullet-list');
    });
  });

  describe('tables', () => {
    it('converts a simple table', () => {
      const nodes: PlateNode[] = [
        {
          type: 'table',
          children: [
            {
              type: 'tr',
              children: [
                { type: 'th', children: [{ text: 'Name' }] },
                { type: 'th', children: [{ text: 'Value' }] },
              ],
            },
            {
              type: 'tr',
              children: [
                { type: 'td', children: [{ text: 'Alpha' }] },
                { type: 'td', children: [{ text: '100' }] },
              ],
            },
          ],
        },
      ];

      const doc = converter.convert(nodes);

      expect(doc.elements[0]!.type).toBe('table');
      expect((doc.elements[0] as any).headers).toEqual(['Name', 'Value']);
      expect((doc.elements[0] as any).rows).toEqual([['Alpha', '100']]);
    });

    it('handles table with multiple data rows', () => {
      const nodes: PlateNode[] = [
        {
          type: 'table',
          children: [
            { type: 'tr', children: [{ type: 'th', children: [{ text: 'Col' }] }] },
            { type: 'tr', children: [{ type: 'td', children: [{ text: 'R1' }] }] },
            { type: 'tr', children: [{ type: 'td', children: [{ text: 'R2' }] }] },
          ],
        },
      ];

      const doc = converter.convert(nodes);

      expect((doc.elements[0] as any).rows).toHaveLength(2);
    });
  });

  describe('blockquote', () => {
    it('converts blockquote to italic paragraph', () => {
      const nodes: PlateNode[] = [{ type: 'blockquote', children: [{ text: 'Quoted text' }] }];

      const doc = converter.convert(nodes);

      expect(doc.elements[0]!.type).toBe('paragraph');
      expect((doc.elements[0] as any).style.italic).toBe(true);
    });
  });

  describe('document metadata', () => {
    it('sets title and author', () => {
      const nodes: PlateNode[] = [{ type: 'p', children: [{ text: 'Content' }] }];

      const doc = converter.convert(nodes, 'My Title', 'Author Name');

      expect(doc.metadata.title).toBe('My Title');
      expect(doc.metadata.author).toBe('Author Name');
    });
  });

  describe('complex documents', () => {
    it('converts a multi-element document', () => {
      const nodes: PlateNode[] = [
        { type: 'h1', children: [{ text: 'Introduction' }] },
        { type: 'p', children: [{ text: 'Some intro text.' }] },
        { type: 'h2', children: [{ text: 'Methods' }] },
        {
          type: 'ul',
          children: [
            { type: 'li', children: [{ text: 'Method A' }] },
            { type: 'li', children: [{ text: 'Method B' }] },
          ],
        },
        {
          type: 'table',
          children: [
            {
              type: 'tr',
              children: [
                { type: 'th', children: [{ text: 'Param' }] },
                { type: 'th', children: [{ text: 'Result' }] },
              ],
            },
            {
              type: 'tr',
              children: [
                { type: 'td', children: [{ text: 'AUC' }] },
                { type: 'td', children: [{ text: '0.95' }] },
              ],
            },
          ],
        },
      ];

      const doc = converter.convert(nodes, 'Report', 'System');

      expect(doc.elements).toHaveLength(5);
      expect(doc.elements[0]!.type).toBe('heading');
      expect(doc.elements[1]!.type).toBe('paragraph');
      expect(doc.elements[2]!.type).toBe('heading');
      expect(doc.elements[3]!.type).toBe('bullet-list');
      expect(doc.elements[4]!.type).toBe('table');
    });
  });

  describe('extractText', () => {
    it('extracts text from nested elements', () => {
      const node: PlateElement = {
        type: 'p',
        children: [
          { text: 'Hello ' },
          {
            type: 'a',
            children: [{ text: 'link text' }],
          } as PlateElement,
          { text: ' end' },
        ],
      };

      const text = converter.extractText(node);

      expect(text).toBe('Hello link text end');
    });
  });

  describe('inline references', () => {
    it('includes reference text in output', () => {
      const nodes: PlateNode[] = [
        {
          type: 'p',
          children: [
            { text: 'See ' },
            { text: '[Smith2024]', ref: 'bib-123' },
            { text: ' for details.' },
          ],
        },
      ];

      const doc = converter.convert(nodes);

      expect((doc.elements[0] as any).text).toBe('See [Smith2024] for details.');
    });
  });

  describe('edge cases', () => {
    it('handles empty nodes array', () => {
      const doc = converter.convert([]);

      expect(doc.elements).toHaveLength(0);
    });

    it('handles unknown element types as paragraphs', () => {
      const nodes: PlateNode[] = [{ type: 'custom-element', children: [{ text: 'Custom' }] }];

      const doc = converter.convert(nodes);

      expect(doc.elements[0]!.type).toBe('paragraph');
    });

    it('handles top-level text nodes', () => {
      const nodes: PlateNode[] = [{ text: 'Plain text' }];

      const doc = converter.convert(nodes);

      expect(doc.elements[0]!.type).toBe('paragraph');
      expect((doc.elements[0] as any).text).toBe('Plain text');
    });
  });
});
