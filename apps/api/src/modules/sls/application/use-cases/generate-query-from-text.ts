import type { PrismaClient } from '@prisma/client';
import { GenerateQueryFromTextInput } from '@cortex/shared';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

export interface GenerateQueryResult {
  queryString: string;
  suggestedDateFrom: string | null;
  suggestedDateTo: string | null;
}

export class GenerateQueryFromTextUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: unknown, _userId: string): Promise<GenerateQueryResult> {
    const parsed = GenerateQueryFromTextInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i: { message: string }) => i.message).join(', '),
      );
    }

    const { sessionId, description } = parsed.data;

    // Verify session exists
    const session = await this.prisma.slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    // Call OpenAI API to generate boolean query
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new ValidationError('OpenAI API key is not configured');
    }

    const systemPrompt = `You are an expert medical literature search specialist. Given a research topic description, generate a well-structured Boolean search query suitable for PubMed and other biomedical databases.

Rules:
- Use MeSH terms where appropriate, indicated with [mh] or [Mesh]
- Use Boolean operators: AND, OR, NOT
- Group related terms with parentheses
- Include relevant synonyms and alternative spellings
- Keep the query comprehensive but focused
- If the topic implies a time range, suggest dateFrom and dateTo in ISO 8601 format (YYYY-MM-DDT00:00:00.000Z)

Respond in JSON format only:
{
  "queryString": "the boolean query",
  "suggestedDateFrom": "2020-01-01T00:00:00.000Z" or null,
  "suggestedDateTo": "2025-12-31T00:00:00.000Z" or null
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: description },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ValidationError(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new ValidationError('No response from AI model');
    }

    const result = JSON.parse(content) as {
      queryString?: string;
      suggestedDateFrom?: string;
      suggestedDateTo?: string;
    };

    if (!result.queryString) {
      throw new ValidationError('AI model did not generate a query string');
    }

    return {
      queryString: result.queryString,
      suggestedDateFrom: result.suggestedDateFrom ?? null,
      suggestedDateTo: result.suggestedDateTo ?? null,
    };
  }
}
