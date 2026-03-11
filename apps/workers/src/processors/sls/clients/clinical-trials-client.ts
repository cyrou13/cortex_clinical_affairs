import type { ArticleMetadata } from '@cortex/shared';
import type { DatabaseClient, DatabaseSearchResult, DateRange } from './database-client.js';

const API_BASE = 'https://clinicaltrials.gov/api/v2/studies';
const PAGE_SIZE = 100;
const MAX_STUDIES = 500;

interface ClinicalTrialStudy {
  protocolSection?: {
    identificationModule?: {
      nctId?: string;
      briefTitle?: string;
      officialTitle?: string;
    };
    descriptionModule?: {
      briefSummary?: string;
    };
    statusModule?: {
      startDateStruct?: {
        date?: string;
      };
    };
    sponsorCollaboratorsModule?: {
      leadSponsor?: {
        name?: string;
      };
    };
  };
}

interface ClinicalTrialsResponse {
  studies?: ClinicalTrialStudy[];
  nextPageToken?: string;
  totalCount?: number;
}

export class ClinicalTrialsClient implements DatabaseClient {
  async search(query: string, dateRange?: DateRange): Promise<DatabaseSearchResult> {
    const allArticles: ArticleMetadata[] = [];
    let pageToken: string | undefined;
    let totalCount = 0;
    let fetched = 0;

    do {
      const params = new URLSearchParams({
        'query.term': query,
        pageSize: String(PAGE_SIZE),
        format: 'json',
      });

      // ClinicalTrials.gov v2 API supports filter.advanced for date ranges
      const dateFilters: string[] = [];
      if (dateRange?.from) {
        const d = dateRange.from;
        dateFilters.push(`AREA[StudyFirstPostDate]RANGE[${formatCtDate(d)}, MAX]`);
      }
      if (dateRange?.to) {
        const d = dateRange.to;
        dateFilters.push(`AREA[StudyFirstPostDate]RANGE[MIN, ${formatCtDate(d)}]`);
      }
      if (dateFilters.length > 0) {
        params.set('filter.advanced', dateFilters.join(' AND '));
      }

      if (pageToken) {
        params.set('pageToken', pageToken);
      }

      const response = await fetch(`${API_BASE}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`ClinicalTrials.gov API failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as ClinicalTrialsResponse;

      if (fetched === 0 && data.totalCount) {
        totalCount = data.totalCount;
      }

      const studies = data.studies ?? [];
      if (studies.length === 0) break;

      for (const study of studies) {
        const article = this.mapStudy(study);
        if (article) allArticles.push(article);
      }

      fetched += studies.length;
      pageToken = data.nextPageToken;
    } while (pageToken && fetched < MAX_STUDIES);

    return {
      articles: allArticles,
      totalCount: totalCount || allArticles.length,
      database: 'CLINICAL_TRIALS',
    };
  }

  private mapStudy(study: ClinicalTrialStudy): ArticleMetadata | null {
    const identification = study.protocolSection?.identificationModule;
    const title = identification?.briefTitle ?? identification?.officialTitle;
    if (!title) return null;

    const article: ArticleMetadata = {
      title,
      sourceDatabase: 'CLINICAL_TRIALS',
    };

    // Use NCT ID as pmid field
    if (identification?.nctId) {
      article.pmid = identification.nctId;
    }

    // Brief summary as abstract
    const summary = study.protocolSection?.descriptionModule?.briefSummary;
    if (summary) {
      article.abstract = summary;
    }

    // Lead sponsor as author
    const sponsor = study.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name;
    if (sponsor) {
      article.authors = [sponsor];
    }

    // Start date as publication date
    const startDate = study.protocolSection?.statusModule?.startDateStruct?.date;
    if (startDate) {
      article.publicationDate = startDate;
    }

    article.journal = 'ClinicalTrials.gov';

    return article;
  }
}

function formatCtDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
