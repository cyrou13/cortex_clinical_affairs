/**
 * Export Proof Package Worker — BullMQ processor for generating
 * proof package DOCX documents for claim traceability.
 */

import type { Job } from 'bullmq';
import { BaseProcessor, type TaskJobData } from '../../shared/base-processor.js';
import { DocxBuilder } from '../../shared/docx/docx-builder.js';

// ── Types ───────────────────────────────────────────────────────────────

export interface ExportProofPackageJobData extends TaskJobData {
  metadata: {
    claimTraceId: string;
    claimText: string;
    refNumber: string;
    sectionTitle: string;
    sectionNumber: string;
    traceChain: Array<{
      level: number;
      label: string;
      data: Record<string, unknown>;
    }>;
    auditTrail: Array<{
      action: string;
      userId: string;
      timestamp: string;
      details: Record<string, unknown> | null;
    }>;
    [key: string]: unknown;
  };
}

export interface ExportProofPackageResult {
  taskId: string;
  claimTraceId: string;
  elementCount: number;
  generatedAt: string;
}

// ── Processor ───────────────────────────────────────────────────────────

export class ExportProofPackageProcessor extends BaseProcessor {
  async process(job: Job<ExportProofPackageJobData>): Promise<ExportProofPackageResult> {
    const { taskId, metadata } = job.data;
    const { claimTraceId, claimText, refNumber, sectionTitle, sectionNumber, traceChain, auditTrail } = metadata;

    // 25% — Starting
    await this.reportProgress(job as unknown as Job<TaskJobData>, 25, {
      message: `Starting proof package generation for claim [${refNumber}]`,
    });

    // Check cancellation
    if (await this.checkCancellation(job as unknown as Job<TaskJobData>)) {
      throw new Error('Task cancelled');
    }

    // 50% — Building document
    await this.reportProgress(job as unknown as Job<TaskJobData>, 50, {
      message: 'Building proof package document',
    });

    const builder = new DocxBuilder();
    builder.setTitle(`Proof Package — Claim [${refNumber}]`);
    builder.setAuthor('Cortex Clinical Affairs');

    // Title page
    builder.createHeading(`Proof Package — Claim [${refNumber}]`, 1);
    builder.createParagraph(`Section ${sectionNumber}: ${sectionTitle}`);
    builder.createParagraph(`Claim: ${claimText}`);
    builder.addPageBreak();

    // Traceability chain
    builder.createHeading('Traceability Chain', 2);

    for (const level of traceChain) {
      builder.createHeading(`Level ${level.level}: ${level.label}`, 3);
      const rows = Object.entries(level.data).map(([key, value]) => [
        key,
        String(value ?? 'N/A'),
      ]);
      builder.createTable(['Field', 'Value'], rows);
    }

    builder.addPageBreak();

    // 75% — Adding audit trail
    await this.reportProgress(job as unknown as Job<TaskJobData>, 75, {
      message: 'Adding audit trail',
    });

    // Check cancellation
    if (await this.checkCancellation(job as unknown as Job<TaskJobData>)) {
      throw new Error('Task cancelled');
    }

    // Audit trail
    builder.createHeading('Audit Trail', 2);

    if (auditTrail.length > 0) {
      const auditRows = auditTrail.map((entry) => [
        entry.userId,
        entry.action,
        entry.timestamp,
        entry.details ? JSON.stringify(entry.details) : '',
      ]);
      builder.createTable(['WHO', 'WHAT', 'WHEN', 'DETAILS'], auditRows);
    } else {
      builder.createParagraph('No audit trail entries found.');
    }

    const document = builder.build();

    // 100% — Complete
    await this.reportProgress(job as unknown as Job<TaskJobData>, 100, {
      message: 'Proof package generation complete',
    });

    return {
      taskId,
      claimTraceId,
      elementCount: document.elements.length,
      generatedAt: document.metadata.createdAt,
    };
  }
}
