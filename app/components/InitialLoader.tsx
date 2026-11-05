"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function InitialLoader({ onLoadingComplete }: { onLoadingComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsFadingOut(true);
            setTimeout(onLoadingComplete, 600);
          }, 400);
          return 100;
        }
        return prev + 4;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [onLoadingComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center transition-opacity duration-600 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center space-y-8">
        <div className="w-36 h-36 relative flex items-center justify-center animate-pulse drop-shadow-[0_0_20px_rgba(56,189,248,0.3)]">
          <Image
            src="/logodecarga.png"
            alt="Charlotte Wessels Argentina Logo"
            width={130}
            height={130}
            className="object-contain"
            priority
          />
        </div>

        <h2 className="text-sm uppercase tracking-[0.3em] text-gray-400 font-light">
          Charlotte Wessels Argentina
        </h2>

        <div className="w-48 h-[2px] bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-pink-500 transition-all duration-75 ease-out shadow-[0_0_10px_rgba(236,72,153,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}