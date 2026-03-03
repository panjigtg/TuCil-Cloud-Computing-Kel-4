"use client";

import Link from "next/link";

const roles = [
  {
    role: "Dosen",
    description: "Generate QR Code untuk presensi kelas",
    icon: "👨‍🏫",
    href: "/presence/generate",
    gradient: "from-blue-500 to-indigo-500",
    features: ["Pilih mata kuliah & sesi", "Generate QR Token dinamis", "Tampilkan QR untuk presensi mahasiswa"],
  },
  {
    role: "Mahasiswa",
    description: "Scan QR dan cek status presensi",
    icon: "🎓",
    href: "/presence/mahasiswa",
    gradient: "from-cyan-500 to-teal-500",
    features: ["Scan QR Code dari dosen", "Check-in otomatis", "Cek status kehadiran"],
  },
];

export default function PresenceRoleSelectPage() {
  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">📱</div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Presensi QR Dinamis
        </h1>
        <p className="text-white/40 text-sm mt-2">
          Pilih role kamu untuk melanjutkan
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid gap-4">
        {roles.map((item) => (
          <Link key={item.role} href={item.href}>
            <div className="group relative rounded-2xl border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04] p-6 transition-all duration-300 cursor-pointer">
              {/* Gradient glow */}
              <div
                className={`absolute -inset-px rounded-2xl bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity blur-xl`}
              />

              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl">{item.icon}</span>
                  <div>
                    <h2 className="text-xl font-bold">{item.role}</h2>
                    <p className="text-white/50 text-sm">{item.description}</p>
                  </div>
                </div>

                <div className="space-y-2 ml-1">
                  {item.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-white/40">
                      <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${item.gradient}`} />
                      {f}
                    </div>
                  ))}
                </div>

                <div
                  className={`mt-4 text-sm font-medium bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent opacity-70 group-hover:opacity-100 transition-opacity`}
                >
                  Masuk sebagai {item.role} →
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
