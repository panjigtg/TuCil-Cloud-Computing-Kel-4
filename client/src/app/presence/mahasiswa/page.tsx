"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MahasiswaLoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    // Save User ID to localStorage
    localStorage.setItem("presence_user_id", userId.trim());

    // Redirect to scan page
    router.push("/presence/scan");
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🎓</div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
          Login Mahasiswa
        </h1>
        <p className="text-white/40 text-sm mt-2">
          Masukkan NIM atau User ID kamu untuk melanjutkan
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        <div className="mb-6">
          <label className="block text-sm text-white/60 mb-2">
            NIM / User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="contoh: 2023xxxx"
            required
            autoFocus
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all text-lg tracking-wide"
          />
        </div>

        <button
          type="submit"
          disabled={!userId.trim()}
          className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          Lanjutkan
        </button>
      </form>
    </div>
  );
}
