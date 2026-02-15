import type { LlmProvider, LlmConfig } from './llm-abstraction.js';
import { ManualRequiredError } from './llm-abstraction.js';
import type { TaskType } from './types.js';

interface TaskModelRecommendation {
  primary: { provider: string; model: string };
  secondary: { provider: string; model: string };
}

const TASK_RECOMMENDATIONS: Record<TaskType, TaskModelRecommendation> = {
  scoring: {
    primary: { provider: 'claude', model: 'claude-haiku-4-20250414' },
    secondary: { provider: 'openai', model: 'gpt-4o-mini' },
  },
  extraction: {
    primary: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
    secondary: { provider: 'openai', model: 'gpt-4o' },
  },
  drafting: {
    primary: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
    secondary: { provider: 'openai', model: 'gpt-4o' },
  },
  metadata_extraction: {
    primary: { provider: 'claude', model: 'claude-haiku-4-20250414' },
    secondary: { provider: 'openai', model: 'gpt-4o-mini' },
  },
};

export class CostOptimizer {
  selectProvider(
    taskType: TaskType,
    availableProviders: Map<string, LlmProvider>,
    config?: LlmConfig,
  ): LlmConfig {
    // If explicit config is provided, validate it and use it
    if (config) {
      if (availableProviders.has(config.provider)) {
        return config;
      }
      // Config provider not available, fall through to recommendations
    }

    const recommendation = TASK_RECOMMENDATIONS[taskType];
    if (!recommendation) {
      throw new ManualRequiredError(`No recommendation for task type: ${taskType}`);
    }

    // Try primary
    if (availableProviders.has(recommendation.primary.provider)) {
      return recommendation.primary;
    }

    // Try secondary
    if (availableProviders.has(recommendation.secondary.provider)) {
      return recommendation.secondary;
    }

    // Try any available provider with ollama as last resort
    if (availableProviders.has('ollama')) {
      return { provider: 'ollama', model: 'llama3' };
    }

    throw new ManualRequiredError(
      `No providers available for task type '${taskType}'. Available: ${[...availableProviders.keys()].join(', ') || 'none'}`,
    );
  }

  getRecommendation(taskType: TaskType): TaskModelRecommendation {
    const rec = TASK_RECOMMENDATIONS[taskType];
    if (!rec) {
      throw new Error(`No recommendation for task type: ${taskType}`);
    }
    return rec;
  }
}
