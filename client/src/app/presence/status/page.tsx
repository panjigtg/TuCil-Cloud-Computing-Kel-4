"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getPresenceStatus } from "@/lib/api-client";
import type { StatusResponse } from "@/lib/types";

const courses = [
  { id: "cloud-101", name: "Cloud Computing" },
  { id: "ai-201", name: "Artificial Intelligence" },
  { id: "db-301", name: "Database" },
];

const sessions = [
  { id: "sesi-01", name: "Sesi 1" },
  { id: "sesi-02", name: "Sesi 2" },
  { id: "sesi-03", name: "Sesi 3" },
  { id: "sesi-04", name: "Sesi 4" },
];

export default function StatusPage() {
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load User ID from localStorage
    const savedUserId = localStorage.getItem("presence_user_id");
    if (savedUserId) {
      setUserId(savedUserId);
    }
  }, []);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setError(null);
    setStatusData(null);

    const res = await getPresenceStatus({
      user_id: userId,
      course_id: courseId,
      session_id: sessionId,
    });

    if (res.ok && res.data) {
      setStatusData(res.data);
    } else {
      setError(res.error || "Gagal mengecek status");
    }

    setLoading(false);
  };

  const statusColor =
    statusData?.status === "checked_in"
      ? "emerald"
      : statusData?.status === "absent"
        ? "red"
        : "amber";

  if (!userId) {
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
      {/* User Info Bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-sm mb-6">
        <span className="text-2xl">🎓</span>
        <div>
          <p className="text-white/40 text-[11px] uppercase tracking-wider mb-0.5">NIM / User ID</p>
          <p className="text-cyan-400 font-mono font-medium">{userId}</p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleCheck}
        className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-6"
      >
        <h2 className="font-semibold text-lg mb-4">📋 Cek Status Presensi</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Mata Kuliah</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
            >
              <option value="" disabled className="bg-gray-900 text-white/40">— Pilih Mata Kuliah —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="bg-gray-900 text-white">{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Sesi Pertemuan</label>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
            >
              <option value="" disabled className="bg-gray-900 text-white/40">— Pilih Sesi —</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id} className="bg-gray-900 text-white">{s.name}</option>
              ))}
            </select>
          </div>
        </div>

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
              Mengecek...
            </span>
          ) : (
            "Cek Status"
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

      {/* Status Result */}
      {statusData && (
        <div
          className="rounded-2xl p-6 animate-in fade-in duration-500"
          style={{
            border: `1px solid ${statusColor === "emerald" ? "rgba(16,185,129,0.2)" : statusColor === "red" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
            backgroundColor: statusColor === "emerald" ? "rgba(16,185,129,0.05)" : statusColor === "red" ? "rgba(239,68,68,0.05)" : "rgba(245,158,11,0.05)",
          }}
        >
          <div className="text-center mb-4">
            <p className="text-4xl mb-2">
              {statusData.status === "checked_in" ? "✅" : "⏳"}
            </p>
            <p
              className="text-xl font-bold capitalize"
              style={{
                color:
                  statusColor === "emerald"
                    ? "#34d399"
                    : statusColor === "red"
                      ? "#f87171"
                      : "#fbbf24",
              }}
            >
              {statusData.status.replace(/_/g, " ")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-white/40 text-xs mb-0.5">User ID</p>
              <p className="font-mono text-white/80">{statusData.user_id}</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-white/40 text-xs mb-0.5">Course</p>
              <p className="font-mono text-white/80">{statusData.course_id}</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-white/40 text-xs mb-0.5">Session</p>
              <p className="font-mono text-white/80">
                {statusData.session_id}
              </p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-white/40 text-xs mb-0.5">Waktu</p>
              <p className="font-mono text-white/80">
                {statusData.last_ts ? new Date(statusData.last_ts).toLocaleTimeString("id-ID") : "—"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
