"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { getGpsPolyline } from "@/lib/api-client";
import { getDeviceId } from "@/lib/device-id";
import type { GpsPolylineResponse } from "@/lib/types";

const MapView = dynamic(() => import("@/components/map-view"), { ssr: false });

export default function GpsPolylinePage() {
  const [deviceId, setDeviceId] = useState("");
  const [limit, setLimit] = useState("100");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GpsPolylineResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId.trim()) return;

    setLoading(true);
    setError("");
    setData(null);

    const res = await getGpsPolyline({
      device_id: deviceId.trim(),
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    setLoading(false);

    if (res.ok && res.data) {
      if (res.data.points.length === 0) {
        setError("Tidak ada data lokasi untuk device ini");
      } else {
        setData(res.data);
      }
    } else {
      setError(res.error ?? "Gagal mengambil data");
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="Device ID"
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition font-mono text-sm"
          />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-white/50 text-sm">Limit:</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="100"
            min="1"
            max="1000"
            className="w-24 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition [color-scheme:dark]"
          />
          <span className="text-white/30 text-xs">titik terakhir</span>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-40 shadow-lg shadow-emerald-500/20 text-sm"
        >
          {loading ? "Memuat..." : "🗺️ Tampilkan Path"}
        </button>
      </form>

      {/* Map — always visible */}
      <MapView
        polyline={data?.points ?? []}
        className="!h-[400px]"
      />

      {data && data.points.length > 0 && (
        <div className="flex items-center justify-between text-sm px-1">
          <span className="text-white/40">
            📊 <span className="text-emerald-400 font-semibold">{data.points.length}</span> titik
          </span>
          <span className="text-white/40 text-xs">
            {data.points[0].ts} → {data.points[data.points.length - 1].ts}
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm">
          <p className="text-red-400">❌ {error}</p>
        </div>
      )}
    </div>
  );
}
