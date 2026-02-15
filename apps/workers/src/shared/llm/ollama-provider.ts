import type { LlmProvider, LlmOptions, LlmResponse } from './llm-abstraction.js';

const DEFAULT_MODEL = 'llama3';
const DEFAULT_URL = 'http://localhost:11434';

export class OllamaProvider implements LlmProvider {
  readonly name = 'ollama';
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env['OLLAMA_URL'] ?? DEFAULT_URL;
  }

  async complete(prompt: string, options: LlmOptions = {}): Promise<LlmResponse> {
    const model = options.model ?? DEFAULT_MODEL;
    const start = Date.now();

    let fullPrompt = prompt;
    if (options.systemPrompt) {
      fullPrompt = `${options.systemPrompt}\n\n${prompt}`;
    }

    const body: Record<string, unknown> = {
      model,
      prompt: fullPrompt,
      stream: false,
    };

    if (options.temperature !== undefined) {
      body.options = { temperature: options.temperature };
    }

    if (options.responseFormat === 'json') {
      body.format = 'json';
    }

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as {
      response: string;
      model: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };

    const promptTokens = data.prompt_eval_count ?? Math.ceil(fullPrompt.length / 4);
    const completionTokens = data.eval_count ?? Math.ceil(data.response.length / 4);
    const latencyMs = Date.now() - start;

    return {
      content: data.response,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      cost: 0,
      model: data.model,
      provider: this.name,
      cached: false,
      latencyMs,
    };
  }

  estimateCost(_prompt: string, _options: LlmOptions = {}): number {
    return 0; // Ollama is free (self-hosted)
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
