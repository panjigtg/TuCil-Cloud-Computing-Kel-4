"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { postAccelBatch, getAccelLatest } from "@/lib/api-client";
import { getDeviceId } from "@/lib/device-id";
import type { AccelDataPoint } from "@/lib/types";

// Maximum points to show on the graph to prevent performance issues
const MAX_DATAPOINTS = 50;
const BATCH_SIZE = 50; // Sync to cloud after accumulating 50 records

type Mode = "select" | "admin" | "user";

export default function AccelerometerPage() {
  const [mode, setMode] = useState<Mode>("select");

  return (
    <div className="max-w-xl mx-auto pb-12 animate-in fade-in duration-300">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Telemetry Accelerometer
        </h1>
        <p className="text-white/40 text-sm mt-2">
          {mode === "select" ? "Pilih mode penggunaan" : (mode === "user" ? "Merekam (User)" : "Memantau (Admin)")}
        </p>
      </div>

      {mode === "select" && (
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => setMode("admin")}
            className="p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl group-hover:scale-110 transition-transform">👨‍💻</span>
              <div>
                <h3 className="text-lg font-bold text-blue-400">Admin (Pemantau)</h3>
                <p className="text-sm text-white/50 mt-1">Lihat grafik accelerometer dari HP user secara live (perlu Device ID user).</p>
              </div>
            </div>
          </button>
          
          <button 
            onClick={() => setMode("user")}
            className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl group-hover:scale-110 transition-transform">📱</span>
              <div>
                <h3 className="text-lg font-bold text-emerald-400">User (Perekam)</h3>
                <p className="text-sm text-white/50 mt-1">Gunakan HP ini untuk merekam dan menyinkronkan pergerakan accelerometer ke server.</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {mode === "user" && <UserRecorderView onBack={() => setMode("select")} />}
      {mode === "admin" && <AdminView onBack={() => setMode("select")} />}
    </div>
  );
}

// ==========================================
// USER RECORDER COMPONENT (Asli)
// ==========================================

function UserRecorderView({ onBack }: { onBack: () => void }) {
  const [isActive, setIsActive] = useState(false);
  const [dataPoints, setDataPoints] = useState<AccelDataPoint[]>([]);
  const [syncStatus, setSyncStatus] = useState<string>("Siap");
  const [deviceId, setDeviceId] = useState("");
  
  const unsyncedData = useRef<AccelDataPoint[]>([]);
  const isActiveRef = useRef(isActive);
  
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { setDeviceId(getDeviceId()); }, []);

  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    if (!isActiveRef.current) return;
    const { accelerationIncludingGravity } = event;
    if (!accelerationIncludingGravity) return;

    const newPoint: AccelDataPoint = {
      x: Number((accelerationIncludingGravity.x || 0).toFixed(2)),
      y: Number((accelerationIncludingGravity.y || 0).toFixed(2)),
      z: Number((accelerationIncludingGravity.z || 0).toFixed(2)),
      ts: new Date().toISOString()
    };

    setDataPoints(prev => {
      const newData = [...prev, newPoint];
      if (newData.length > MAX_DATAPOINTS) return newData.slice(newData.length - MAX_DATAPOINTS);
      return newData;
    });

    unsyncedData.current.push(newPoint);
    if (unsyncedData.current.length >= BATCH_SIZE) triggerSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerSync = async () => {
    const currentBatch = [...unsyncedData.current];
    if (currentBatch.length === 0) return;

    setSyncStatus("Menyinkronkan...");
    unsyncedData.current = [];

    const res = await postAccelBatch({
      device_id: deviceId || getDeviceId(),
      ts: new Date().toISOString(),
      samples: currentBatch
    });

    if (res.ok) {
      setSyncStatus(`Sinkron ${res.data?.processed_records || currentBatch.length} record`);
      setTimeout(() => setSyncStatus("Merekam data..."), 2000);
    } else {
      setSyncStatus(`Gagal: ${res.error}`);
    }
  };

  const toggleSensor = async () => {
    if (!isActive) {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        try {
          const permissionState = await (DeviceMotionEvent as any).requestPermission();
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleDeviceMotion);
            setIsActive(true);
            setSyncStatus("Merekam data...");
          } else alert('Izin akses sensor ditolak.');
        } catch (e) {
          alert('Gagal meminta izin.');
        }
      } else {
        window.addEventListener('devicemotion', handleDeviceMotion);
        setIsActive(true);
        setSyncStatus("Merekam data...");
      }
    } else {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      setIsActive(false);
      if (unsyncedData.current.length > 0) triggerSync();
      else setSyncStatus("Berhenti");
    }
  };

  useEffect(() => {
    return () => window.removeEventListener('devicemotion', handleDeviceMotion);
  }, [handleDeviceMotion]);

  const latestPoint = dataPoints[dataPoints.length - 1] || { x: 0, y: 0, z: 0 };

  return (
    <div className="animate-in fade-in duration-300">
      <button onClick={onBack} className="text-white/40 flex items-center gap-1 text-sm mb-4 hover:text-white transition-colors">
        ← Kembali
      </button>
      
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-6">
        <label className="block text-xs text-white/40 uppercase tracking-widest mb-1">Device ID Anda</label>
        <div className="bg-black/20 p-3 rounded-lg border border-white/5 font-mono text-emerald-400 text-sm mb-5 break-all">
          {deviceId || "Loading..."}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium mb-1">Status Sensor</p>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                {isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isActive ? 'bg-emerald-500' : 'bg-white/20'}`}></span>
              </span>
              <span className="text-xs text-white/50 bg-black/30 px-2 py-1 rounded">
                {syncStatus}
              </span>
            </div>
          </div>
          
          <button
            onClick={toggleSensor}
            className={`px-6 py-3 w-full sm:w-auto rounded-xl font-bold text-sm transition-all shadow-lg ${
              isActive 
                ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20" 
                : "bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20"
            }`}
          >
            {isActive ? "Berhenti Merekam" : "Mulai Sensor"}
          </button>
        </div>
      </div>

      <Stats latestPoint={latestPoint} />

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 pt-6 h-80">
        <Chart dataPoints={dataPoints} emptyMessage="Silakan tekan 'Mulai Sensor'" />
      </div>
    </div>
  );
}

