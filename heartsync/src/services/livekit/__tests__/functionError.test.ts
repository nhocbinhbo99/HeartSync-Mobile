import { mapLiveKitFunctionError } from "../functionError";

function functionError(status: number, body: object) {
  const response = {
    status,
    clone() {
      return this;
    },
    async json() {
      return body;
    },
  };
  return { context: response, message: "provider detail must stay private" };
}

describe("LiveKit Edge Function errors", () => {
  it.each([
    [404, { code: "NOT_FOUND" }, "not_found", "chưa được triển khai"],
    [503, { error: "NOT_CONFIGURED" }, "network", "chưa được cấu hình"],
    [401, { error: "UNAUTHORIZED" }, "unauthorized", "đăng nhập"],
    [403, { error: "ACTIVE_MATCH_REQUIRED" }, "forbidden", "không còn hợp lệ"],
  ] as const)(
    "maps HTTP %s without exposing provider details",
    async (status, body, code, message) => {
      const result = await mapLiveKitFunctionError(functionError(status, body));
      expect(result.code).toBe(code);
      expect(result.message).toContain(message);
      expect(result.message).not.toContain("provider detail");
    },
  );
});

