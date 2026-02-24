"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Generate QR", href: "/presence/generate", icon: "🔑" },
  { label: "Scan & Check-in", href: "/presence/scan", icon: "📷" },
  { label: "Status", href: "/presence/status", icon: "📋" },
];

export default function PresenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          ← Kembali ke Beranda
        </Link>
        <h1 className="text-2xl font-bold mt-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          📱 Presensi QR Dinamis
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Generate token, scan QR, dan cek status presensi
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/5 mb-6">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 text-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-white border border-blue-500/20"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
