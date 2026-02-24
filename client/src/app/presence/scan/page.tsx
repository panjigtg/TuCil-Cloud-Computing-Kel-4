"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { checkIn } from "@/lib/api-client";

// Dynamic import to avoid SSR issues with camera access
const QrScanner = dynamic(() => import("@/components/qr-scanner"), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-md mx-auto h-72 bg-white/5 rounded-xl animate-pulse flex items-center justify-center text-white/30">
      Memuat kamera...
    </div>
  ),
});

type ScanState = "scanning" | "confirming" | "submitting" | "success" | "error";

export default function ScanPage() {
  const [state, setState] = useState<ScanState>("scanning");
  const [scannedData, setScannedData] = useState<{
    qr_token: string;
    course_id: string;
    session_id: string;
  } | null>(null);
  const [userId, setUserId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [result, setResult] = useState<{
    presence_id?: string;
    status?: string;
    error?: string;
  } | null>(null);

  const handleScan = useCallback((decodedText: string) => {
    try {
      const data = JSON.parse(decodedText);
      if (data.qr_token) {
        setScannedData(data);
        setState("confirming");
      }
    } catch {
      // Try as plain token
      setScannedData({
        qr_token: decodedText,
        course_id: "",
        session_id: "",
      });
      setState("confirming");
    }
  }, []);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedData) return;

    setState("submitting");

    const res = await checkIn({
      user_id: userId,
      device_id: deviceId || `dev-${Date.now()}`,
      course_id: scannedData.course_id,
      session_id: scannedData.session_id,
      qr_token: scannedData.qr_token,
      ts: new Date().toISOString(),
    });

    if (res.ok && res.data) {
      setResult({
        presence_id: res.data.presence_id,
        status: res.data.status,
      });
      setState("success");
    } else {
      setResult({ error: res.error || "Check-in gagal" });
      setState("error");
    }
  };

  const resetScan = () => {
    setState("scanning");
    setScannedData(null);
    setResult(null);
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Scanning */}
      {state === "scanning" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="font-semibold text-lg mb-4 text-center">
            📷 Scan QR Code
          </h2>
          <QrScanner onScan={handleScan} />
        </div>
      )}

      {/* Confirming — fill identity */}
      {state === "confirming" && scannedData && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 animate-in fade-in duration-300">
          <div className="text-center mb-5">
            <p className="text-3xl mb-2">✅</p>
            <p className="font-semibold text-lg">QR Terbaca!</p>
            <p className="text-sm text-white/40 mt-1">
              Token:{" "}
              <code className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-mono">
                {scannedData.qr_token}
              </code>
            </p>
          </div>

          <form onSubmit={handleCheckIn} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">
                NIM / User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="contoh: 2023xxxx"
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">
                Device ID{" "}
                <span className="text-white/30">(opsional, auto-generate)</span>
              </label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="contoh: dev-001"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {scannedData.course_id && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/40 text-xs">Course</p>
                  <p className="font-mono text-white/80">
                    {scannedData.course_id}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/40 text-xs">Session</p>
                  <p className="font-mono text-white/80">
                    {scannedData.session_id}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={resetScan}
                className="flex-1 py-3 rounded-xl font-medium text-sm border border-white/10 text-white/60 hover:bg-white/5 transition-all"
              >
                Scan Ulang
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 transition-all shadow-lg shadow-blue-500/20"
              >
                Check-in! 🎯
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Submitting */}
      {state === "submitting" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
          <svg
            className="animate-spin h-12 w-12 mx-auto text-blue-400"
            viewBox="0 0 24 24"
          >
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
          <p className="mt-4 text-white/60">Mengirim check-in...</p>
        </div>
      )}

      {/* Success */}
      {state === "success" && result && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center animate-in fade-in duration-500">
          <p className="text-5xl mb-3">🎉</p>
          <h2 className="text-2xl font-bold text-emerald-400 mb-2">
            Check-in Berhasil!
          </h2>
          <div className="space-y-1.5 text-sm mt-4">
            <p>
              <span className="text-white/40">Presence ID: </span>
              <code className="text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                {result.presence_id}
              </code>
            </p>
            <p>
              <span className="text-white/40">Status: </span>
              <span className="text-emerald-400 font-semibold">
                {result.status}
              </span>
            </p>
          </div>
          <button
            onClick={resetScan}
            className="mt-6 px-6 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-white/60 hover:bg-white/5 transition-all"
          >
            Scan Lagi
          </button>
        </div>
      )}

      {/* Error */}
      {state === "error" && result && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center animate-in fade-in duration-500">
          <p className="text-5xl mb-3">❌</p>
          <h2 className="text-xl font-bold text-red-400 mb-2">
            Check-in Gagal
          </h2>
          <p className="text-red-400/80 text-sm">{result.error}</p>
          <button
            onClick={resetScan}
            className="mt-6 px-6 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-white/60 hover:bg-white/5 transition-all"
          >
            Coba Lagi
          </button>
        </div>
      )}
    </div>
  );
}
