import crypto from 'node:crypto';
import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import type { SoaExtractedData } from '@cortex/shared';

interface ConfirmSoaImportInput {
  importId: string;
  editedData?: SoaExtractedData;
  userId: string;
}

interface ConfirmSoaImportResult {
  soaAnalysisId: string;
  articleCount: number;
  sessionIds: string[];
}

export class ConfirmSoaImportUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(input: ConfirmSoaImportInput): Promise<ConfirmSoaImportResult> {
    const { importId, editedData, userId } = input;

    // 1. Fetch and validate import
    const soaImport = await (this.prisma as any).soaImport.findUnique({
      where: { id: importId },
    });

    if (!soaImport) {
      throw new NotFoundError('SoaImport', importId);
    }

    if (soaImport.status !== 'REVIEW') {
      throw new ValidationError('Import must be in REVIEW status to confirm');
    }

    // 2. Merge data: editedData takes precedence over extractedData
    const rawData = soaImport.extractedData as Record<string, unknown>;
    const data = (editedData ?? rawData) as SoaExtractedData;

    if (!data || !data.articles) {
      throw new ValidationError('No extracted data available to confirm');
    }

    const projectId = soaImport.projectId as string;
    const fileName = soaImport.sourceFileName as string;

    // 3. Fetch cepId from project (required by SlsSession schema)
    const project = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
      include: { cep: true },
    });
    const cepId: string = project?.cep?.id ?? project?.cepId ?? projectId;

    // 4. Create everything in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const sessionIds: string[] = [];
      const tempIdToArticleId = new Map<string, string>();
      const slsSessions = (data as any).slsSessions as
        | Array<{
            type: 'SOA_CLINICAL' | 'SOA_DEVICE';
            name: string;
            scopeFields: Record<string, unknown>;
            queries: Array<{
              name: string;
              queryString: string;
              databases: string[];
              dateFrom?: string;
              dateTo?: string;
            }>;
            exclusionCodes: Array<{
              code: string;
              label: string;
              shortCode: string;
              description?: string;
            }>;
            articleTempIds: string[];
          }>
        | undefined;

      // Map articleTempId → sessionId for enriched sessions
      const articleTempIdToSessionId = new Map<string, string>();

      if (slsSessions && slsSessions.length > 0) {
        // a. Create SLS Sessions from extracted data
        for (const session of slsSessions) {
          const sessionId = crypto.randomUUID();
          await (tx as any).slsSession.create({
            data: {
              id: sessionId,
              projectId,
              cepId,
              name: `[Import] ${session.name}`,
              type: session.type,
              status: 'DRAFT',
              createdById: userId,
              scopeFields: (session.scopeFields ?? {}) as Prisma.InputJsonValue,
            },
          });
          sessionIds.push(sessionId);

          // Map articles to this session
          for (const tempId of session.articleTempIds ?? []) {
            articleTempIdToSessionId.set(tempId, sessionId);
          }

          // Create queries + query executions
          for (const query of session.queries ?? []) {
            const queryId = crypto.randomUUID();
            await (tx as any).slsQuery.create({
              data: {
                id: queryId,
                sessionId,
                name: query.name,
                queryString: query.queryString,
                version: 1,
                isActive: true,
                dateFrom: query.dateFrom ? new Date(query.dateFrom) : null,
                dateTo: query.dateTo ? new Date(query.dateTo) : null,
                createdById: userId,
              },
            });

            // Create one queryExecution per database
            for (const database of query.databases ?? []) {
              await (tx as any).queryExecution.create({
                data: {
                  id: crypto.randomUUID(),
                  queryId,
                  database,
                  status: 'IMPORTED',
                  articlesFound: 0,
                  articlesImported: 0,
                },
              });
            }
          }

          // Create exclusion codes
          for (let i = 0; i < (session.exclusionCodes ?? []).length; i++) {
            const code = session.exclusionCodes[i];
            await (tx as any).exclusionCode.create({
              data: {
                id: crypto.randomUUID(),
                sessionId,
                code: code.code,
                label: code.label,
                shortCode: code.shortCode,
                description: code.description ?? null,
                displayOrder: i,
              },
            });
          }
        }
      } else {
        // Fallback: legacy behavior — create default sessions
        const clinicalSessionId = crypto.randomUUID();
        await (tx as any).slsSession.create({
          data: {
            id: clinicalSessionId,
            projectId,
            cepId,
            name: `[Import] ${fileName} - Clinical`,
            type: 'SOA_CLINICAL',
            status: 'DRAFT',
            createdById: userId,
            scopeFields: {} as Prisma.InputJsonValue,
          },
        });
        sessionIds.push(clinicalSessionId);

        // All articles go to the clinical session
        for (const article of data.articles) {
          articleTempIdToSessionId.set(article.tempId, clinicalSessionId);
        }

        if (data.soaType === 'SIMILAR_DEVICE') {
          const deviceSessionId = crypto.randomUUID();
          await (tx as any).slsSession.create({
            data: {
              id: deviceSessionId,
              projectId,
              cepId,
              name: `[Import] ${fileName} - Device`,
              type: 'SOA_DEVICE',
              status: 'DRAFT',
              createdById: userId,
              scopeFields: {} as Prisma.InputJsonValue,
            },
          });
          sessionIds.push(deviceSessionId);
        }
      }

      // Default session for unmapped articles = first session
      const defaultSessionId = sessionIds[0];

      // b. Create Articles
      for (const article of data.articles) {
        const articleId = crypto.randomUUID();
        const sessionId = articleTempIdToSessionId.get(article.tempId) ?? defaultSessionId;
        await (tx as any).article.create({
          data: {
            id: articleId,
            sessionId: sessionId,
            title: article.title,
            authors: article.authors ?? null,
            publicationYear: article.publicationYear ?? null,
            doi: article.doi ?? null,
            pmid: article.pmid ?? null,
            journal: article.journal ?? null,
            abstract: article.abstract ?? null,
            status: 'FINAL_INCLUDED',
            source: 'SOA_IMPORT',
          },
        });
        tempIdToArticleId.set(article.tempId, articleId);
      }

      // c. Create SOA Analysis
      const soaAnalysisId = crypto.randomUUID();
      await tx.soaAnalysis.create({
        data: {
          id: soaAnalysisId,
          projectId,
          name: `[Import] ${fileName}`,
          type: data.soaType,
          status: 'DRAFT',
          createdById: userId,
        },
      });

      // d. Create SoaSlsLinks
      for (const sessionId of sessionIds) {
        await tx.soaSlsLink.create({
          data: {
            id: crypto.randomUUID(),
            soaAnalysisId,
            slsSessionId: sessionId,
          },
        });
      }

      // e. Create ThematicSections
      const sectionKeyToId = new Map<string, string>();
      for (const section of data.sections) {
        const sectionId = crypto.randomUUID();
        await tx.thematicSection.create({
          data: {
            id: sectionId,
            soaAnalysisId,
            sectionKey: section.sectionKey,
            title: section.title,
            orderIndex: section.orderIndex,
            status: 'DRAFT',
            narrativeContent: section.narrativeContent
              ? (section.narrativeContent as unknown as Prisma.InputJsonValue)
              : undefined,
          },
        });
        sectionKeyToId.set(section.sectionKey, sectionId);
      }

      // f. Create ExtractionGrid + Columns + Cells
      if (data.gridColumns.length > 0) {
        const gridId = crypto.randomUUID();
        await tx.extractionGrid.create({
          data: {
            id: gridId,
            soaAnalysisId,
            name: 'Imported Grid',
          },
        });

        const columnNameToId = new Map<string, string>();
        for (const col of data.gridColumns) {
          const columnId = crypto.randomUUID();
          await tx.gridColumn.create({
            data: {
              id: columnId,
              extractionGridId: gridId,
              name: col.name,
              displayName: col.displayName,
              dataType: col.dataType ?? 'TEXT',
              orderIndex: col.orderIndex,
              isRequired: col.isRequired ?? false,
            },
          });
          columnNameToId.set(col.name, columnId);
        }

        for (const cell of data.gridCells) {
          const articleId = tempIdToArticleId.get(cell.articleTempId);
          const columnId = columnNameToId.get(cell.columnName);
          if (!articleId || !columnId) continue;

          await tx.gridCell.create({
            data: {
              id: crypto.randomUUID(),
              extractionGridId: gridId,
              articleId,
              gridColumnId: columnId,
              aiExtractedValue: cell.value ?? null,
              sourceQuote: cell.sourceQuote ?? null,
              validationStatus: 'PENDING',
            },
          });
        }
      }

      // g. Create Claims + ClaimArticleLinks
      for (const claim of data.claims) {
        const claimId = crypto.randomUUID();
        const thematicSectionId = claim.thematicSectionKey
          ? (sectionKeyToId.get(claim.thematicSectionKey) ?? null)
          : null;

        await tx.claim.create({
          data: {
            id: claimId,
            soaAnalysisId,
            statementText: claim.statementText,
            thematicSectionId,
            createdById: userId,
          },
        });

        for (const articleTempId of claim.articleTempIds) {
          const articleId = tempIdToArticleId.get(articleTempId);
          if (!articleId) continue;

          await tx.claimArticleLink.create({
            data: {
              id: crypto.randomUUID(),
              claimId,
              articleId,
              sourceQuote: claim.sourceQuote ?? null,
            },
          });
        }
      }

      // h. Create SimilarDevices + Benchmarks
      for (const device of data.similarDevices) {
        const deviceId = crypto.randomUUID();
        await tx.similarDevice.create({
          data: {
            id: deviceId,
            soaAnalysisId,
            deviceName: device.deviceName,
            manufacturer: device.manufacturer,
            indication: device.indication,
            regulatoryStatus: device.regulatoryStatus,
            createdById: userId,
          },
        });

        for (const benchmark of device.benchmarks) {
          await tx.benchmark.create({
            data: {
              id: crypto.randomUUID(),
              similarDeviceId: deviceId,
              metricName: benchmark.metricName,
              metricValue: benchmark.metricValue,
              unit: benchmark.unit,
              sourceDescription: benchmark.sourceDescription ?? null,
            },
          });
        }
      }

      // i. Create QualityAssessments
      for (const qa of data.qualityAssessments) {
        const articleId = tempIdToArticleId.get(qa.articleTempId);
        if (!articleId) continue;

        await tx.qualityAssessment.create({
          data: {
            id: crypto.randomUUID(),
            soaAnalysisId,
            articleId,
            assessmentType: qa.assessmentType,
            assessmentData: qa.assessmentData as unknown as Prisma.InputJsonValue,
            dataContributionLevel: qa.dataContributionLevel,
            assessedById: userId,
            assessedAt: new Date(),
          },
        });
      }

      return {
        soaAnalysisId,
        articleCount: data.articles.length,
        sessionIds,
      };
    });

    // 5. Update SoaImport status
    await (this.prisma as any).soaImport.update({
      where: { id: importId },
      data: {
        status: 'CONFIRMED',
        soaAnalysisId: result.soaAnalysisId,
      },
    });

    return result;
  }
}
