import { describe, it, expect } from 'vitest';
import {
  buildScoringPrompt,
  parseScoringResponse,
  type ScoringArticle,
  type ScoringContext,
  type ExclusionCodeEntry,
} from './scoring-prompt.js';

const makeArticle = (overrides?: Partial<ScoringArticle>): ScoringArticle => ({
  id: 'article-1',
  title: 'Efficacy of spinal fusion for degenerative disc disease',
  abstract:
    'This study evaluated outcomes of lumbar spinal fusion in 200 patients with degenerative disc disease.',
  authors: [
    { lastName: 'Smith', firstName: 'John' },
    { lastName: 'Doe', firstName: 'Jane' },
  ],
  journal: 'Journal of Spine Surgery',
  publicationDate: new Date('2023-06-15'),
  ...overrides,
});

const makeContext = (overrides?: Partial<ScoringContext>): ScoringContext => ({
  sessionName: 'Spinal Fusion Review',
  sessionType: 'SOA_CLINICAL',
  scopeFields: {
    population: 'Adults with degenerative disc disease',
    intervention: 'Lumbar spinal fusion',
    comparator: 'Conservative treatment',
    outcome: 'Pain reduction and functional improvement',
    deviceName: 'Spinal Fusion System XR-500',
  },
  ...overrides,
});

const makeExclusionCodes = (): ExclusionCodeEntry[] => [
  { code: 'E1', label: 'Wrong population', shortCode: 'WP' },
  { code: 'E2', label: 'Wrong intervention', shortCode: 'WI' },
  { code: 'E3', label: 'Wrong outcome', shortCode: null },
];

describe('buildScoringPrompt', () => {
  it('constructs system prompt with session context and exclusion codes', () => {
    const articles = [makeArticle()];
    const context = makeContext();
    const exclusionCodes = makeExclusionCodes();

    const { system } = buildScoringPrompt(articles, context, exclusionCodes);

    expect(system).toContain('Spinal Fusion Review');
    expect(system).toContain('SOA_CLINICAL');
    expect(system).toContain('Adults with degenerative disc disease');
    expect(system).toContain('Lumbar spinal fusion');
    expect(system).toContain('Conservative treatment');
    expect(system).toContain('Pain reduction and functional improvement');
    expect(system).toContain('Spinal Fusion System XR-500');
    expect(system).toContain('"E1" (Wrong population) [WP]');
    expect(system).toContain('"E2" (Wrong intervention) [WI]');
    expect(system).toContain('"E3" (Wrong outcome)');
    expect(system).toContain('relevanceScore');
    expect(system).toContain('aiCategory');
    expect(system).toContain('aiReasoning');
  });

  it('constructs user prompt with article details', () => {
    const articles = [makeArticle()];
    const context = makeContext();

    const { user } = buildScoringPrompt(articles, context, []);

    expect(user).toContain('article-1');
    expect(user).toContain('Efficacy of spinal fusion for degenerative disc disease');
    expect(user).toContain('This study evaluated outcomes');
    expect(user).toContain('Smith John, Doe Jane');
    expect(user).toContain('Journal of Spine Surgery');
    expect(user).toContain('2023-06-15');
    expect(user).toContain('1 article(s)');
  });

  it('handles multiple articles in a batch', () => {
    const articles = [
      makeArticle({ id: 'a1', title: 'Article One' }),
      makeArticle({ id: 'a2', title: 'Article Two' }),
      makeArticle({ id: 'a3', title: 'Article Three' }),
    ];
    const context = makeContext();

    const { user } = buildScoringPrompt(articles, context, []);

    expect(user).toContain('Article 1');
    expect(user).toContain('Article 2');
    expect(user).toContain('Article 3');
    expect(user).toContain('a1');
    expect(user).toContain('a2');
    expect(user).toContain('a3');
    expect(user).toContain('3 article(s)');
  });

  it('handles null abstract', () => {
    const articles = [makeArticle({ abstract: null })];
    const context = makeContext();

    const { user } = buildScoringPrompt(articles, context, []);

    expect(user).toContain('No abstract available');
  });

  it('handles null authors', () => {
    const articles = [makeArticle({ authors: null })];
    const context = makeContext();

    const { user } = buildScoringPrompt(articles, context, []);

    expect(user).toContain('Authors: Unknown');
  });

  it('handles string authors', () => {
    const articles = [makeArticle({ authors: 'Smith J, Doe J' })];
    const context = makeContext();

    const { user } = buildScoringPrompt(articles, context, []);

    expect(user).toContain('Authors: Smith J, Doe J');
  });

  it('handles array of string authors', () => {
    const articles = [makeArticle({ authors: ['Smith J', 'Doe J'] })];
    const context = makeContext();

    const { user } = buildScoringPrompt(articles, context, []);

    expect(user).toContain('Authors: Smith J, Doe J');
  });

  it('handles null scope fields', () => {
    const articles = [makeArticle()];
    const context = makeContext({ scopeFields: null });

    const { system } = buildScoringPrompt(articles, context, []);

    expect(system).toContain('No specific scope criteria defined');
  });

  it('handles empty scope fields', () => {
    const articles = [makeArticle()];
    const context = makeContext({ scopeFields: {} });

    const { system } = buildScoringPrompt(articles, context, []);

    expect(system).toContain('No specific scope criteria defined');
  });

  it('handles no exclusion codes', () => {
    const articles = [makeArticle()];
    const context = makeContext();

    const { system } = buildScoringPrompt(articles, context, []);

    expect(system).toContain('No exclusion codes defined');
  });

  it('handles null publication date', () => {
    const articles = [makeArticle({ publicationDate: null })];
    const context = makeContext();

    const { user } = buildScoringPrompt(articles, context, []);

    expect(user).toContain('Publication Date: Unknown');
  });

  it('handles null journal', () => {
    const articles = [makeArticle({ journal: null })];
    const context = makeContext();

    const { user } = buildScoringPrompt(articles, context, []);

    expect(user).toContain('Journal: Unknown');
  });

  it('includes additional non-standard scope fields', () => {
    const articles = [makeArticle()];
    const context = makeContext({
      scopeFields: {
        population: 'Adults',
        customField: 'Custom value',
      },
    });

    const { system } = buildScoringPrompt(articles, context, []);

    expect(system).toContain('Population: Adults');
    expect(system).toContain('customField: Custom value');
  });

  it('handles authors with name property', () => {
    const articles = [makeArticle({ authors: [{ name: 'Smith John' }] })];
    const context = makeContext();

    const { user } = buildScoringPrompt(articles, context, []);

    expect(user).toContain('Authors: Smith John');
  });
});

