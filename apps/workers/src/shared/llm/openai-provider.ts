import type { LlmProvider, LlmOptions, LlmResponse } from './llm-abstraction.js';

const OPENAI_MODELS = {
  'gpt-4o': {
    inputCostPerMTok: 2.5,
    outputCostPerMTok: 10.0,
  },
  'gpt-4o-mini': {
    inputCostPerMTok: 0.15,
    outputCostPerMTok: 0.60,
  },
} as const;

type OpenAIModel = keyof typeof OPENAI_MODELS;

const DEFAULT_MODEL: OpenAIModel = 'gpt-4o';

export class OpenAIProvider implements LlmProvider {
  readonly name = 'openai';
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env['OPENAI_API_KEY'] ?? '';
    this.baseUrl = baseUrl ?? 'https://api.openai.com';
  }

  async complete(prompt: string, options: LlmOptions = {}): Promise<LlmResponse> {
    const model = (options.model ?? DEFAULT_MODEL) as string;
    const start = Date.now();

    const messages: Array<{ role: string; content: string }> = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    if (options.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const content = data.choices[0]?.message?.content ?? '';
    const promptTokens = data.usage.prompt_tokens;
    const completionTokens = data.usage.completion_tokens;
    const cost = this.calculateCost(model, promptTokens, completionTokens);
    const latencyMs = Date.now() - start;

    return {
      content,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: data.usage.total_tokens,
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
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = Math.ceil((options.maxTokens ?? 4096) / 2);
    return this.calculateCost(model, estimatedInputTokens, estimatedOutputTokens);
  }

  async isAvailable(): Promise<boolean> {
    const key = this.apiKey || process.env['OPENAI_API_KEY'];
    return !!key && key.length > 0;
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = OPENAI_MODELS[model as OpenAIModel];
    if (!pricing) {
      const defaultPricing = OPENAI_MODELS[DEFAULT_MODEL];
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
