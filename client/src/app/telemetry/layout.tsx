"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "📊 Accelerometer", href: "/telemetry/accel" },
];

export default function TelemetryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-1">
          📊 Telemetry Sensor
        </h1>
        <p className="text-white/40 text-sm">Kirim data sensor dari smartphone ke cloud</p>
      </div>

      <nav className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 text-center py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              pathname === tab.href
                ? "bg-violet-500/20 text-violet-400"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
