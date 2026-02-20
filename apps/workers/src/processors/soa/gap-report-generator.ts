/**
 * Generates a gap report comparing imported SOA data against
 * what a native CORTEX SOA would contain.
 */

import type { SoaExtractedData, GapReport, GapReportItem } from '@cortex/shared';

export function generateGapReport(data: SoaExtractedData): GapReport {
  const items: GapReportItem[] = [];

  // Articles without DOI/PMID
  const articlesWithoutIdentifiers = data.articles.filter((a) => !a.doi && !a.pmid);
  if (articlesWithoutIdentifiers.length > 0) {
    items.push({
      category: 'Article Identification',
      description:
        'Articles without DOI or PMID cannot be verified against bibliographic databases',
      severity: 'HIGH',
      count: articlesWithoutIdentifiers.length,
      details: articlesWithoutIdentifiers.map((a) => a.title).join('; '),
    });
  }

  // No PDFs available (imported articles won't have PDFs)
  if (data.articles.length > 0) {
    items.push({
      category: 'PDF Availability',
      description: 'Imported articles have no full-text PDFs — no source verification possible',
      severity: 'MEDIUM',
      count: data.articles.length,
    });
  }

  // No AI relevance scores
  if (data.articles.length > 0) {
    items.push({
      category: 'AI Scoring',
      description: 'No AI relevance scores — articles were not screened by the CORTEX AI pipeline',
      severity: 'LOW',
      count: data.articles.length,
    });
  }

  // No screening decisions
  if (data.articles.length > 0) {
    items.push({
      category: 'Screening',
      description: 'No inclusion/exclusion screening decisions recorded',
      severity: 'LOW',
      count: data.articles.length,
    });
  }

  // Grid cells without source quotes
  const cellsWithoutQuotes = data.gridCells.filter((c) => !c.sourceQuote);
  if (cellsWithoutQuotes.length > 0) {
    items.push({
      category: 'Data Traceability',
      description: 'Extraction grid cells without source quotes or page numbers',
      severity: 'MEDIUM',
      count: cellsWithoutQuotes.length,
    });
  }

  // Claims without full article linkage
  const claimsWithoutLinks = data.claims.filter((c) => c.articleTempIds.length === 0);
  if (claimsWithoutLinks.length > 0) {
    items.push({
      category: 'Claims Traceability',
      description: 'Claims not linked to any supporting article',
      severity: 'HIGH',
      count: claimsWithoutLinks.length,
      details: claimsWithoutLinks.map((c) => c.statementText.slice(0, 80)).join('; '),
    });
  }

  // Incomplete quality assessments
  const qaArticleIds = new Set(data.qualityAssessments.map((qa) => qa.articleTempId));
  const articlesWithoutQA = data.articles.filter((a) => !qaArticleIds.has(a.tempId));
  if (articlesWithoutQA.length > 0) {
    items.push({
      category: 'Quality Assessment',
      description: 'Articles without quality assessment (QUADAS-2 or reading grid)',
      severity: 'MEDIUM',
      count: articlesWithoutQA.length,
    });
  }

  // SLS session checks
  const sessions = (data as any).slsSessions ?? [];
  if (sessions.length === 0) {
    items.push({
      category: 'SLS Sessions',
      description: 'No SLS sessions extracted — search strategy structure missing',
      severity: 'HIGH',
    });
  } else {
    for (const session of sessions) {
      const hasScope = session.scopeFields && Object.keys(session.scopeFields).length > 0;
      if (!hasScope) {
        items.push({
          category: 'Scope Fields',
          description: `Session "${session.name}" has no scope fields (PICO/device criteria)`,
          severity: 'MEDIUM',
        });
      }
      if (!session.queries || session.queries.length === 0) {
        items.push({
          category: 'Search Queries',
          description: `Session "${session.name}" has no search queries`,
          severity: 'HIGH',
        });
      }
      if (!session.exclusionCodes || session.exclusionCodes.length === 0) {
        items.push({
          category: 'Exclusion Codes',
          description: `Session "${session.name}" has no exclusion codes`,
          severity: 'MEDIUM',
        });
      }
    }
  }

  // No query execution history (only if no sessions with queries)
  const hasAnyQueries = sessions.some((s: any) => s.queries?.length > 0);
  if (!hasAnyQueries) {
    items.push({
      category: 'Search Strategy',
      description: 'No database query execution history — search strategy not reproducible',
      severity: 'INFO',
    });
  }

  // No deduplication stats
  items.push({
    category: 'Deduplication',
    description: 'No deduplication statistics available',
    severity: 'INFO',
  });

  // No PRISMA flow data
  items.push({
    category: 'PRISMA',
    description: 'No PRISMA flow diagram data — screening flow not tracked',
    severity: 'INFO',
  });

  // Similar devices check for SIMILAR_DEVICE type
  if (data.soaType === 'SIMILAR_DEVICE' && data.similarDevices.length === 0) {
    items.push({
      category: 'Device Comparison',
      description: 'SIMILAR_DEVICE SOA type but no similar devices extracted',
      severity: 'HIGH',
    });
  }

  // Summary
  const highCount = items.filter((i) => i.severity === 'HIGH').length;
  const mediumCount = items.filter((i) => i.severity === 'MEDIUM').length;
  const lowCount = items.filter((i) => i.severity === 'LOW').length;
  const infoCount = items.filter((i) => i.severity === 'INFO').length;

  return {
    items,
    summary: {
      totalGaps: items.length,
      highCount,
      mediumCount,
      lowCount,
      infoCount,
    },
    generatedAt: new Date().toISOString(),
  };
}
