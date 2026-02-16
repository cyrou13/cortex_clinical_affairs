/**
 * DocxBuilder — builder pattern for programmatic DOCX creation.
 *
 * Produces data structures representing DOCX elements.
 * The actual DOCX serialization is handled by the HybridEngine
 * which delegates to a template engine or programmatic library.
 *
 * MDR-compliant styling constants:
 * - Body text: Times New Roman 12pt
 * - Headings: Arial, bold
 * - Page margins: 2.5 cm all sides
 */

// ── Style Constants ─────────────────────────────────────────────────────

export const MDR_STYLES = {
  body: {
    font: 'Times New Roman',
    size: 12,
    lineSpacing: 1.5,
  },
  heading1: {
    font: 'Arial',
    size: 16,
    bold: true,
  },
  heading2: {
    font: 'Arial',
    size: 14,
    bold: true,
  },
  heading3: {
    font: 'Arial',
    size: 12,
    bold: true,
  },
  pageMargins: {
    top: 2.5,
    bottom: 2.5,
    left: 2.5,
    right: 2.5,
    unit: 'cm' as const,
  },
  tableHeader: {
    font: 'Arial',
    size: 10,
    bold: true,
    backgroundColor: '#D9E2F3',
  },
  tableCell: {
    font: 'Times New Roman',
    size: 10,
  },
} as const;

// ── Element Types ───────────────────────────────────────────────────────

export interface DocxHeading {
  type: 'heading';
  text: string;
  level: 1 | 2 | 3;
  style: typeof MDR_STYLES.heading1 | typeof MDR_STYLES.heading2 | typeof MDR_STYLES.heading3;
}

export interface DocxParagraph {
  type: 'paragraph';
  text: string;
  style: {
    font: string;
    size: number;
    bold?: boolean;
    italic?: boolean;
  };
}

export interface DocxTableCell {
  text: string;
  isHeader: boolean;
}

export interface DocxTable {
  type: 'table';
  headers: string[];
  rows: string[][];
  style: {
    headerStyle: typeof MDR_STYLES.tableHeader;
    cellStyle: typeof MDR_STYLES.tableCell;
  };
}

export interface DocxListItem {
  text: string;
  level: number;
}

export interface DocxList {
  type: 'numbered-list' | 'bullet-list';
  items: DocxListItem[];
  style: {
    font: string;
    size: number;
  };
}

export interface DocxPageBreak {
  type: 'page-break';
}

export type DocxElement = DocxHeading | DocxParagraph | DocxTable | DocxList | DocxPageBreak;

export interface DocxDocument {
  elements: DocxElement[];
  metadata: {
    title: string;
    author: string;
    createdAt: string;
  };
  pageSetup: typeof MDR_STYLES.pageMargins;
}

// ── Builder ─────────────────────────────────────────────────────────────

export class DocxBuilder {
  private elements: DocxElement[] = [];
  private title = '';
  private author = '';

  setTitle(title: string): this {
    this.title = title;
    return this;
  }

  setAuthor(author: string): this {
    this.author = author;
    return this;
  }

  createHeading(text: string, level: 1 | 2 | 3): DocxHeading {
    const styleMap = {
      1: MDR_STYLES.heading1,
      2: MDR_STYLES.heading2,
      3: MDR_STYLES.heading3,
    } as const;

    const heading: DocxHeading = {
      type: 'heading',
      text,
      level,
      style: styleMap[level],
    };
    this.elements.push(heading);
    return heading;
  }

  createParagraph(text: string, style?: Partial<DocxParagraph['style']>): DocxParagraph {
    const paragraph: DocxParagraph = {
      type: 'paragraph',
      text,
      style: {
        font: style?.font ?? MDR_STYLES.body.font,
        size: style?.size ?? MDR_STYLES.body.size,
        bold: style?.bold,
        italic: style?.italic,
      },
    };
    this.elements.push(paragraph);
    return paragraph;
  }

  createTable(headers: string[], rows: string[][]): DocxTable {
    const table: DocxTable = {
      type: 'table',
      headers,
      rows,
      style: {
        headerStyle: MDR_STYLES.tableHeader,
        cellStyle: MDR_STYLES.tableCell,
      },
    };
    this.elements.push(table);
    return table;
  }

  createNumberedList(items: string[]): DocxList {
    const list: DocxList = {
      type: 'numbered-list',
      items: items.map((text, _index) => ({ text, level: 0 })),
      style: {
        font: MDR_STYLES.body.font,
        size: MDR_STYLES.body.size,
      },
    };
    this.elements.push(list);
    return list;
  }

  createBulletList(items: string[]): DocxList {
    const list: DocxList = {
      type: 'bullet-list',
      items: items.map((text) => ({ text, level: 0 })),
      style: {
        font: MDR_STYLES.body.font,
        size: MDR_STYLES.body.size,
      },
    };
    this.elements.push(list);
    return list;
  }

  addPageBreak(): DocxPageBreak {
    const pb: DocxPageBreak = { type: 'page-break' };
    this.elements.push(pb);
    return pb;
  }

  build(): DocxDocument {
    return {
      elements: [...this.elements],
      metadata: {
        title: this.title,
        author: this.author,
        createdAt: new Date().toISOString(),
      },
      pageSetup: MDR_STYLES.pageMargins,
    };
  }

  reset(): this {
    this.elements = [];
    this.title = '';
    this.author = '';
    return this;
  }

  getElementCount(): number {
    return this.elements.length;
  }
}
