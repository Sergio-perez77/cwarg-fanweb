"use client";

import { useState } from "react";
import InitialLoader from "@/app/components/InitialLoader";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {isLoading && <InitialLoader onLoadingComplete={() => setIsLoading(false)} />}
      
      <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-wider text-pink-500">
            CHARLOTTE WESSELS ARGENTINA
          </h1>
          <p className="text-gray-400 text-lg">
            Plataforma oficial de la comunidad. Próximamente: contenido editorial, biblioteca multimedia y reproductor exclusivo.
          </p>
          <div className="pt-4">
            <span className="inline-block px-6 py-3 rounded-full bg-pink-600 text-white font-medium hover:bg-pink-700 transition-colors cursor-pointer shadow-lg shadow-pink-900/30">
              Acceder al sitio
            </span>
          </div>
        </div>
      </main>
    </>
  );
}