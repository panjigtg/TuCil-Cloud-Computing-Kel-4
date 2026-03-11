"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Home", href: "/", icon: "🏠" },
  { label: "Presensi", href: "/presence", matchPrefix: "/presence", icon: "📱" },
  { label: "Accel", href: "/telemetry/accel", matchPrefix: "/telemetry", icon: "📊" },
  { label: "GPS", href: "/gps/map", matchPrefix: "/gps", icon: "🗺️" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 backdrop-blur-xl bg-gray-950/80">
      <div className="max-w-5xl mx-auto flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = item.matchPrefix
            ? pathname.startsWith(item.matchPrefix)
            : pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-blue-400"
                  : "text-white/50 hover:text-white/80 active:scale-95"
              }`}
            >
              <span className={`text-xl transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
                {item.icon}
              </span>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? "text-blue-400" : "text-white/50"
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0 w-8 h-0.5 rounded-full bg-blue-400" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Safe area for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
