export type AiGenerationAction = 'generate_bio' | 'generate_icebreaker';
export type GeminiFailureCode =
  | 'GEMINI_RATE_LIMITED'
  | 'GEMINI_CONFIGURATION_ERROR'
  | 'AI_TEMPORARILY_UNAVAILABLE'
  | 'AI_OUTPUT_INVALID';
export type GeminiRequestResult = { ok: true; data: unknown } | { ok: false; code: GeminiFailureCode };

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

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
  // The contract requires a natural, polite opening, but legitimate Vietnamese
  // greetings do not always begin with a fixed word or end in a question mark.
  // Keep the hard structural/safety checks and let the server instruction guide tone.
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

function extractJson(response: unknown): unknown | null {
  const payload = record(response);
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  const first = record(candidates[0]);
  const content = record(first?.content);
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  const part = parts.map(record).find((entry) => typeof entry?.text === 'string');
  if (!part || typeof part.text !== 'string') return null;
  const text = part.text.trim()
    .replace(/^```(?:json)?\s*/iu, '')
    .replace(/\s*```$/u, '');
  try {
    return JSON.parse(text);
  } catch {
    // A model can occasionally prepend a short label despite responseMimeType.
    // Parse only a bounded JSON object and still validate the resulting schema below.
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export async function generateGeminiJson({
  apiKey,
  model,
  systemInstruction,
  prompt,
  schema,
  maxOutputTokens,
  fetchImpl = fetch,
}: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
  fetchImpl?: FetchLike;
}): Promise<GeminiRequestResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
            temperature: 0.6,
            maxOutputTokens,
          },
        }),
      },
    );
    if (response.status === 429) return { ok: false, code: 'GEMINI_RATE_LIMITED' };
    // Do not read or log the provider response body: it may contain request-specific data.
    // These statuses usually mean a bad/revoked server key or an unavailable model name.
    if ([400, 401, 403, 404].includes(response.status)) return { ok: false, code: 'GEMINI_CONFIGURATION_ERROR' };
    if (!response.ok) return { ok: false, code: 'AI_TEMPORARILY_UNAVAILABLE' };
    const parsed = extractJson(await response.json());
    return parsed === null
      ? { ok: false, code: 'AI_OUTPUT_INVALID' }
      : { ok: true, data: parsed };
  } catch {
    return { ok: false, code: 'AI_TEMPORARILY_UNAVAILABLE' };
  } finally {
    clearTimeout(timer);
  }
}
