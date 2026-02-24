"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export default function QrScanner({ onScan, onError }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
      scannerRef.current = null;
      setIsStarted(false);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!containerRef.current || scannerRef.current) return;

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {
          // QR not detected — do nothing
        }
      );
      setIsStarted(true);
      setPermissionError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPermissionError(msg);
      onError?.(msg);
    }
  }, [onScan, onError, stopScanner]);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  return (
    <div className="w-full max-w-md mx-auto">
      {permissionError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 text-red-400 text-sm">
          <p className="font-semibold mb-1">⚠️ Kamera Error</p>
          <p>{permissionError}</p>
          <button
            onClick={() => {
              setPermissionError(null);
              startScanner();
            }}
            className="mt-2 px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      )}

      <div
        id="qr-reader"
        ref={containerRef}
        className="rounded-xl overflow-hidden border border-white/10"
      />

      {isStarted && (
        <p className="text-center text-sm text-white/50 mt-3 animate-pulse">
          📷 Arahkan kamera ke QR code...
        </p>
      )}
    </div>
  );
}
