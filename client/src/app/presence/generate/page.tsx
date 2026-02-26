"use client";

import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { generateQrToken } from "@/lib/api-client";

const courses = [
  { id: "cloud-101", name: "Praktik Komputasi Awan" },
  { id: "ai-201", name: "Kecerdasan Buatan" },
  { id: "db-301", name: "Basis Data Lanjut" },
];

const sessions = [
  { id: "sesi-01", name: "Sesi 1" },
  { id: "sesi-02", name: "Sesi 2" },
  { id: "sesi-03", name: "Sesi 3" },
  { id: "sesi-04", name: "Sesi 4" },
];

export default function GenerateQrPage() {
  const [courseId, setCourseId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{
    token: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const handleGenerate = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!courseId || !sessionId) return;
    
    setLoading(true);
    setError(null);
    setQrDataUrl(null);
    
    // Don't clear tokenInfo here so the old QR stays visible 
    // for a split second while refreshing

    const res = await generateQrToken({
      course_id: courseId,
      session_id: sessionId,
      ts: new Date().toISOString(),
    });

    if (res.ok && res.data) {
      const token = res.data.qr_token;
      // Encode token data as JSON in QR code
      const qrPayload = JSON.stringify({
        qr_token: token,
        course_id: courseId,
        session_id: sessionId,
      });
      const dataUrl = await QRCode.toDataURL(qrPayload, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
      setTokenInfo({ token, expiresAt: res.data.expires_at });
    } else {
      setError(res.error || "Gagal generate QR token");
      setTokenInfo(null);
      setTimeLeft(null);
    }

    setLoading(false);
  }, [courseId, sessionId]);

  // Countdown and Auto-Refresh Effect
  useEffect(() => {
    if (!tokenInfo?.expiresAt) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const expireTime = new Date(tokenInfo.expiresAt).getTime();
      const now = new Date().getTime();
      const difference = Math.floor((expireTime - now) / 1000);
      return Math.max(0, difference);
    };

    // Initial calculation
    let currentLeft = calculateTimeLeft();
    setTimeLeft(currentLeft);

    const intervalId = setInterval(() => {
      currentLeft = calculateTimeLeft();
      setTimeLeft(currentLeft);
      
      // Auto refresh if time runs out and we aren't already loading
      if (currentLeft <= 0) {
        clearInterval(intervalId);
        if (!loading) {
          handleGenerate();
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [tokenInfo, handleGenerate, loading]);

  const selectedCourse = courses.find((c) => c.id === courseId);
  const maxTime = 120; // TTL_SECONDS from backend

  return (
    <div className="max-w-lg mx-auto pb-12">
      {/* Form */}
      <form
        onSubmit={handleGenerate}
        className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-6"
      >
        <h2 className="font-semibold text-lg mb-4">🔑 Generate QR Token</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">
              Mata Kuliah
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
            >
              <option value="" disabled className="bg-gray-900 text-white/40">
                — Pilih Mata Kuliah —
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="bg-gray-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">
              Sesi Pertemuan
            </label>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
            >
              <option value="" disabled className="bg-gray-900 text-white/40">
                — Pilih Sesi —
              </option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id} className="bg-gray-900 text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedCourse && sessionId && (
          <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-sm">
            <span className="text-white/40">Akan generate untuk: </span>
            <span className="text-blue-400 font-medium">{selectedCourse.name}</span>
            <span className="text-white/30"> · </span>
            <span className="text-cyan-400">{sessions.find(s => s.id === sessionId)?.name}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !courseId || !sessionId}
          className="w-full mt-5 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/20"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Generating...
            </span>
          ) : (
            "Generate QR Token"
          )}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-center mb-6">
          <p className="text-3xl mb-2">❌</p>
          <p className="text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* QR Result */}
      {qrDataUrl && tokenInfo && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center animate-in fade-in duration-500">
          <p className="text-sm font-medium mb-1">
            📱 Tampilkan QR ini di kelas
          </p>
          <p className="text-xs text-white/50 mb-6">
            Otomatis diperbarui sebelum kedaluwarsa
          </p>

          <div className="inline-block p-4 bg-white border-4 border-white/5 rounded-2xl shadow-xl shadow-cyan-500/10 mb-6">
            <img
              src={qrDataUrl}
              alt="QR Code"
              className={`w-64 h-64 mx-auto transition-opacity duration-300 ${loading ? 'opacity-30' : 'opacity-100'}`}
            />
          </div>

          <div className="space-y-4 max-w-xs mx-auto">


            {/* Token Hash */}
            <div className="bg-black/20 rounded-lg py-2 px-3 border border-white/5">
              <p className="text-white/40 text-[11px] uppercase tracking-wider mb-1">Session Token Hash</p>
              <code className="text-blue-400 font-mono text-xs">
                {tokenInfo.token}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
