"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { generateQrToken } from "@/lib/api-client";

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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setQrDataUrl(null);
    setTokenInfo(null);

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
        color: { dark: "#ffffff", light: "#00000000" },
      });
      setQrDataUrl(dataUrl);
      setTokenInfo({ token, expiresAt: res.data.expires_at });
    } else {
      setError(res.error || "Gagal generate QR token");
    }

    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Form */}
      <form
        onSubmit={handleGenerate}
        className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-6"
      >
        <h2 className="font-semibold text-lg mb-4">🔑 Generate QR Token</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">
              Course ID
            </label>
            <input
              type="text"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              placeholder="contoh: cloud-101"
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">
              Session ID
            </label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="contoh: sesi-02"
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
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
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-center">
          <p className="text-3xl mb-2">❌</p>
          <p className="text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* QR Result */}
      {qrDataUrl && tokenInfo && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center animate-in fade-in duration-500">
          <p className="text-sm text-white/50 mb-4">
            Tampilkan QR ini di kelas untuk mahasiswa scan
          </p>

          <div className="inline-block p-4 bg-white/5 rounded-2xl border border-white/10">
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-64 h-64 mx-auto"
            />
          </div>

          <div className="mt-4 space-y-1.5">
            <p className="text-sm">
              <span className="text-white/40">Token: </span>
              <code className="text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded">
                {tokenInfo.token}
              </code>
            </p>
            <p className="text-sm">
              <span className="text-white/40">Expires: </span>
              <span className="text-amber-400">
                {new Date(tokenInfo.expiresAt).toLocaleTimeString("id-ID")}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
