"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { postAccelBatch, getAccelLatest } from "@/lib/api-client";
import { getDeviceId } from "@/lib/device-id";
import type { AccelSample } from "@/lib/types";

const BATCH_INTERVAL_MS = 3000; // Send batch every 3 seconds
const SAMPLE_RATE_MS = 100; // Read sensor every 100ms
const MAX_HISTORY = 50; // Chart history size

interface SensorReading {
  x: number;
  y: number;
  z: number;
}

export default function AccelPage() {
  const [deviceId, setDeviceId] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentReading, setCurrentReading] = useState<SensorReading | null>(null);
  const [latest, setLatest] = useState<{ t: string; x: number; y: number; z: number } | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [totalSent, setTotalSent] = useState(0);
  const [permissionNeeded, setPermissionNeeded] = useState(false);
  const [history, setHistory] = useState<SensorReading[]>([]);

  const samplesRef = useRef<AccelSample[]>([]);
  const batchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isStreamingRef = useRef(false);

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  // Fetch latest on mount
  useEffect(() => {
    if (!deviceId) return;
    getAccelLatest({ device_id: deviceId }).then((res) => {
      if (res.ok && res.data) setLatest(res.data);
    });
  }, [deviceId]);

  // Send batch to server
  const sendBatch = useCallback(async () => {
    if (samplesRef.current.length === 0 || !deviceId) return;

    const samplesToSend = [...samplesRef.current];
    samplesRef.current = [];

    setStatus(`🚀 Mengirim ${samplesToSend.length} samples...`);

    const res = await postAccelBatch({
      device_id: deviceId,
      ts: new Date().toISOString(),
      samples: samplesToSend,
    });

    if (res.ok && res.data) {
      setTotalSent((prev) => prev + res.data!.accepted);
      setStatus(`✅ Terkirim ${res.data.accepted} samples`);

      // Fetch latest after successful send
      const latestRes = await getAccelLatest({ device_id: deviceId });
      if (latestRes.ok && latestRes.data) setLatest(latestRes.data);
    } else {
      setStatus(`❌ Gagal: ${res.error}`);
    }
  }, [deviceId]);

  // Handle DeviceMotion event
  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const accel = event.accelerationIncludingGravity;
    if (!accel) return;

    const reading: SensorReading = {
      x: +(accel.x ?? 0).toFixed(3),
      y: +(accel.y ?? 0).toFixed(3),
      z: +(accel.z ?? 0).toFixed(3),
    };

    setCurrentReading(reading);
    setHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), reading]);

    samplesRef.current.push({
      t: new Date().toISOString(),
      x: reading.x,
      y: reading.y,
      z: reading.z,
    });
  }, []);

  // Start streaming
  const startStreaming = useCallback(async () => {
    setError("");

    // iOS 13+ requires permission
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (DeviceMotionEvent as any).requestPermission === "function"
    ) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== "granted") {
          setPermissionNeeded(true);
          setError("Izin sensor ditolak. Mohon izinkan akses motion sensor.");
          return;
        }
      } catch {
        setError("Gagal meminta izin sensor.");
        return;
      }
    }

    if (typeof DeviceMotionEvent === "undefined") {
      setError("Device Motion API tidak tersedia di browser ini.");
      return;
    }

    window.addEventListener("devicemotion", handleMotion);
    isStreamingRef.current = true;
    setIsStreaming(true);
    setPermissionNeeded(false);
    setStatus("📡 Streaming aktif...");

    // Start batch sending interval
    batchIntervalRef.current = setInterval(() => {
      if (isStreamingRef.current) sendBatch();
    }, BATCH_INTERVAL_MS);
  }, [handleMotion, sendBatch]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion);
    isStreamingRef.current = false;
    setIsStreaming(false);

    if (batchIntervalRef.current) {
      clearInterval(batchIntervalRef.current);
      batchIntervalRef.current = null;
    }

    // Send remaining samples
    sendBatch();
    setStatus("⏹️ Streaming dihentikan");
  }, [handleMotion, sendBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      if (batchIntervalRef.current) clearInterval(batchIntervalRef.current);
    };
  }, [handleMotion]);

  // Simple bar chart rendering
  const renderMiniChart = () => {
    if (history.length < 2) return null;
    const w = 100;
    const h = 60;
    const step = w / (MAX_HISTORY - 1);

    const makePath = (key: keyof SensorReading, color: string) => {
      const values = history.map((r) => r[key]);
      const max = Math.max(...values.map(Math.abs), 1);
      const points = values
        .map((v, i) => `${(i * step).toFixed(1)},${(h / 2 - (v / max) * (h / 2 - 4)).toFixed(1)}`)
        .join(" ");
      return <polyline key={key} points={points} fill="none" stroke={color} strokeWidth="1.5" opacity="0.8" />;
    };

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32 mt-2" preserveAspectRatio="none">
        {/* Center line */}
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="white" strokeOpacity="0.1" strokeWidth="0.5" />
        {makePath("x", "#f87171")}
        {makePath("y", "#34d399")}
        {makePath("z", "#60a5fa")}
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      {/* Device ID bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-sm">
        <span className="text-white/40">📱 Device:</span>
        <span className="text-violet-400 font-mono">{deviceId || "..."}</span>
        {totalSent > 0 && (
          <span className="ml-auto text-white/30 text-xs">
            📤 {totalSent} sent
          </span>
        )}
      </div>

      {/* Live reading card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">📊 Accelerometer Live</h2>
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
            isStreaming
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-white/5 text-white/40 border border-white/10"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`} />
            {isStreaming ? "Streaming" : "Idle"}
          </div>
        </div>

        {/* Current values */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "X", value: currentReading?.x, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
            { label: "Y", value: currentReading?.y, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "Z", value: currentReading?.z, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          ].map((axis) => (
            <div key={axis.label} className={`rounded-xl p-3 border ${axis.bg} text-center`}>
              <p className={`text-xs font-medium ${axis.color} opacity-60 mb-1`}>{axis.label}-axis</p>
              <p className={`font-mono text-xl font-bold tabular-nums ${axis.color}`}>
                {axis.value !== undefined ? axis.value.toFixed(2) : "—"}
              </p>
              <p className="text-[10px] text-white/30 mt-0.5">m/s²</p>
            </div>
          ))}
        </div>

        {/* Mini chart */}
        {history.length > 1 && (
          <div className="rounded-xl bg-black/20 border border-white/5 p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] text-white/40 uppercase tracking-wider">Live Graph</p>
              <div className="flex gap-3 text-[10px]">
                <span className="text-red-400">● X</span>
                <span className="text-emerald-400">● Y</span>
                <span className="text-blue-400">● Z</span>
              </div>
            </div>
            {renderMiniChart()}
          </div>
        )}

        {/* Start/Stop button */}
        <button
          onClick={isStreaming ? stopStreaming : startStreaming}
          className={`w-full mt-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg ${
            isStreaming
              ? "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 shadow-red-500/20"
              : "bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 shadow-violet-500/20"
          }`}
        >
          {isStreaming ? "⏹️ Stop Streaming" : "▶️ Start Streaming"}
        </button>

        {/* Status */}
        {status && (
          <p className="text-center text-sm text-white/50 mt-3">{status}</p>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm">
            <p className="text-red-400">❌ {error}</p>
            {permissionNeeded && (
              <button
                onClick={startStreaming}
                className="mt-2 px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm text-red-400 transition-colors"
              >
                Coba Lagi
              </button>
            )}
          </div>
        )}
      </div>

      {/* Latest from server */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <h3 className="font-semibold text-sm mb-3 text-white/60">
          📥 Data Terakhir dari Server
        </h3>
        {latest ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
                <span className="text-white/40 text-xs">X</span>
                <p className="text-red-400 font-mono font-medium">{latest.x.toFixed(3)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
                <span className="text-white/40 text-xs">Y</span>
                <p className="text-emerald-400 font-mono font-medium">{latest.y.toFixed(3)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
                <span className="text-white/40 text-xs">Z</span>
                <p className="text-blue-400 font-mono font-medium">{latest.z.toFixed(3)}</p>
              </div>
            </div>
            <div className="bg-black/20 rounded-lg py-2 px-3 border border-white/5">
              <p className="text-white/40 text-[11px] uppercase tracking-wider mb-1">Timestamp</p>
              <code className="text-violet-400 font-mono text-xs">{latest.t}</code>
            </div>
          </div>
        ) : (
          <p className="text-white/30 text-sm text-center py-4">Belum ada data. Mulai streaming untuk mengirim data.</p>
        )}
      </div>

      {/* Info card */}
      <div className="rounded-xl bg-violet-500/5 border border-violet-500/10 p-4 text-sm text-violet-400/80">
        <p className="font-medium text-violet-400 mb-1">ℹ️ Cara Penggunaan</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>Buka halaman ini di <strong>smartphone</strong> (sensor tidak tersedia di desktop)</li>
          <li>Tekan <strong>Start Streaming</strong> untuk mulai membaca sensor</li>
          <li>Data dikirim otomatis setiap {BATCH_INTERVAL_MS / 1000} detik ke backend</li>
          <li>Lihat nilai terbaru dari server di bagian bawah</li>
        </ul>
      </div>
    </div>
  );
}
