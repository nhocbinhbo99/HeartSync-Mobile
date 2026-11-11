import {
  mapAiServerError,
  parseAiBioGeneration,
  parseAiIcebreakerGeneration,
  parseAiQuotas,
  validateAiBioInput,
  validateAiIcebreakerInput,
  type AiBioGeneration,
  type AiBioInput,
  type AiIcebreakerGeneration,
  type AiIcebreakerInput,
  type AiQuotas,
} from '../shared/domain/ai';
import type { Result } from '../shared/types/domain.types';
import type { AiAssistantRepository } from './contracts';
import { mapServiceError } from './errors';
import type { AppSupabaseClient } from './supabase';

type ResponseContext = { json?: () => Promise<unknown> };
type FunctionError = { context?: ResponseContext };

function hasResponseContext(value: unknown): value is FunctionError {
  return typeof value === 'object' && value !== null && 'context' in value;
}

async function mapFunctionError(error: unknown) {
  if (hasResponseContext(error) && typeof error.context?.json === 'function') {
    try {
      const mapped = mapAiServerError(await error.context.json());
      if (mapped) return mapped;
    } catch {
      // Use the stable transport error below when the Function error has no JSON body.
    }
  }
  return mapServiceError(error);
}

export class SupabaseAiAssistantRepository implements AiAssistantRepository {
  constructor(private readonly client: AppSupabaseClient) {}

  async getQuotas(): Promise<Result<AiQuotas>> {
    const { data, error } = await this.client.functions.invoke('ai-assistant', { body: { action: 'get_quota' } });
    if (error) return { ok: false, error: await mapFunctionError(error) };
    const parsed = parseAiQuotas(data);
    return parsed
      ? { ok: true, data: parsed }
      : { ok: false, error: { code: 'unavailable', message: 'Máy chủ AI trả về dữ liệu không hợp lệ.', retryable: true } };
  }

  async generateBio(input: AiBioInput): Promise<Result<AiBioGeneration>> {
    const invalid = validateAiBioInput(input);
    if (invalid) return { ok: false, error: { code: 'validation', message: invalid, retryable: false } };
    const { data, error } = await this.client.functions.invoke('ai-assistant', {
      body: { action: 'generate_bio', request_id: input.requestId, tone: input.tone, language: 'vi', user_ideas: input.ideas.trim() },
    });
    if (error) return { ok: false, error: await mapFunctionError(error) };
    const parsed = parseAiBioGeneration(data);
    return parsed
      ? { ok: true, data: parsed }
      : { ok: false, error: { code: 'unavailable', message: 'Máy chủ AI trả về nội dung không hợp lệ.', retryable: true } };
  }

  async generateIcebreaker(input: AiIcebreakerInput): Promise<Result<AiIcebreakerGeneration>> {
    const invalid = validateAiIcebreakerInput(input);
    if (invalid) return { ok: false, error: { code: 'validation', message: invalid, retryable: false } };
    const { data, error } = await this.client.functions.invoke('ai-assistant', {
      body: { action: 'generate_icebreaker', request_id: input.requestId, match_id: input.matchId, tone: input.tone, language: 'vi' },
    });
    if (error) return { ok: false, error: await mapFunctionError(error) };
    const parsed = parseAiIcebreakerGeneration(data);
    return parsed
      ? { ok: true, data: parsed }
      : { ok: false, error: { code: 'unavailable', message: 'Máy chủ AI trả về nội dung không hợp lệ.', retryable: true } };
  }
}
