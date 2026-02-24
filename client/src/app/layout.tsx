import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CloudAttend — Praktik Komputasi Awan",
  description: "Sistem presensi QR dinamis, accelerometer, dan GPS berbasis cloud",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-gray-950 text-white min-h-screen`}>
        {/* Gradient background */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        </div>

        <header className="border-b border-white/5 backdrop-blur-md bg-gray-950/50 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 group">
              <span className="text-2xl">☁️</span>
              <span className="font-bold text-lg bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-violet-300 transition-all">
                CloudAttend
              </span>
            </a>
            <nav className="flex gap-1">
              <a href="/presence/generate" className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Presensi
              </a>
              <span className="px-3 py-1.5 text-sm text-white/20 cursor-not-allowed">
                Accel
              </span>
              <span className="px-3 py-1.5 text-sm text-white/20 cursor-not-allowed">
                GPS
              </span>
            </nav>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