describe('parseScoringResponse', () => {
  it('parses valid JSON response', () => {
    const response = JSON.stringify([
      {
        articleId: 'a1',
        relevanceScore: 0.85,
        aiCategory: 'likely_relevant',
        aiExclusionCode: null,
        aiReasoning: 'Directly evaluates spinal fusion outcomes.',
      },
      {
        articleId: 'a2',
        relevanceScore: 0.2,
        aiCategory: 'likely_irrelevant',
        aiExclusionCode: 'E1',
        aiReasoning: 'Study focuses on pediatric population.',
      },
    ]);

    const results = parseScoringResponse(response);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      articleId: 'a1',
      relevanceScore: 0.85,
      aiCategory: 'likely_relevant',
      aiExclusionCode: null,
      aiReasoning: 'Directly evaluates spinal fusion outcomes.',
    });
    expect(results[1]).toEqual({
      articleId: 'a2',
      relevanceScore: 0.2,
      aiCategory: 'likely_irrelevant',
      aiExclusionCode: 'E1',
      aiReasoning: 'Study focuses on pediatric population.',
    });
  });

  it('handles markdown code fences', () => {
    const response =
      '```json\n[{"articleId":"a1","relevanceScore":0.5,"aiCategory":"uncertain","aiExclusionCode":null,"aiReasoning":"Needs review."}]\n```';

    const results = parseScoringResponse(response);

    expect(results).toHaveLength(1);
    expect(results[0]!.articleId).toBe('a1');
    expect(results[0]!.aiCategory).toBe('uncertain');
  });

  it('handles code fences without json language tag', () => {
    const response =
      '```\n[{"articleId":"a1","relevanceScore":0.5,"aiCategory":"uncertain","aiExclusionCode":null,"aiReasoning":"Needs review."}]\n```';

    const results = parseScoringResponse(response);

    expect(results).toHaveLength(1);
  });

  it('throws on non-array response', () => {
    const response = JSON.stringify({ foo: 'bar' });

    expect(() => parseScoringResponse(response)).toThrow('Unexpected JSON structure');
  });

  it('throws on missing articleId', () => {
    const response = JSON.stringify([
      { relevanceScore: 0.5, aiCategory: 'uncertain', aiReasoning: 'test' },
    ]);

    expect(() => parseScoringResponse(response)).toThrow('Missing or invalid articleId');
  });

  it('throws on invalid relevanceScore', () => {
    const response = JSON.stringify([
      { articleId: 'a1', relevanceScore: 1.5, aiCategory: 'likely_relevant', aiReasoning: 'test' },
    ]);

    expect(() => parseScoringResponse(response)).toThrow('Invalid relevanceScore');
  });

  it('throws on negative relevanceScore', () => {
    const response = JSON.stringify([
      {
        articleId: 'a1',
        relevanceScore: -0.1,
        aiCategory: 'likely_irrelevant',
        aiReasoning: 'test',
      },
    ]);

    expect(() => parseScoringResponse(response)).toThrow('Invalid relevanceScore');
  });

  it('throws on invalid aiCategory', () => {
    const response = JSON.stringify([
      { articleId: 'a1', relevanceScore: 0.5, aiCategory: 'maybe', aiReasoning: 'test' },
    ]);

    expect(() => parseScoringResponse(response)).toThrow('Invalid aiCategory');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseScoringResponse('not json')).toThrow();
  });

  it('handles missing aiReasoning', () => {
    const response = JSON.stringify([
      { articleId: 'a1', relevanceScore: 0.5, aiCategory: 'uncertain', aiExclusionCode: null },
    ]);

    const results = parseScoringResponse(response);
    expect(results[0]!.aiReasoning).toBe('');
  });

  it('coerces aiExclusionCode to string', () => {
    const response = JSON.stringify([
      {
        articleId: 'a1',
        relevanceScore: 0.2,
        aiCategory: 'likely_irrelevant',
        aiExclusionCode: 3,
        aiReasoning: 'test',
      },
    ]);

    const results = parseScoringResponse(response);
    expect(results[0]!.aiExclusionCode).toBe('3');
  });
});
