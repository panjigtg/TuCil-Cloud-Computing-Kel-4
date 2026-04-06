// ==========================================
// API Contract Types — Praktik Komputasi Awan
// ==========================================

// --- Standard Response ---
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

// --- Modul 1: Presensi QR Dinamis ---

export interface GenerateQrRequest {
  course_id: string;
  session_id: string;
  session_date?: string;
  ts: string; // ISO-8601
}

export interface StopSessionRequest {
  course_id: string;
  session_id: string;
}

export interface GenerateQrResponse {
  qr_token: string;
  expires_at: string; // ISO-8601
}

export interface CheckInRequest {
  user_id: string;
  device_id: string;
  course_id: string;
  session_id: string;
  qr_token: string;
  ts: string; // ISO-8601
}

export interface CheckInResponse {
  presence_id: string;
  status: string;
}

export interface StatusQuery {
  user_id: string;
  course_id: string;
  session_id: string;
}

export interface StatusResponse {
  user_id: string;
  course_id: string;
  session_id: string;
  status: string;
  last_ts: string; // ISO-8601
}

// --- Modul 3: GPS + Peta ---

export interface GpsPostRequest {
  device_id: string;
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number;
  ts: string; // ISO-8601
}

export interface GpsPostResponse {
  status: string;
  ts: string;
}

export interface GpsMarkerQuery {
  device_id: string;
}

export interface GpsMarkerResponse {
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number;
  ts: string;
}

export interface GpsPolylineQuery {
  device_id: string;
  limit?: number; // default 100
}

export interface GpsPolylineResponse {
  points: Array<{ lat: number; lng: number; ts: string }>;
}

// --- Telemetry: Accelerometer Latest ---

export interface AccelLatestQuery {
  device_id: string;
}

export interface AccelLatestResponse {
  t: string; // ISO-8601 timestamp
  x: number;
  y: number;
  z: number;
}

// --- Modul 2: Telemetry (Accelerometer) ---

export interface AccelDataPoint {
  x: number;
  y: number;
  z: number;
  ts: string; // ISO-8601 at sample time (used in batch POST)
  t?: string; // Alternative field name (used in GET latest response)
}

export interface AccelBatchRequest {
  device_id: string;
  ts: string; // Batch submission timestamp
  samples: AccelDataPoint[]; // Backend expects "samples" not "data"
}

export interface AccelBatchResponse {
  processed_records: number;
}
