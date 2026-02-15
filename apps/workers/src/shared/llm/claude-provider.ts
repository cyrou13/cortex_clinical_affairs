import type { LlmProvider, LlmOptions, LlmResponse } from './llm-abstraction.js';

const CLAUDE_MODELS = {
  'claude-sonnet-4-20250514': {
    inputCostPerMTok: 3.0,
    outputCostPerMTok: 15.0,
  },
  'claude-haiku-4-20250414': {
    inputCostPerMTok: 0.25,
    outputCostPerMTok: 1.25,
  },
} as const;

type ClaudeModel = keyof typeof CLAUDE_MODELS;

const DEFAULT_MODEL: ClaudeModel = 'claude-sonnet-4-20250514';

export class ClaudeProvider implements LlmProvider {
  readonly name = 'claude';
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env['ANTHROPIC_API_KEY'] ?? '';
    this.baseUrl = baseUrl ?? 'https://api.anthropic.com';
  }

  async complete(prompt: string, options: LlmOptions = {}): Promise<LlmResponse> {
    const model = (options.model ?? DEFAULT_MODEL) as string;
    const start = Date.now();

    const messages: Array<{ role: string; content: string }> = [
      { role: 'user', content: prompt },
    ];

    const body: Record<string, unknown> = {
      model,
      max_tokens: options.maxTokens ?? 4096,
      messages,
    };

    if (options.systemPrompt) {
      body.system = options.systemPrompt;
    }

    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
      model: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    const content = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const promptTokens = data.usage.input_tokens;
    const completionTokens = data.usage.output_tokens;
    const cost = this.calculateCost(model, promptTokens, completionTokens);
    const latencyMs = Date.now() - start;

    return {
      content,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      cost,
      model: data.model,
      provider: this.name,
      cached: false,
      latencyMs,
    };
  }

  estimateCost(prompt: string, options: LlmOptions = {}): number {
    const model = (options.model ?? DEFAULT_MODEL) as string;
    // Rough estimation: ~4 chars per token
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = Math.ceil((options.maxTokens ?? 4096) / 2);
    return this.calculateCost(model, estimatedInputTokens, estimatedOutputTokens);
  }

  async isAvailable(): Promise<boolean> {
    const key = this.apiKey || process.env['ANTHROPIC_API_KEY'];
    return !!key && key.length > 0;
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = CLAUDE_MODELS[model as ClaudeModel];
    if (!pricing) {
      // Default to sonnet pricing for unknown models
      const defaultPricing = CLAUDE_MODELS[DEFAULT_MODEL];
      return (
        (inputTokens / 1_000_000) * defaultPricing.inputCostPerMTok +
        (outputTokens / 1_000_000) * defaultPricing.outputCostPerMTok
      );
    }
    return (
      (inputTokens / 1_000_000) * pricing.inputCostPerMTok +
      (outputTokens / 1_000_000) * pricing.outputCostPerMTok
    );
  }
}