// ==========================================
// ADMIN VIEWER COMPONENT
// ==========================================

function AdminView({ onBack }: { onBack: () => void }) {
  const [targetDevice, setTargetDevice] = useState("");
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [dataPoints, setDataPoints] = useState<AccelDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    if (!targetDevice) return;
    
    try {
      const res = await getAccelLatest({ device_id: targetDevice });
      
      if (res.ok && res.data) {
        const payload = res.data;
        const newPoint: AccelDataPoint = {
          ts: payload.t,
          t: payload.t,
          x: payload.x,
          y: payload.y,
          z: payload.z,
        };

        setDataPoints(prev => {
          // Hanya tambahkan jika timestamp berbeda dari yang terakhir (menghindari duplikasi)
          if (prev.length > 0 && prev[prev.length - 1].ts === newPoint.ts) {
            return prev;
          }
          const newData = [...prev, newPoint];
          return newData.length > MAX_DATAPOINTS ? newData.slice(newData.length - MAX_DATAPOINTS) : newData;
        });
        setError(null);
      } else {
        if (res.error) setError(res.error);
      }
    } catch (err: any) {
      setError(err.message || "Gagal fetch data");
    }
  }, [targetDevice]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMonitoring) {
      fetchLatest(); // Fetch immediately
      interval = setInterval(fetchLatest, 1000); // Poll every 1s (karena cuma 1 data point)
    }
    return () => clearInterval(interval);
  }, [isMonitoring, fetchLatest]);

  const toggleMonitor = () => {
    if (!isMonitoring && !targetDevice.trim()) return alert("Masukkan Device ID terlebih dahulu!");
    setIsMonitoring(!isMonitoring);
  };

  const latestPoint = dataPoints[dataPoints.length - 1] || { x: 0, y: 0, z: 0 };

  return (
    <div className="animate-in fade-in duration-300">
      <button onClick={onBack} className="text-white/40 flex items-center gap-1 text-sm mb-4 hover:text-white transition-colors">
        ← Kembali
      </button>
      
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 mb-6">
        <label className="block text-sm text-blue-400/80 uppercase tracking-widest mb-3 font-medium">
          Pantau Device User
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text"
            value={targetDevice}
            onChange={(e) => setTargetDevice(e.target.value)}
            disabled={isMonitoring}
            placeholder="Ketik Device ID (Contoh: DEV-XXXX)" 
            className="flex-1 bg-black/30 border border-blue-500/30 rounded-xl px-4 py-3 text-sm font-mono text-blue-100 disabled:opacity-50 focus:outline-none focus:border-blue-500"
          />
          <button 
            onClick={toggleMonitor}
            className={`px-8 py-3 rounded-xl text-sm font-bold shadow-lg transition-all ${
              isMonitoring 
                ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30" 
                : "bg-blue-500 text-white hover:bg-blue-400 shadow-blue-500/20"
            }`}
          >
            {isMonitoring ? "Berhenti" : "Pantau"}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
      </div>

      <div className="opacity-80">
        <Stats latestPoint={latestPoint} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 pt-6 h-80 relative">
        {isMonitoring && (
          <div className="absolute top-2 right-4 flex items-center gap-1.5 z-10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-[10px] text-blue-400 font-medium tracking-wider">LIVE</span>
          </div>
        )}
        <Chart dataPoints={dataPoints} emptyMessage={isMonitoring ? "Mengambil data..." : "Masukkan Device ID lalu klik Pantau"} />
      </div>
    </div>
  );
}

