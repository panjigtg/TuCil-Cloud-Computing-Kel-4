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
import { postAccelBatch } from "@/lib/api-client";
import { getDeviceId } from "@/lib/device-id";
import type { AccelSample } from "@/lib/types";

// Maximum points to show on the graph to prevent performance issues
const MAX_DATAPOINTS = 50;
const BATCH_SIZE = 50; // Sync to cloud after accumulating 50 records

export default function AccelerometerPage() {
  const [isActive, setIsActive] = useState(false);
  const [dataPoints, setDataPoints] = useState<AccelSample[]>([]);
  const [syncStatus, setSyncStatus] = useState<string>("Siap");
  const [deviceId, setDeviceId] = useState("");
  
  // Use a ref to accumulate unsynced records without triggering constant re-renders
  const unsyncedData = useRef<AccelSample[]>([]);
  
  // Use a ref for the latest state to be accessed inside the event listener
  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    if (!isActiveRef.current) return;

    const { accelerationIncludingGravity } = event;
    // Android sometimes fires with nulls
    const aX = accelerationIncludingGravity?.x ?? 0;
    const aY = accelerationIncludingGravity?.y ?? 0;
    const aZ = accelerationIncludingGravity?.z ?? 0;

    const newPoint: AccelSample = {
      x: Number(aX.toFixed(2)),
      y: Number(aY.toFixed(2)),
      z: Number(aZ.toFixed(2)),
      t: new Date().toISOString()
    };

    // Update Graph Data
    setDataPoints(prev => {
      const newData = [...prev, newPoint];
      if (newData.length > MAX_DATAPOINTS) {
        return newData.slice(newData.length - MAX_DATAPOINTS);
      }
      return newData;
    });

    // Accumulate for batch sync
    unsyncedData.current.push(newPoint);

    // Auto-sync if threshold reached
    if (unsyncedData.current.length >= BATCH_SIZE) {
      triggerSync();
    }
  }, []);

  const triggerSync = async () => {
    const currentBatch = [...unsyncedData.current];
    if (currentBatch.length === 0) return;

    setSyncStatus("Menyinkronkan...");
    
    // Clear the unsynced buffer immediately
    unsyncedData.current = [];

    const res = await postAccelBatch({
      device_id: deviceId || getDeviceId(),
      ts: new Date().toISOString(),
      samples: currentBatch
    });

    if (res.ok && res.data) {
      setSyncStatus(`Berhasil sinkron ${res.data.accepted || currentBatch.length} record`);
      setTimeout(() => setSyncStatus("Menunggu batch berikutnya..."), 2000);
    } else {
      setSyncStatus(`Gagal: ${res.error}`);
    }
  };

  const toggleSensor = async () => {
    if (!isActive) {
      // Request permission for iOS devices
      if (typeof DeviceMotionEvent !== "undefined" && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        try {
          const permissionState = await (DeviceMotionEvent as any).requestPermission();
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleDeviceMotion);
            setIsActive(true);
            setSyncStatus("Merekam data...");
          } else {
            alert('Izin akses sensor ditolak.');
          }
        } catch (error) {
          console.error(error);
          alert('Gagal meminta izin akses sensor.');
        }
      } else {
        // Non-iOS or older devices
        if (typeof DeviceMotionEvent !== "undefined") {
          window.addEventListener('devicemotion', handleDeviceMotion);
          setIsActive(true);
          setSyncStatus("Merekam data...");
        } else {
          alert("Device Motion API tidak didukung di perangkat ini.");
        }
      }
    } else {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      setIsActive(false);
      
      // If stopping, sync whatever is left
      if (unsyncedData.current.length > 0) {
        triggerSync();
      } else {
        setSyncStatus("Berhenti");
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      // Optional: sync remaining data on unmount if active
    };
  }, [handleDeviceMotion]);

  // Provide fallback values for the stat cards
  const latestPoint = dataPoints[dataPoints.length - 1] || { x: 0, y: 0, z: 0 };

  return (
    <div className="max-w-xl mx-auto pb-12">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Telemetry Accelerometer
        </h1>
        <p className="text-white/40 text-sm mt-2">
          Real-time pergerakan X, Y, Z
        </p>
      </div>

      {/* Control Panel */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-6">
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
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
              isActive 
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 shadow-red-500/10 border border-red-500/20" 
                : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400 shadow-purple-500/20"
            }`}
          >
            {isActive ? "Berhenti Merekam" : "Mulai Sensor"}
          </button>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/5 border border-red-500/20 rounded-xl p-4 text-center">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Sumbu X</p>
          <p className="text-xl font-mono font-bold text-red-400">{latestPoint.x.toFixed(2)}</p>
        </div>
        <div className="bg-white/5 border border-emerald-500/20 rounded-xl p-4 text-center">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Sumbu Y</p>
          <p className="text-xl font-mono font-bold text-emerald-400">{latestPoint.y.toFixed(2)}</p>
        </div>
        <div className="bg-white/5 border border-blue-500/20 rounded-xl p-4 text-center">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Sumbu Z</p>
          <p className="text-xl font-mono font-bold text-blue-400">{latestPoint.z.toFixed(2)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 pt-6 h-80">
        {dataPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataPoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis 
                dataKey="t" 
                tick={false} 
                axisLine={{ stroke: '#ffffff20' }}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                stroke="#ffffff40" 
                tick={{fill: '#ffffff60', fontSize: 12}}
                tickFormatter={(val: number) => val.toFixed(0)}
                width={30}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000000ee', border: '1px solid #ffffff20', borderRadius: '8px' }}
                labelFormatter={() => ''} /* Hide timestamp in tooltip for cleaner look */
              />
              <Legend iconType="circle" />
              <Line type="monotone" dataKey="x" name="Sumbu X" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="y" name="Sumbu Y" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="z" name="Sumbu Z" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/30 space-y-3">
            <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <p className="text-sm">Silakan tekan "Mulai Sensor"</p>
          </div>
        )}
      </div>
    </div>
  );
}
