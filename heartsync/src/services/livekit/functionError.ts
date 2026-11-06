import type { ApiError } from "../../shared/types/domain.types";
import { apiError, mapServiceError } from "../errors";

type ResponseLike = {
  status?: unknown;
  clone?: () => ResponseLike;
  json?: () => Promise<unknown>;
};

type FunctionErrorLike = {
  context?: unknown;
  message?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function mapLiveKitFunctionError(error: unknown): Promise<ApiError> {
  const candidate = isRecord(error) ? (error as FunctionErrorLike) : undefined;
  const context = isRecord(candidate?.context)
    ? (candidate.context as ResponseLike)
    : undefined;
  const status = typeof context?.status === "number" ? context.status : undefined;
  let providerCode = "";

  try {
    const response = context?.clone ? context.clone() : context;
    const body = await response?.json?.();
    if (isRecord(body) && typeof body.error === "string")
      providerCode = body.error.toUpperCase();
    if (!providerCode && isRecord(body) && typeof body.code === "string")
      providerCode = body.code.toUpperCase();
  } catch {
    // A non-JSON provider response still maps safely by HTTP status below.
  }

  if (status === 404 || providerCode === "NOT_FOUND")
    return {
      code: "not_found",
      message: "Dịch vụ gọi chưa được triển khai trên máy chủ.",
      retryable: false,
    };
  if (status === 503 || providerCode === "NOT_CONFIGURED")
    return {
      code: "network",
      message: "Dịch vụ gọi chưa được cấu hình LiveKit.",
      retryable: false,
    };
  if (status === 401 || providerCode === "UNAUTHORIZED")
    return apiError("unauthorized", false);
  if (status === 403 || providerCode === "ACTIVE_MATCH_REQUIRED")
    return {
      code: "forbidden",
      message: "Cuộc gọi không còn hợp lệ hoặc chưa được chấp nhận.",
      retryable: false,
    };
  if (status === 400 || providerCode === "INVALID_REQUEST")
    return apiError("validation", false);

  return mapServiceError(
    status === undefined
      ? error
      : { status, message: candidate?.message },
  );
}

