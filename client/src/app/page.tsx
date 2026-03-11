import Link from "next/link";

const modules = [
  {
    title: "Presensi QR Dinamis",
    description: "Scan QR code untuk presensi otomatis. Generate token, check-in, dan cek status.",
    icon: "📱",
    href: "/presence/generate",
    gradient: "from-blue-500 to-cyan-500",
    available: true,
  },
  {
    title: "Accelerometer",
    description: "Kirim data sensor accelerometer dari smartphone ke cloud secara periodik.",
    icon: "📊",
    href: "/telemetry/accel",
    gradient: "from-violet-500 to-purple-500",
    available: true,
  },
  {
    title: "GPS + Peta",
    description: "Tracking lokasi GPS real-time dengan marker dan polyline di peta interaktif.",
    icon: "🗺️",
    href: "/gps/map",
    gradient: "from-emerald-500 to-teal-500",
    available: true,
  },
];

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12 pt-8">
        <div className="text-6xl mb-4">☁️</div>
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
          Kelompok 4
        </h1>
        <p className="text-white/50 text-lg">
          Cloud Computing Praktikum — Sistem Presensi & Telemetri Berbasis Cloud
        </p>
      </div>

      {/* Module cards */}
      <div className="grid gap-4">
        {modules.map((mod) => {
          const Card = (
            <div
              key={mod.title}
              className={`group relative rounded-2xl border p-6 transition-all duration-300 ${
                mod.available
                  ? "border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer"
                  : "border-white/5 bg-white/[0.01] opacity-50 cursor-not-allowed"
              }`}
            >
              {/* Gradient glow */}
              {mod.available && (
                <div className={`absolute -inset-px rounded-2xl bg-gradient-to-r ${mod.gradient} opacity-0 group-hover:opacity-10 transition-opacity blur-xl`} />
              )}

              <div className="relative flex items-start gap-4">
                <span className="text-4xl flex-shrink-0">{mod.icon}</span>
                <div>
                  <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                    {mod.title}
                    {!mod.available && (
                      <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-white/40">
                        Coming Soon
                      </span>
                    )}
                  </h2>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {mod.description}
                  </p>
                  {mod.available && (
                    <span className={`inline-block mt-3 text-sm font-medium bg-gradient-to-r ${mod.gradient} bg-clip-text text-transparent group-hover:opacity-100 opacity-70 transition-opacity`}>
                      Buka Modul →
                    </span>
                  )}
                </div>
              </div>
            </div>
          );

          return mod.available ? (
            <Link key={mod.title} href={mod.href}>
              {Card}
            </Link>
          ) : (
            <div key={mod.title}>{Card}</div>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="text-center mt-12 text-white/30 text-sm">
        <p>Backend: Google Apps Script + Google Sheets</p>
        <p className="mt-1">API Contract Simple v1</p>
      </div>
    </div>
  );
}
