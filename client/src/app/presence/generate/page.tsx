"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "qrcode";
import {
  generateQrToken,
  getAttendanceList,
  stopSession,
  generateQrTokenExternal,
  getAttendanceListExternal,
  stopSessionExternal,
} from "@/lib/api-client";
import { GAS_EXTERNAL_URL } from "@/lib/gas-config";

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

interface AttendanceRecord {
  student_id: string;
  student_name: string;
  timestamp: string;
  status?: string;
}

export default function GenerateQrPage() {
  const [gasTarget, setGasTarget] = useState<"own" | "external">("own");
  const [externalGasUrlInput, setExternalGasUrlInput] = useState("");
  const [courseId, setCourseId] = useState("");
  const [sessionId, setSessionId] = useState("");
  // ✅ Tambahkan state untuk sessionDate, default ke hari ini
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]); 
  
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{
    token: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Attendance list state
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  
  // Session state
  const [sessionActive, setSessionActive] = useState(false);
  const [currentSessionToken, setCurrentSessionToken] = useState<string | null>(null);

  // Use ref to avoid dependency issues
  const courseIdRef = useRef(courseId);
  const sessionIdRef = useRef(sessionId);
  const sessionActiveRef = useRef(sessionActive);
  const currentSessionTokenRef = useRef(currentSessionToken);
  const gasTargetRef = useRef(gasTarget);
  const externalGasUrlRef = useRef(externalGasUrlInput);
  
  useEffect(() => {
    const savedGasTarget = localStorage.getItem("gasTarget") as "own" | "external";
    const savedGasUrl = localStorage.getItem("gasExternalUrl");
    if (savedGasTarget) setGasTarget(savedGasTarget);
    if (savedGasUrl) setExternalGasUrlInput(savedGasUrl);
  }, []);

  useEffect(() => {
    courseIdRef.current = courseId;
    sessionIdRef.current = sessionId;
    sessionActiveRef.current = sessionActive;
    currentSessionTokenRef.current = currentSessionToken;
    gasTargetRef.current = gasTarget;
    externalGasUrlRef.current = externalGasUrlInput;
  }, [courseId, sessionId, sessionActive, currentSessionToken, gasTarget, externalGasUrlInput]);

  const fetchAttendanceList = useCallback(async () => {
    const currentCourseId = courseIdRef.current;
    const currentSessionId = sessionIdRef.current;
    const isActive = sessionActiveRef.current;
    const sessionToken = currentSessionTokenRef.current;
    
    if (!isActive || !currentCourseId || !currentSessionId || !sessionToken) return;

    setAttendanceLoading(true);
    try {
      const query = {
        course_id: currentCourseId,
        session_id: currentSessionId,
        session_token: sessionToken,
      };

      const res = gasTargetRef.current === "external" && externalGasUrlRef.current
        ? await getAttendanceListExternal(externalGasUrlRef.current, query)
        : await getAttendanceList(query);
      
      if (sessionActiveRef.current && res.ok && res.data?.attendance) {
        setAttendanceList(res.data.attendance);
      }
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  const handleGenerate = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!courseId || !sessionId || !sessionDate) return;

    const isFirstGenerate = !sessionActive;

    setLoading(true);
    setError(null);

    const generateData = {
      course_id: courseId,
      session_id: sessionId,
      session_date: sessionDate, // ✅ Kirim tanggal yang dipilih ke API
      ts: new Date().toISOString(),
    } as any; // Gunakan 'as any' sementara jika tipe datanya belum di-update di types.ts

    const res = gasTarget === "external" && externalGasUrlInput
      ? await generateQrTokenExternal(externalGasUrlInput, generateData)
      : await generateQrToken(generateData);

    if (res.ok && res.data) {
      const token = res.data.qr_token;
      
      // QR payload selalu berisi course_id dan session_id
      const qrData: Record<string, string> = {
        qr_token: token,
        course_id: courseId,
        session_id: sessionId,
      };
      
      // Tambahkan gas_url jika menggunakan external GAS
      if (gasTarget === "external" && externalGasUrlInput) {
        qrData.gas_url = externalGasUrlInput;
      }
      
      const qrPayload = JSON.stringify(qrData);
      
      const dataUrl = await QRCode.toDataURL(qrPayload, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
      setTokenInfo({ token, expiresAt: res.data.expires_at });
      
      if (isFirstGenerate) {
        setSessionActive(true);
        setCurrentSessionToken(token); 
        setAttendanceList([]); 
        fetchAttendanceList(); 
      }
    } else {
      setError(res.error || "Gagal generate QR token");
      setTokenInfo(null);
      setTimeLeft(null);
    }

    setLoading(false);
  }, [courseId, sessionId, sessionDate, sessionActive, fetchAttendanceList]); // ✅ Tambahkan sessionDate ke dependencies
  
  const handleStopSession = async () => {
    if (!courseId || !sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const stopData = {
        course_id: courseId,
        session_id: sessionId
      };

      const res = gasTarget === "external" && externalGasUrlInput
        ? await stopSessionExternal(externalGasUrlInput, stopData)
        : await stopSession(stopData);

      if (res.ok) {
        setSessionActive(false);
        setQrDataUrl(null);
        setTokenInfo(null);
        setTimeLeft(null);
        setCurrentSessionToken(null); 
      } else {
        setError(res.error || "Gagal menutup sesi absensi");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan saat menutup sesi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionActive) return;
    fetchAttendanceList();
    const intervalId = setInterval(() => {
      fetchAttendanceList();
    }, 3000);
    return () => clearInterval(intervalId);
  }, [sessionActive, fetchAttendanceList]);

  useEffect(() => {
    if (!tokenInfo?.expiresAt || !sessionActive) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const expireTime = new Date(tokenInfo.expiresAt).getTime();
      const now = new Date().getTime();
      const difference = Math.floor((expireTime - now) / 1000);
      return Math.max(0, difference);
    };

    let currentLeft = calculateTimeLeft();
    setTimeLeft(currentLeft);

    const intervalId = setInterval(() => {
      currentLeft = calculateTimeLeft();
      setTimeLeft(currentLeft);

      if (currentLeft <= 0) {
        clearInterval(intervalId);
        if (!loading) {
          handleGenerate();
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [tokenInfo, handleGenerate, loading, sessionActive]);

  const selectedCourse = courses.find((c) => c.id === courseId);
  const maxTime = 30;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {!sessionActive && (
        <div className="max-w-lg mx-auto">
          <form
            onSubmit={handleGenerate}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-6"
          >
            <h2 className="font-semibold text-lg mb-4">🔑 Generate QR Token</h2>

            {gasTarget === "external" && externalGasUrlInput && (
              <div className="mb-4 p-3 rounded-xl border border-violet-500/20 bg-violet-500/5 text-center">
                <span className="text-white/40 text-sm">Generate untuk: </span>
                <span className="font-medium text-violet-400 text-sm">🌐 GAS Eksternal</span>
                <p className="text-[10px] text-violet-400/70 font-mono break-all mt-1">{externalGasUrlInput}</p>
              </div>
            )}

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

              {/* ✅ Tambahan Form Input Tanggal */}
              <div>
                <label className="block text-sm text-white/60 mb-1.5">
                  Tanggal Kelas (Untuk Rekap Absen)
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                  style={{ colorScheme: "dark" }} // Agar icon kalender mengikuti tema dark
                />
              </div>
            </div>

            {selectedCourse && sessionId && (
              <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-sm">
                <span className="text-white/40">Akan generate untuk: </span>
                <span className="text-blue-400 font-medium">{selectedCourse.name}</span>
                <span className="text-white/30"> · </span>
                <span className="text-cyan-400">{sessions.find(s => s.id === sessionId)?.name}</span>
                <span className="text-white/30"> · </span>
                <span className="text-emerald-400">{sessionDate}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !courseId || !sessionId || !sessionDate}
              className="w-full mt-5 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                "Generate QR Token"
              )}
            </button>
          </form>

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-center mb-6">
              <p className="text-3xl mb-2">❌</p>
              <p className="text-red-400 font-medium">{error}</p>
            </div>
          )}
        </div>
      )}

      {sessionActive && qrDataUrl && tokenInfo && (
        <div className="grid lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">📱 QR Code</h3>
                <p className="text-xs text-white/50 mt-0.5">
                  {selectedCourse?.name} · {sessions.find(s => s.id === sessionId)?.name}
                </p>
                {gasTarget === "external" && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded text-[10px] uppercase font-bold">
                    Target Eksternal
                  </span>
                )}
              </div>
              <button
                onClick={handleStopSession}
                className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all text-sm font-medium"
              >
                🛑 Stop Sesi
              </button>
            </div>

            <div className="text-center">
              <div className="inline-block p-4 bg-white border-4 border-white/5 rounded-2xl shadow-xl shadow-cyan-500/10 mb-6">
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className={`w-72 h-72 mx-auto transition-opacity duration-300 ${loading ? 'opacity-30' : 'opacity-100'}`}
                />
              </div>

              <div className="space-y-4 max-w-sm mx-auto">
                {timeLeft !== null && (
                  <div className={`rounded-xl border p-3 text-center transition-colors ${timeLeft <= 10 ? "border-red-500/30 bg-red-500/10" : "border-white/10 bg-black/20"}`}>
                    <p className="text-white/40 text-[11px] uppercase tracking-wider mb-1">QR Berubah dalam</p>
                    <p className={`font-mono text-2xl font-bold tabular-nums ${timeLeft <= 10 ? "text-red-400" : "text-cyan-400"}`}>
                      {timeLeft}s
                    </p>
                    <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${timeLeft <= 10 ? "bg-red-400" : "bg-cyan-400"}`}
                        style={{ width: `${(timeLeft / maxTime) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="bg-black/20 rounded-lg py-2 px-3 border border-white/5">
                  <p className="text-white/40 text-[11px] uppercase tracking-wider mb-1">Session Token Hash</p>
                  <code className="text-blue-400 font-mono text-xs break-all">
                    {tokenInfo.token}
                  </code>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  ✅ Daftar Hadir
                  <span className="text-sm font-normal text-white/40">
                    ({attendanceList.length})
                  </span>
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Tanggal: <span className="text-emerald-400 font-medium">{sessionDate}</span>
                </p>
              </div>
              {attendanceLoading && (
                <svg className="animate-spin h-5 w-5 text-cyan-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {attendanceList.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">🎯</p>
                  <p className="text-white/40 text-sm">
                    Belum ada mahasiswa yang absen
                  </p>
                  <p className="text-white/30 text-xs mt-1">
                    Tunggu mahasiswa scan QR code
                  </p>
                </div>
              ) : (
                attendanceList.map((record, index) => (
                  <div
                    key={`${record.student_id}-${index}`}
                    className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all animate-in fade-in duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-cyan-500 flex items-center justify-center font-bold text-white text-sm">
                      {attendanceList.length - index}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {record.student_name}
                      </p>
                      <p className="text-xs text-white/40">
                        {record.student_id}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-white/60">
                        {new Date(record.timestamp).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </p>
                      {record.status && (
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                          record.status === 'present' 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {record.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}