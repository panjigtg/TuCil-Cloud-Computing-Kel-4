import type {
  ApiResponse,
  GenerateQrRequest,
  GenerateQrResponse,
  CheckInRequest,
  CheckInResponse,
  StatusQuery,
  StatusResponse,
  GpsPostRequest,
  GpsPostResponse,
  GpsMarkerQuery,
  GpsMarkerResponse,
  GpsPolylineQuery,
  GpsPolylineResponse,
  AccelBatchRequest,
  AccelBatchResponse,
} from "./types";

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

// ✅ UPDATED: Get attendance list with session_token filter
export async function getAttendanceList(query: {
  course_id: string;
  session_id: string;
  session_token?: string; // Changed from qr_token to session_token
}): Promise<ApiResponse<AttendanceListResponse>> {
  const params = new URLSearchParams({
    course_id: query.course_id,
    session_id: query.session_id,
    ...(query.session_token && { session_token: query.session_token }),
  });
  return request<AttendanceListResponse>(`/presence/attendance/list?${params.toString()}`);
}

// --- Modul 2: Telemetry (Accelerometer) ---

export async function postAccelBatch(
  data: AccelBatchRequest
): Promise<ApiResponse<AccelBatchResponse>> {
  return request<AccelBatchResponse>("/sensor/accel/batch", {
    method: "POST",
    body: JSON.stringify(data),
  });
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

// ✅ Type definitions untuk attendance
export interface AttendanceRecord {
  student_id: string;
  student_name: string;
  timestamp: string;
  status?: string;
}

export interface AttendanceListResponse {
  attendance: AttendanceRecord[];
  total?: number;
}

export interface StopSessionRequest {
  course_id: string;
  session_id: string;
}

export async function stopSession(
  data: StopSessionRequest
): Promise<ApiResponse<{ status: string }>> {
  return request<{ status: string }>("/presence/session/stop", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Cross-GAS: Request ke GAS eksternal via proxy ---

async function requestExternal<T>(
  gasUrl: string,
  path: string,
  method: "GET" | "POST" = "POST",
  payload?: Record<string, unknown>,
  query?: Record<string, string>
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch("/api/gas-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gas_url: gasUrl, path, method, payload, query }),
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

export async function checkInExternal(
  gasUrl: string,
  data: CheckInRequest
): Promise<ApiResponse<CheckInResponse>> {
  return requestExternal<CheckInResponse>(
    gasUrl,
    "presence/checkin",
    "POST",
    data as unknown as Record<string, unknown>
  );
}

export async function generateQrTokenExternal(
  gasUrl: string,
  data: GenerateQrRequest
): Promise<ApiResponse<GenerateQrResponse>> {
  return requestExternal<GenerateQrResponse>(
    gasUrl,
    "presence/qr/generate",
    "POST",
    data as unknown as Record<string, unknown>
  );
}