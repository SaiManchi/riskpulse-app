import { OpenAI } from 'openai';

export interface AIConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  isConfigured: boolean;
}

/**
 * Returns the resolved OpenAI/BluesMinds API configuration.
 * Prioritizes OPENAI_MODEL from environment, or defaults to
 * 'meta/llama-3.2-11b-vision-instruct' when targeting BluesMinds.
 */
export function getAIConfig(): AIConfig {
  const apiKey = process.env.OPENAI_API_KEY || '';
  const baseURL = process.env.BLUESMINDS_API_BASE || process.env.OPENAI_API_BASE || undefined;

  const isBluesMinds = Boolean(baseURL && baseURL.toLowerCase().includes('bluesminds'));
  const defaultModel = isBluesMinds ? 'meta/llama-3.2-11b-vision-instruct' : 'gpt-4o';
  const model = process.env.OPENAI_MODEL || defaultModel;
  const isConfigured = Boolean(apiKey && apiKey.trim().length > 0);

  return {
    apiKey,
    baseURL,
    model,
    isConfigured
  };
}

/**
 * Creates and returns an OpenAI client instance initialized with
 * the resolved API key and base URL.
 */
export function getOpenAIClient(): OpenAI {
  const config = getAIConfig();
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL
  });
}

/**
 * Safely parses a JSON object from model output, stripping markdown blocks
 * or conversational preambles/postambles if present.
 */
export function safeParseJSON<T = any>(content: string | null | undefined, fallback?: any): T {
  const defaultFallback = (fallback !== undefined ? fallback : {}) as T;
  if (!content || !content.trim()) return defaultFallback;
  const trimmed = content.trim();

  // 1. Try direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Strip ```json ... ``` markdown codeblocks
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // 3. Extract outermost JSON object or array match
  const jsonMatch = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch && jsonMatch[0]) {
    try {
      return JSON.parse(jsonMatch[0].trim());
    } catch {}
  }

  return fallback;
}
