/**
 * PlateToDocx — converts Plate JSON AST (rich text editor format) to
 * DocxBuilder element calls.
 *
 * Supported node types:
 * - paragraph (p)
 * - headings (h1, h2, h3, h4)
 * - bold, italic formatting
 * - numbered-list, bullet-list
 * - table
 * - inline references
 */

import { DocxBuilder, type DocxDocument } from './docx-builder.js';

// ── Plate AST Node Types ───────────────────────────────────────────────

export interface PlateText {
  text: string;
  bold?: boolean;
  italic?: boolean;
  ref?: string;
}

export interface PlateElement {
  type: string;
  children: (PlateElement | PlateText)[];
  level?: number;
  colSizes?: number[];
}

export type PlateNode = PlateElement | PlateText;

// ── Converter ──────────────────────────────────────────────────────────

export class PlateToDocx {
  private builder: DocxBuilder;

  constructor() {
    this.builder = new DocxBuilder();
  }

  /**
   * Convert an array of Plate AST nodes to a DocxDocument.
   */
  convert(nodes: PlateNode[], title?: string, author?: string): DocxDocument {
    this.builder.reset();

    if (title) this.builder.setTitle(title);
    if (author) this.builder.setAuthor(author);

    for (const node of nodes) {
      this.processNode(node);
    }

    return this.builder.build();
  }

  /**
   * Process a single Plate node and add corresponding DocxBuilder elements.
   */
  private processNode(node: PlateNode): void {
    if (this.isText(node)) {
      // Standalone text nodes are rare at top level — wrap in paragraph
      this.builder.createParagraph(node.text, {
        bold: node.bold,
        italic: node.italic,
      });
      return;
    }

    const element = node as PlateElement;

    switch (element.type) {
      case 'p':
        this.processParagraph(element);
        break;

      case 'h1':
        this.processHeading(element, 1);
        break;

      case 'h2':
        this.processHeading(element, 2);
        break;

      case 'h3':
        this.processHeading(element, 3);
        break;

      case 'h4':
        // Map h4 to h3 (DocxBuilder supports up to level 3)
        this.processHeading(element, 3);
        break;

      case 'ul':
        this.processList(element, 'bullet');
        break;

      case 'ol':
        this.processList(element, 'numbered');
        break;

      case 'li':
        // Individual list items at top level — wrap in bullet list
        this.builder.createBulletList([this.extractText(element)]);
        break;

      case 'table':
        this.processTable(element);
        break;

      case 'blockquote':
        this.processBlockquote(element);
        break;

      default:
        // Fall back to paragraph for unknown types
        this.processParagraph(element);
        break;
    }
  }

  private processParagraph(element: PlateElement): void {
    const text = this.extractText(element);
    const formatting = this.extractFormatting(element);

    this.builder.createParagraph(text, {
      bold: formatting.bold,
      italic: formatting.italic,
    });
  }

  private processHeading(element: PlateElement, level: 1 | 2 | 3): void {
    const text = this.extractText(element);
    this.builder.createHeading(text, level);
  }

  private processList(element: PlateElement, listType: 'bullet' | 'numbered'): void {
    const items: string[] = [];

    for (const child of element.children) {
      if (!this.isText(child)) {
        const childElement = child as PlateElement;
        if (childElement.type === 'li' || childElement.type === 'lic') {
          items.push(this.extractText(childElement));
        } else {
          items.push(this.extractText(childElement));
        }
      } else {
        items.push(child.text);
      }
    }

    if (listType === 'numbered') {
      this.builder.createNumberedList(items);
    } else {
      this.builder.createBulletList(items);
    }
  }

  private processTable(element: PlateElement): void {
    const rows: string[][] = [];

    for (const child of element.children) {
      if (!this.isText(child) && (child as PlateElement).type === 'tr') {
        const row: string[] = [];
        for (const cell of (child as PlateElement).children) {
          if (!this.isText(cell)) {
            row.push(this.extractText(cell as PlateElement));
          }
        }
        rows.push(row);
      }
    }

    // First row becomes headers, rest are data rows
    if (rows.length > 0) {
      const headers = rows[0] ?? [];
      const dataRows = rows.slice(1);
      this.builder.createTable(headers, dataRows);
    }
  }

  private processBlockquote(element: PlateElement): void {
    const text = this.extractText(element);
    this.builder.createParagraph(text, { italic: true });
  }

  /**
   * Extract plain text from a node, recursively concatenating child text.
   */
  extractText(node: PlateNode): string {
    if (this.isText(node)) {
      return node.text;
    }

    const element = node as PlateElement;
    const parts: string[] = [];

    for (const child of element.children) {
      parts.push(this.extractText(child));
    }

    return parts.join('');
  }

  /**
   * Extract formatting from first-level text children.
   */
  private extractFormatting(element: PlateElement): { bold?: boolean; italic?: boolean } {
    let bold: boolean | undefined;
    let italic: boolean | undefined;

    for (const child of element.children) {
      if (this.isText(child)) {
        if (child.bold) bold = true;
        if (child.italic) italic = true;
      }
    }

    return { bold, italic };
  }

  /**
   * Type guard: is this a text node?
   */
  private isText(node: PlateNode): node is PlateText {
    return 'text' in node && typeof (node as PlateText).text === 'string';
  }
}
