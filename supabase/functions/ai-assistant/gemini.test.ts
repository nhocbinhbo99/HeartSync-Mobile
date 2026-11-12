import { generateGeminiStructuredResult, validateGeneratedOutput } from './gemini.ts';

const bio = 'Mình thích nhâm nhi cà phê, đọc những cuốn sách hay và dành cuối tuần cho một chuyến đi dạo thư thả để tìm thêm điều thú vị.';
const icebreakers = [
  'Nếu có một buổi cà phê lý tưởng, bạn sẽ chọn góc ngồi như thế nào?',
  'Cuối tuần bạn thích khám phá nơi mới hay thư giãn với một cuốn sách hơn?',
  'Chào bạn, có bộ phim nào gần đây khiến bạn muốn kể lại không?',
];

const request = {
  apiKey: 'test-key-not-a-secret',
  model: 'gemini-3.5-flash-lite',
  systemInstruction: 'System rule.',
  prompt: 'Prompt.',
  schema: { type: 'object', properties: { suggestion: { type: 'string' } }, required: ['suggestion'] },
  maxOutputTokens: 256,
};

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.test('validates Gemini Bio and exactly three distinct Icebreakers', () => {
  if (!validateGeneratedOutput('generate_bio', { suggestion: bio }).ok) throw new Error('Expected valid Bio');
  if (!validateGeneratedOutput('generate_icebreaker', { suggestions: icebreakers }).ok) throw new Error('Expected valid Icebreakers');
  if (validateGeneratedOutput('generate_icebreaker', { suggestions: [icebreakers[0], icebreakers[0], icebreakers[2]] }).ok) {
    throw new Error('Expected duplicate Icebreakers to be rejected');
  }
});

Deno.test('sends Gemini structured-output config and parses JSON text', async () => {
  let sent: Record<string, unknown> | null = null;
  const result = await generateGeminiStructuredResult({
    ...request,
    fetchImpl: async (_url, init) => {
      sent = JSON.parse(String(init?.body));
      return jsonResponse({ candidates: [{ content: { parts: [{ text: JSON.stringify({ suggestion: bio }) }] } }] });
    },
  });
  if (!result.ok || result.data === null) throw new Error('Expected a structured Gemini result');
  const sentRequest = sent as Record<string, unknown> | null;
  const config = sentRequest?.generationConfig as Record<string, unknown> | undefined;
  if (config?.responseMimeType !== 'application/json' || !config.responseJsonSchema) {
    throw new Error('Expected Gemini response schema configuration');
  }
});

Deno.test('rejects Gemini response without valid structured JSON', async () => {
  const result = await generateGeminiStructuredResult({
    ...request,
    fetchImpl: async () => jsonResponse({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] }),
  });
  if (result.ok || result.code !== 'AI_OUTPUT_INVALID') throw new Error('Expected invalid output');
});

Deno.test('maps Gemini key/configuration and rate-limit statuses safely', async () => {
  const unauthorized = await generateGeminiStructuredResult({ ...request, fetchImpl: async () => jsonResponse({}, 401) });
  if (unauthorized.ok || unauthorized.code !== 'AI_CONFIGURATION_ERROR' || unauthorized.httpStatus !== 401) {
    throw new Error('Expected configuration error');
  }
  const limited = await generateGeminiStructuredResult({ ...request, fetchImpl: async () => jsonResponse({}, 429) });
  if (limited.ok || limited.code !== 'AI_RATE_LIMITED') throw new Error('Expected rate-limit error');
  const missingModel = await generateGeminiStructuredResult({ ...request, fetchImpl: async () => jsonResponse({}, 404) });
  if (missingModel.ok || missingModel.code !== 'AI_CONFIGURATION_ERROR') throw new Error('Expected model configuration error');
});

Deno.test('retries one temporary Gemini overload before succeeding', async () => {
  let calls = 0;
  const result = await generateGeminiStructuredResult({
    ...request,
    fetchImpl: async () => {
      calls += 1;
      return calls === 1
        ? jsonResponse({}, 503)
        : jsonResponse({ candidates: [{ content: { parts: [{ text: JSON.stringify({ suggestion: bio }) }] } }] });
    },
  });
  if (!result.ok || calls !== 2) throw new Error('Expected one retry then success');
});

Deno.test('retries one timeout then returns temporary unavailable', async () => {
  const result = await generateGeminiStructuredResult({
    ...request,
    timeoutMs: 10,
    fetchImpl: async (_url, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }),
  });
  if (result.ok || result.code !== 'AI_TEMPORARILY_UNAVAILABLE') throw new Error('Expected unavailable error');
});