// ==========================================
// REUSABLE COMPONENTS
// ==========================================

function Stats({ latestPoint }: { latestPoint: AccelDataPoint }) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <div className="bg-white/5 border border-red-500/20 rounded-xl p-4 text-center">
        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Sumbu X</p>
        <p className="text-xl font-mono font-bold text-red-400">{latestPoint.x?.toFixed(2) || '0.00'}</p>
      </div>
      <div className="bg-white/5 border border-emerald-500/20 rounded-xl p-4 text-center">
        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Sumbu Y</p>
        <p className="text-xl font-mono font-bold text-emerald-400">{latestPoint.y?.toFixed(2) || '0.00'}</p>
      </div>
      <div className="bg-white/5 border border-blue-500/20 rounded-xl p-4 text-center">
        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Sumbu Z</p>
        <p className="text-xl font-mono font-bold text-blue-400">{latestPoint.z?.toFixed(2) || '0.00'}</p>
      </div>
    </div>
  );
}

function Chart({ dataPoints, emptyMessage }: { dataPoints: AccelDataPoint[], emptyMessage: string }) {
  if (dataPoints.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white/30 space-y-3">
        <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={dataPoints}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
        <XAxis 
          dataKey="ts" 
          tick={false} 
          axisLine={{ stroke: '#ffffff20' }}
        />
        <YAxis 
          domain={['auto', 'auto']} 
          stroke="#ffffff40" 
          tick={{fill: '#ffffff60', fontSize: 12}}
          tickFormatter={(val) => val.toFixed(0)}
          width={30}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#000000ee', border: '1px solid #ffffff20', borderRadius: '8px' }}
          labelFormatter={() => ''}
        />
        <Legend iconType="circle" />
        <Line type="monotone" dataKey="x" name="Sumbu X" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="y" name="Sumbu Y" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="z" name="Sumbu Z" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
