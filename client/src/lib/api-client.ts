import type {
  ApiResponse,
  GenerateQrRequest,
  GenerateQrResponse,
  CheckInRequest,
  CheckInResponse,
  StatusQuery,
  StatusResponse,
} from "./types";

// Proxy through Next.js API route to avoid CORS issues with GAS
const BASE_URL = "/api/gas";

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
    const json = await res.json();
    return json as ApiResponse<T>;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

// --- Modul 1: Presensi QR ---

export async function generateQrToken(
  data: GenerateQrRequest
): Promise<ApiResponse<GenerateQrResponse>> {
  return request<GenerateQrResponse>("/presence/qr/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function checkIn(
  data: CheckInRequest
): Promise<ApiResponse<CheckInResponse>> {
  return request<CheckInResponse>("/presence/checkin", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPresenceStatus(
  query: StatusQuery
): Promise<ApiResponse<StatusResponse>> {
  const params = new URLSearchParams(
    Object.entries(query).reduce(
      (acc, [k, v]) => ({ ...acc, [k]: String(v) }),
      {} as Record<string, string>
    )
  );
  return request<StatusResponse>(`/presence/status?${params.toString()}`);
}
