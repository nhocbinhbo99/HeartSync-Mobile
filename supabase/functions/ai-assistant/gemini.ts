export type AiGenerationAction = 'generate_bio' | 'generate_icebreaker';

export type AiProviderFailureCode =
  | 'AI_RATE_LIMITED'
  | 'AI_CONFIGURATION_ERROR'
  | 'AI_TEMPORARILY_UNAVAILABLE'
  | 'AI_OUTPUT_INVALID';

export type GeminiRequestResult =
  | { ok: true; data: unknown }
  | { ok: false; code: AiProviderFailureCode; httpStatus?: number };

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const retryDelayMs = 350;
const requestTimeoutMs = 25_000;
const configurationStatuses = new Set([400, 401, 403, 404]);
const retryableStatuses = new Set([500, 502, 503, 504]);

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function textLength(value: string) {
  return [...value.trim()].length;
}

export function isValidBioSuggestion(value: unknown): value is string {
  return typeof value === 'string' && textLength(value) >= 80 && textLength(value) <= 300;
}

function isIcebreakerSentence(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const candidate = value.trim();
  const length = textLength(candidate);
  return length >= 20 && length <= 160 && /\p{L}/u.test(candidate);
}

export function isValidIcebreakerSuggestions(value: unknown): value is [string, string, string] {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(isIcebreakerSentence)) return false;
  return new Set(value.map((item) => item.trim().toLocaleLowerCase('vi-VN'))).size === 3;
}

export function validateGeneratedOutput(action: AiGenerationAction, value: unknown):
  | { ok: true; result: { suggestion: string } | { suggestions: [string, string, string] } }
  | { ok: false } {
  const payload = record(value);
  if (action === 'generate_bio' && isValidBioSuggestion(payload?.suggestion)) {
    return { ok: true, result: { suggestion: payload.suggestion.trim() } };
  }
  if (action === 'generate_icebreaker' && isValidIcebreakerSuggestions(payload?.suggestions)) {
    return { ok: true, result: { suggestions: payload.suggestions.map((item) => item.trim()) as [string, string, string] } };
  }
  return { ok: false };
}

function pause(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function extractStructuredJson(response: unknown): unknown | null {
  const payload = record(response);
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  const firstCandidate = record(candidates[0]);
  const content = record(firstCandidate?.content);
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  const firstPart = record(parts[0]);
  if (typeof firstPart?.text !== 'string') return null;
  try {
    return JSON.parse(firstPart.text);
  } catch {
    return null;
  }
}

/**
 * Uses Gemini structured output, then applies independent semantic validation
 * in the Function. Neither profile data nor generated text is logged.
 */
export async function generateGeminiStructuredResult({
  apiKey,
  model,
  systemInstruction,
  prompt,
  schema,
  maxOutputTokens,
  fetchImpl = fetch,
  timeoutMs = requestTimeoutMs,
}: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): Promise<GeminiRequestResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
            maxOutputTokens,
            temperature: 0.4,
          },
        }),
      });
      if (response.status === 429) return { ok: false, code: 'AI_RATE_LIMITED', httpStatus: response.status };
      if (configurationStatuses.has(response.status)) return { ok: false, code: 'AI_CONFIGURATION_ERROR', httpStatus: response.status };
      if (!response.ok) {
        if (retryableStatuses.has(response.status) && attempt === 0) {
          await pause(retryDelayMs);
          continue;
        }
        return { ok: false, code: 'AI_TEMPORARILY_UNAVAILABLE', httpStatus: response.status };
      }
      let responseBody: unknown;
      try {
        responseBody = await response.json();
      } catch {
        return { ok: false, code: 'AI_OUTPUT_INVALID' };
      }
      const data = extractStructuredJson(responseBody);
      return data === null ? { ok: false, code: 'AI_OUTPUT_INVALID' } : { ok: true, data };
    } catch {
      if (attempt === 0) {
        await pause(retryDelayMs);
        continue;
      }
      return { ok: false, code: 'AI_TEMPORARILY_UNAVAILABLE' };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, code: 'AI_TEMPORARILY_UNAVAILABLE' };
}
