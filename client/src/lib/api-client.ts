import type {
  ApiResponse,
  GenerateQrRequest,
  GenerateQrResponse,
  CheckInRequest,
  CheckInResponse,
  StatusQuery,
  StatusResponse,
  AccelBatchRequest,
  AccelBatchResponse,
  AccelLatestQuery,
  AccelLatestResponse,
  GpsPostRequest,
  GpsPostResponse,
  GpsMarkerQuery,
  GpsMarkerResponse,
  GpsPolylineQuery,
  GpsPolylineResponse,
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

// --- Modul 2: Accelerometer ---

export async function postAccelBatch(
  data: AccelBatchRequest
): Promise<ApiResponse<AccelBatchResponse>> {
  return request<AccelBatchResponse>("/telemetry/accel", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getAccelLatest(
  query: AccelLatestQuery
): Promise<ApiResponse<AccelLatestResponse>> {
  const params = new URLSearchParams({ device_id: query.device_id });
  return request<AccelLatestResponse>(`/telemetry/accel/latest?${params.toString()}`);
}

// --- Modul 3: GPS + Peta ---

export async function postGpsLocation(
  data: GpsPostRequest
): Promise<ApiResponse<GpsPostResponse>> {
  return request<GpsPostResponse>("/sensor/gps", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getGpsMarker(
  query: GpsMarkerQuery
): Promise<ApiResponse<GpsMarkerResponse>> {
  const params = new URLSearchParams({ device_id: query.device_id });
  return request<GpsMarkerResponse>(`/sensor/gps/marker?${params.toString()}`);
}

export async function getGpsPolyline(
  query: GpsPolylineQuery
): Promise<ApiResponse<GpsPolylineResponse>> {
  const params = new URLSearchParams({
    device_id: query.device_id,
    from: query.from,
    to: query.to,
  });
  return request<GpsPolylineResponse>(`/sensor/gps/polyline?${params.toString()}`);
}
