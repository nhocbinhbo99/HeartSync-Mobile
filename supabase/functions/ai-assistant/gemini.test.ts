import { generateGeminiJson, validateGeneratedOutput } from './gemini.ts';

const bio = 'Mình thích nhâm nhi cà phê, đọc những cuốn sách hay và dành cuối tuần cho một chuyến đi dạo thư thả để tìm thêm điều thú vị.';

Deno.test('validates structured Bio and exactly three distinct Icebreakers', () => {
  if (!validateGeneratedOutput('generate_bio', { suggestion: bio }).ok) throw new Error('valid Bio was rejected');
  if (!validateGeneratedOutput('generate_icebreaker', {
    suggestions: [
      'Nếu có một buổi cà phê lý tưởng, bạn sẽ chọn góc ngồi như thế nào?',
      'Cuối tuần bạn thích khám phá nơi mới hay thư giãn với một cuốn sách hơn?',
      'Chào bạn, có bộ phim nào gần đây khiến bạn muốn kể lại không?',
    ],
  }).ok) throw new Error('valid Icebreakers were rejected');
  if (validateGeneratedOutput('generate_icebreaker', { suggestions: ['Chào bạn, bạn khoẻ không?', 'Chào bạn, bạn khoẻ không?', 'Câu thứ ba có hợp lệ không?'] }).ok) {
    throw new Error('duplicate Icebreakers were accepted');
  }
  if (!validateGeneratedOutput('generate_icebreaker', {
    suggestions: [
      'Chào bạn, mong hôm nay của bạn đang diễn ra thật nhẹ nhàng và vui vẻ.',
      'Mình thấy cuộc trò chuyện này khá thú vị, rất vui được làm quen với bạn.',
      'Hy vọng bạn có một buổi tối thư giãn, mình rất mong nghe thêm về bạn.',
    ],
  }).ok) throw new Error('valid non-question greetings were rejected');
});

Deno.test('maps a mocked Gemini 429 without reading or logging response details', async () => {
  const result = await generateGeminiJson({
    apiKey: 'test-key-not-a-secret', model: 'test-model', systemInstruction: 'system', prompt: 'prompt', schema: { type: 'object' }, maxOutputTokens: 10,
    fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'ignored' } }), { status: 429 }),
  });
  if (result.ok || result.code !== 'GEMINI_RATE_LIMITED') throw new Error('429 was not mapped safely');
});

Deno.test('maps a mocked Gemini configuration status without reading response details', async () => {
  const result = await generateGeminiJson({
    apiKey: 'test-key-not-a-secret', model: 'test-model', systemInstruction: 'system', prompt: 'prompt', schema: { type: 'object' }, maxOutputTokens: 10,
    fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'ignored' } }), { status: 403 }),
  });
  if (result.ok || result.code !== 'GEMINI_CONFIGURATION_ERROR') throw new Error('configuration status was not mapped safely');
});

Deno.test('parses structured JSON from a mocked Gemini response', async () => {
  const result = await generateGeminiJson({
    apiKey: 'test-key-not-a-secret', model: 'test-model', systemInstruction: 'system', prompt: 'prompt', schema: { type: 'object' }, maxOutputTokens: 10,
    fetchImpl: async () => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ suggestion: bio }) }] } }] }),
  });
  if (!result.ok || !validateGeneratedOutput('generate_bio', result.data).ok) throw new Error('structured response was not parsed');
});

Deno.test('parses a structured response wrapped in a JSON code fence', async () => {
  const result = await generateGeminiJson({
    apiKey: 'test-key-not-a-secret', model: 'test-model', systemInstruction: 'system', prompt: 'prompt', schema: { type: 'object' }, maxOutputTokens: 10,
    fetchImpl: async () => Response.json({ candidates: [{ content: { parts: [{ text: `\`\`\`json\n${JSON.stringify({ suggestion: bio })}\n\`\`\`` }] } }] }),
  });
  if (!result.ok || !validateGeneratedOutput('generate_bio', result.data).ok) throw new Error('fenced structured response was not parsed');
});
