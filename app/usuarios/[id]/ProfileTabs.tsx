"use client";

import { useState } from "react";

type Tab = "Inicio" | "Publicaciones" | "Playlists" | "Firmas";

export default function ProfileTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("Inicio");

  const tabs: Tab[] = [
    "Inicio",
    "Publicaciones",
    "Playlists",
    "Firmas",
  ];

  return (
    <section className="mt-6">
      <nav
        aria-label="Secciones del perfil"
        className="flex flex-wrap justify-center gap-2 border-b border-[#d4af37]/20 pb-4"
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              activeTab === tab
                ? "bg-[#d4af37] font-semibold text-black"
                : "bg-black/30 text-[#a99e83] hover:bg-[#d4af37]/10 hover:text-[#ffe680]"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

        <div className="mt-6 rounded-2xl border border-[#d4af37]/20 bg-[#15120a] p-6">
            <h2 className="mb-5 text-xl font-semibold text-[#f8f3e5]">
                {activeTab}
            </h2>

            {activeTab === "Inicio" && (
                <div className="space-y-8">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[
                    { label: "Publicaciones", value: "—" },
                    { label: "Playlists", value: "—" },
                    { label: "Firmas", value: "—" },
                    ].map((stat) => (
                    <div
                        key={stat.label}
                        className="rounded-xl border border-[#d4af37]/20 bg-black/30 p-5 text-center"
                    >
                        <p className="text-3xl font-semibold text-[#d4af37]">
                        {stat.value}
                        </p>
                        <p className="mt-2 text-sm text-[#a99e83]">
                        {stat.label}
                        </p>
                    </div>
                    ))}
                </div>

                <section>
                    <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#f8f3e5]">
                        Publicaciones recientes
                    </h3>
                    <span className="text-xs text-[#d4af37]">
                        Próximamente
                    </span>
                    </div>

                    <div className="rounded-xl border border-dashed border-[#d4af37]/20 bg-black/20 p-8 text-center">
                    <p className="text-sm text-[#a99e83]">
                        Aquí se mostrarán las últimas publicaciones de este usuario.
                    </p>
                    </div>
                </section>

                <section>
                    <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#f8f3e5]">
                        Playlists destacadas
                    </h3>
                    <span className="text-xs text-[#d4af37]">
                        Próximamente
                    </span>
                    </div>

                    <div className="rounded-xl border border-dashed border-[#d4af37]/20 bg-black/20 p-8 text-center">
                    <p className="text-sm text-[#a99e83]">
                        Aquí aparecerán las playlists favoritas o destacadas de este usuario.
                    </p>
                    </div>
                </section>

                <section>
                    <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#f8f3e5]">
                        Actividad reciente
                    </h3>
                    <span className="text-xs text-[#d4af37]">
                        Próximamente
                    </span>
                    </div>

                    <div className="rounded-xl border border-dashed border-[#d4af37]/20 bg-black/20 p-8 text-center">
                    <p className="text-sm text-[#a99e83]">
                        Aquí se mostrará la actividad reciente de este usuario en la comunidad.
                    </p>
                    </div>
                </section>
                </div>
            )}

            {activeTab === "Publicaciones" && (
                <p className="text-sm text-[#a99e83]">
                Aquí aparecerán las publicaciones del usuario.
                </p>
            )}

            {activeTab === "Playlists" && (
                <p className="text-sm text-[#a99e83]">
                Aquí aparecerán las playlists creadas por el usuario.
                </p>
            )}

            {activeTab === "Firmas" && (
                <p className="text-sm text-[#a99e83]">
                Aquí aparecerán las firmas realizadas a los integrantes.
                </p>
            )}
        </div>
    </section>
  );
}