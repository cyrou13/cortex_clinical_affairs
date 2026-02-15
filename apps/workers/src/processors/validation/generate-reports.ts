/**
 * Report Generation Worker — BullMQ processor for validation reports.
 *
 * Handles VALIDATION_REPORT and CLINICAL_BENEFIT document types.
 * Uses the hybrid engine to generate DOCX buffers with progress events.
 */

import type { Job } from 'bullmq';
import { BaseProcessor, type TaskJobData } from '../../shared/base-processor.js';
import { HybridEngine, type DocumentType, type DocumentData } from '../../shared/docx/hybrid-engine.js';

// ── Types ───────────────────────────────────────────────────────────────

export interface GenerateReportJobData extends TaskJobData {
  metadata: {
    studyId: string;
    reportType: DocumentType;
    [key: string]: unknown;
  };
}

export interface GenerateReportResult {
  taskId: string;
  reportType: DocumentType;
  bufferSize: number;
  generatedAt: string;
}

export type DataPreparator = (studyId: string) => Promise<DocumentData>;

// ── Processor ───────────────────────────────────────────────────────────

export class GenerateReportsProcessor extends BaseProcessor {
  private engine: HybridEngine;
  private dataPreparators: Map<DocumentType, DataPreparator>;

  constructor(
    redis: ConstructorParameters<typeof BaseProcessor>[0],
    engine?: HybridEngine,
  ) {
    super(redis);
    this.engine = engine ?? new HybridEngine();
    this.dataPreparators = new Map();
  }

  /**
   * Register a data preparation function for a specific report type.
   */
  registerPreparator(type: DocumentType, preparator: DataPreparator): void {
    this.dataPreparators.set(type, preparator);
  }

  async process(job: Job<GenerateReportJobData>): Promise<GenerateReportResult> {
    const { taskId, metadata } = job.data;
    const { studyId, reportType } = metadata;

    // 25% — Starting
    await this.reportProgress(job as unknown as Job<TaskJobData>, 25, {
      message: `Starting ${reportType} generation for study ${studyId}`,
    });

    // Check cancellation
    if (await this.checkCancellation(job as unknown as Job<TaskJobData>)) {
      throw new Error('Task cancelled');
    }

    // 50% — Preparing data
    await this.reportProgress(job as unknown as Job<TaskJobData>, 50, {
      message: `Preparing data for ${reportType}`,
    });

    const preparator = this.dataPreparators.get(reportType);
    let documentData: DocumentData;

    if (preparator) {
      documentData = await preparator(studyId);
    } else {
      // Fallback: minimal document data
      documentData = {
        studyId,
        title: `${reportType} — ${studyId}`,
        author: 'Cortex Clinical Affairs',
        sections: [
          {
            heading: 'Report',
            level: 1,
            content: `Auto-generated ${reportType} for study ${studyId}.`,
          },
        ],
      };
    }

    // Check cancellation again
    if (await this.checkCancellation(job as unknown as Job<TaskJobData>)) {
      throw new Error('Task cancelled');
    }

    // 75% — Generating document
    await this.reportProgress(job as unknown as Job<TaskJobData>, 75, {
      message: `Generating DOCX for ${reportType}`,
    });

    const buffer = await this.engine.generateDocument(reportType, documentData);

    // 100% — Complete
    await this.reportProgress(job as unknown as Job<TaskJobData>, 100, {
      message: `${reportType} generation complete`,
    });

    return {
      taskId,
      reportType,
      bufferSize: buffer.length,
      generatedAt: new Date().toISOString(),
    };
  }
}
