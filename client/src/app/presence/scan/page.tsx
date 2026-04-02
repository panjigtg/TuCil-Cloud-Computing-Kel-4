"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { checkIn, checkInExternal } from "@/lib/api-client";
import { getDeviceId } from "@/lib/device-id";
import { GAS_EXTERNAL_URL } from "@/lib/gas-config";

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
type GasTarget = "own" | "external";

export default function ScanPage() {
  const [state, setState] = useState<ScanState>("scanning");
  const [gasTarget, setGasTarget] = useState<GasTarget>("own");
  const [externalGasUrlInput, setExternalGasUrlInput] = useState(GAS_EXTERNAL_URL);
  const [scannedData, setScannedData] = useState<{
    qr_token: string;
    course_id: string;
    session_id: string;
    gas_url?: string;
  } | null>(null);
  const [userId, setUserId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [result, setResult] = useState<{
    presence_id?: string;
    status?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    // Load User ID from localStorage
    const savedUserId = localStorage.getItem("presence_user_id");
    if (savedUserId) {
      setUserId(savedUserId);
    }
    
    // Auto-generate / load Device ID
    setDeviceId(getDeviceId());
  }, []);

  const handleScan = useCallback((decodedText: string) => {
    try {
      const data = JSON.parse(decodedText);
      if (data.qr_token) {
        setScannedData(data);
        if (data.gas_url) {
          setGasTarget("external");
          setExternalGasUrlInput(data.gas_url);
        }
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
    if (!scannedData || !userId) return;

    setState("submitting");

    const checkInData = {
      user_id: userId,
      device_id: deviceId,
      course_id: scannedData.course_id,
      session_id: scannedData.session_id,
      qr_token: scannedData.qr_token,
      ts: new Date().toISOString(),
    };

    const targetUrl = gasTarget === "external" ? externalGasUrlInput : null;
    const res = targetUrl
      ? await checkInExternal(targetUrl, checkInData)
      : await checkIn(checkInData);

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

  if (!userId && state === "scanning") {
    return (
      <div className="max-w-lg mx-auto p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-center">
        <p className="text-3xl mb-3">⚠️</p>
        <h2 className="text-lg font-semibold text-amber-400 mb-2">NIM Belum Diisi</h2>
        <p className="text-sm text-amber-400/80 mb-6">Kamu harus login sebagai mahasiswa terlebih dahulu.</p>
        <Link 
          href="/presence/mahasiswa"
          className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
        >
          Isi NIM Sekarang
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* GAS Target Toggle */}
      {state === "scanning" && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2.5 font-medium">
            🎯 Target GAS Backend
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setGasTarget("own")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                gasTarget === "own"
                  ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                  : "text-white/50 border border-white/10 hover:bg-white/5"
              }`}
            >
              🏠 GAS Sendiri
            </button>
            <button
              onClick={() => setGasTarget("external")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                gasTarget === "external"
                  ? "bg-gradient-to-r from-violet-500/20 to-pink-500/20 text-violet-400 border border-violet-500/30 shadow-lg shadow-violet-500/10"
                  : "text-white/50 border border-white/10 hover:bg-white/5"
              }`}
            >
              🌐 GAS Eksternal
            </button>
          </div>
          {gasTarget === "external" && (
            <div className="mt-3 p-2.5 bg-violet-500/5 border border-violet-500/10 rounded-lg">
              <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1 block">URL Tujuan GAS Eksternal</label>
              <input
                type="text"
                value={externalGasUrlInput}
                onChange={(e) => setExternalGasUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-xs text-violet-400 font-mono focus:outline-none focus:border-violet-500/50"
              />
            </div>
          )}
        </div>
      )}

      {/* Scanning */}
      {state === "scanning" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="font-semibold text-lg mb-4 text-center">
            📷 Scan QR Code
          </h2>
          <QrScanner onScan={handleScan} />
        </div>
      )}

      {/* Confirming — read-only identity */}
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

          <div className={`mb-4 p-3 rounded-xl border text-sm ${
            gasTarget === "external"
              ? "border-violet-500/20 bg-violet-500/5"
              : "border-cyan-500/20 bg-cyan-500/5"
          }`}>
            <div className="text-center">
              <span className="text-white/40">Check-in ke: </span>
              <span className={`font-medium ${
                gasTarget === "external" ? "text-violet-400" : "text-cyan-400"
              }`}>
                {gasTarget === "external" ? "🌐 GAS Eksternal" : "🏠 GAS Sendiri"}
              </span>
            </div>
            {gasTarget === "external" && externalGasUrlInput && (
              <p className="text-[11px] text-violet-400/70 font-mono break-all text-center mt-1.5">
                {externalGasUrlInput}
              </p>
            )}
          </div>

          <form onSubmit={handleCheckIn} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm mb-2">
              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <p className="text-white/40 text-[11px] uppercase tracking-wider mb-1">NIM / User ID</p>
                <p className="font-mono text-cyan-400 font-medium">{userId}</p>
              </div>
              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <p className="text-white/40 text-[11px] uppercase tracking-wider mb-1">Device ID</p>
                <p className="font-mono text-emerald-400 font-medium truncate">{deviceId}</p>
              </div>
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
          <p className="mt-4 text-white/60">
            Mengirim check-in ke {gasTarget === "external" ? "GAS Eksternal" : "GAS Sendiri"}...
          </p>
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
              <span className="text-white/40">Target: </span>
              <span className="text-emerald-400 font-medium">
                {gasTarget === "external" ? "🌐 GAS Eksternal" : "🏠 GAS Sendiri"}
              </span>
            </p>
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
