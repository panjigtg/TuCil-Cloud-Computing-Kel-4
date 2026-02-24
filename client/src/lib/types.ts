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
  ts: string; // ISO-8601
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
