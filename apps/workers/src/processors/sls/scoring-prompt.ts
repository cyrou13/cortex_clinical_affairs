/**
 * Scoring prompt template for AI-assisted abstract screening.
 *
 * Constructs system and user prompts that instruct the LLM to evaluate
 * articles against the session's PICO criteria, device information, and
 * exclusion codes, returning a structured JSON array of scoring results.
 */

export interface ScoringArticle {
  id: string;
  title: string;
  abstract: string | null;
  authors: unknown;
  journal: string | null;
  publicationDate: Date | null;
}

export interface ScoringContext {
  sessionName: string;
  sessionType: string;
  scopeFields: Record<string, unknown> | null;
}

export interface ExclusionCodeEntry {
  code: string;
  label: string;
  shortCode: string | null;
}

export interface ScoringResultItem {
  articleId: string;
  relevanceScore: number;
  aiCategory: 'likely_relevant' | 'uncertain' | 'likely_irrelevant';
  aiExclusionCode: string | null;
  aiReasoning: string;
}

export function buildScoringPrompt(
  articles: ScoringArticle[],
  context: ScoringContext,
  exclusionCodes: ExclusionCodeEntry[],
): { system: string; user: string } {
  const exclusionCodeList =
    exclusionCodes.length > 0
      ? exclusionCodes
          .map((ec) => `- "${ec.code}" (${ec.label})${ec.shortCode ? ` [${ec.shortCode}]` : ''}`)
          .join('\n')
      : '- No exclusion codes defined';

  const scopeDescription = buildScopeDescription(context.scopeFields);

  const system = `You are an expert systematic literature reviewer for clinical affairs and regulatory documentation in the medical device industry.

Your task is to screen article abstracts for relevance to a systematic literature search session.

## Session Context
- Session Name: ${context.sessionName}
- Session Type: ${context.sessionType}
${scopeDescription}

## Exclusion Codes
The following exclusion codes are available for categorizing irrelevant articles:
${exclusionCodeList}

## Instructions
1. For each article, evaluate the title and abstract against the PICO criteria and device information described above.
2. Assign a relevance score from 0.0 to 1.0:
   - 0.8-1.0: Highly relevant (likely_relevant)
   - 0.4-0.79: Possibly relevant, needs human review (uncertain)
   - 0.0-0.39: Not relevant (likely_irrelevant)
3. For articles scored as "likely_irrelevant", assign the most appropriate exclusion code.
4. Provide a brief reasoning (1-3 sentences) for each scoring decision.

## Response Format
Respond with ONLY a valid JSON array. Do not include any markdown formatting, code fences, or explanatory text outside the JSON.

Each element must have:
- "articleId": string (the article ID provided)
- "relevanceScore": number (0.0 to 1.0)
- "aiCategory": "likely_relevant" | "uncertain" | "likely_irrelevant"
- "aiExclusionCode": string | null (exclusion code for likely_irrelevant articles, null otherwise)
- "aiReasoning": string (brief explanation)`;

  const articleEntries = articles.map((article, index) => {
    const authors = formatAuthors(article.authors);
    const pubDate = article.publicationDate
      ? new Date(article.publicationDate).toISOString().split('T')[0]
      : 'Unknown';

    return `### Article ${index + 1}
- ID: ${article.id}
- Title: ${article.title}
- Authors: ${authors}
- Journal: ${article.journal ?? 'Unknown'}
- Publication Date: ${pubDate}
- Abstract: ${article.abstract ?? 'No abstract available'}`;
  });

  const user = `Please evaluate the following ${articles.length} article(s) for relevance:

${articleEntries.join('\n\n')}`;

  return { system, user };
}

function buildScopeDescription(scopeFields: Record<string, unknown> | null): string {
  if (!scopeFields || Object.keys(scopeFields).length === 0) {
    return '- Scope: No specific scope criteria defined';
  }

  const lines: string[] = ['## Scope / PICO Criteria'];

  const fieldLabels: Record<string, string> = {
    population: 'Population',
    intervention: 'Intervention / Device',
    comparator: 'Comparator',
    outcome: 'Outcome',
    deviceName: 'Device Name',
    deviceType: 'Device Type',
    manufacturer: 'Manufacturer',
    intendedUse: 'Intended Use',
    indication: 'Indication',
    clinicalContext: 'Clinical Context',
  };

  for (const [key, label] of Object.entries(fieldLabels)) {
    if (scopeFields[key] !== undefined && scopeFields[key] !== null && scopeFields[key] !== '') {
      lines.push(`- ${label}: ${String(scopeFields[key])}`);
    }
  }

  // Include any additional scope fields not in the standard labels
  for (const [key, value] of Object.entries(scopeFields)) {
    if (!(key in fieldLabels) && value !== undefined && value !== null && value !== '') {
      lines.push(`- ${key}: ${String(value)}`);
    }
  }

  return lines.join('\n');
}

function formatAuthors(authors: unknown): string {
  if (!authors) return 'Unknown';
  if (Array.isArray(authors)) {
    if (authors.length === 0) return 'Unknown';
    const names = authors.map((a) => {
      if (typeof a === 'string') return a;
      if (typeof a === 'object' && a !== null) {
        const obj = a as Record<string, unknown>;
        return obj.name ?? `${obj.lastName ?? ''} ${obj.firstName ?? ''}`.trim();
      }
      return String(a);
    });
    return names.filter(Boolean).join(', ') || 'Unknown';
  }
  if (typeof authors === 'string') return authors;
  return 'Unknown';
}

/**
 * Parses the LLM response JSON into an array of ScoringResultItem.
 * Handles common LLM response quirks (markdown fences, extra whitespace).
 */
export function parseScoringResponse(content: string): ScoringResultItem[] {
  // Strip markdown code fences if present
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
  }

  const parsed = JSON.parse(cleaned);

  // Handle common LLM response formats
  let items: unknown[];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    // Check if it's a wrapper object like { results: [...] } or { articles: [...] }
    const arrayProp = Object.values(parsed).find((v) => Array.isArray(v));
    if (Array.isArray(arrayProp)) {
      items = arrayProp;
    } else if ('articleId' in parsed) {
      // Single result object — wrap in array
      items = [parsed];
    } else {
      throw new Error(
        `Unexpected JSON structure in scoring response: ${Object.keys(parsed).join(', ')}`,
      );
    }
  } else {
    throw new Error(`Expected JSON array in scoring response, got ${typeof parsed}`);
  }

  return items.map((item: unknown) => {
    const entry = item as Record<string, unknown>;
    if (typeof entry.articleId !== 'string') {
      throw new Error('Missing or invalid articleId in scoring response item');
    }

    const relevanceScore = Number(entry.relevanceScore);
    if (isNaN(relevanceScore) || relevanceScore < 0 || relevanceScore > 1) {
      throw new Error(
        `Invalid relevanceScore for article ${entry.articleId}: ${entry.relevanceScore}`,
      );
    }

    const validCategories = ['likely_relevant', 'uncertain', 'likely_irrelevant'];
    if (!validCategories.includes(entry.aiCategory as string)) {
      throw new Error(`Invalid aiCategory for article ${entry.articleId}: ${entry.aiCategory}`);
    }

    return {
      articleId: entry.articleId as string,
      relevanceScore,
      aiCategory: entry.aiCategory as ScoringResultItem['aiCategory'],
      aiExclusionCode: entry.aiExclusionCode != null ? String(entry.aiExclusionCode) : null,
      aiReasoning: typeof entry.aiReasoning === 'string' ? entry.aiReasoning : '',
    };
  });
}
