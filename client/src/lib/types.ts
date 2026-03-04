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
  from: string; // ISO-8601
  to: string; // ISO-8601
}

export interface GpsPolylineResponse {
  points: Array<{ lat: number; lng: number; ts: string }>;
}
