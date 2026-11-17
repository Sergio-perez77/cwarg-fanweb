"use client";

import { useState } from "react";
import UserPosts from "@/app/components/UserPosts";

type Tab = "Inicio" | "Publicaciones" | "Playlists" | "Firmas";

type Signature = {
  id: string;
  display_name: string;
  message: string;
  created_at: string;
  member_name: string;
};

type ProfileTabsProps = {
  signatures: Signature[];
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isOwner: boolean;
};

export default function ProfileTabs({
  signatures,
  userId,
  displayName,
  avatarUrl,
  isOwner,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Inicio");

  const tabs: Tab[] = [
    "Inicio",
    "Publicaciones",
    "Playlists",
    "Firmas",
  ];

  return (
    <section className="mt-8">
      {/* Navegación del perfil */}
      <nav
        aria-label="Secciones del perfil"
        className="flex gap-6 overflow-x-auto border-b border-[#d4af37]/20"
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
            className={`relative shrink-0 pb-4 text-sm font-medium transition ${
              activeTab === tab
                ? "text-[#d4af37]"
                : "text-[#a99e83] hover:text-[#f8f3e5]"
            }`}
          >
            {tab}

            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-[#d4af37]" />
            )}
          </button>
        ))}
      </nav>

      {/* Inicio */}
      {activeTab === "Inicio" && (
        <div className="mt-7 space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] tracking-[0.2em] text-[#d4af37]">
                  ACTIVIDAD
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[#f8f3e5]">
                  Publicaciones recientes
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("Publicaciones")}
                className="shrink-0 text-xs text-[#d4af37] transition hover:text-[#ffe680]"
              >
                Ver todas →
              </button>
            </div>

            <UserPosts
              userId={userId}
              isOwner={isOwner}
              displayName={displayName}
              avatarUrl={avatarUrl}
            />
          </section>

          <section>
            <div className="mb-4">
              <p className="text-[10px] tracking-[0.2em] text-[#d4af37]">
                MÚSICA
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[#f8f3e5]">
                Playlists destacadas
              </h2>
            </div>

            <div className="rounded-xl border border-dashed border-[#d4af37]/20 bg-[#15120a]/60 p-7 text-center">
              <p className="text-sm text-[#a99e83]">
                Aquí aparecerán las playlists favoritas o destacadas de este usuario.
              </p>
              <span className="mt-3 inline-block text-[10px] tracking-[0.2em] text-[#d4af37]">
                PRÓXIMAMENTE
              </span>
            </div>
          </section>

          <section>
            <div className="mb-4">
              <p className="text-[10px] tracking-[0.2em] text-[#d4af37]">
                COMUNIDAD
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[#f8f3e5]">
                Actividad reciente
              </h2>
            </div>

            <div className="rounded-xl border border-dashed border-[#d4af37]/20 bg-[#15120a]/60 p-7 text-center">
              <p className="text-sm text-[#a99e83]">
                Aquí se mostrará la actividad reciente de este usuario en la comunidad.
              </p>
              <span className="mt-3 inline-block text-[10px] tracking-[0.2em] text-[#d4af37]">
                PRÓXIMAMENTE
              </span>
            </div>
          </section>
        </div>
      )}

      {/* Publicaciones */}
      {activeTab === "Publicaciones" && (
        <section className="mt-7">
          <div className="mb-5">
            <p className="text-[10px] tracking-[0.2em] text-[#d4af37]">
              COMUNIDAD
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#f8f3e5]">
              Publicaciones
            </h2>
          </div>

          <UserPosts
            userId={userId}
            isOwner={isOwner}
            displayName={displayName}
            avatarUrl={avatarUrl}
          />
        </section>
      )}

      {/* Playlists */}
      {activeTab === "Playlists" && (
        <section className="mt-7">
          <div className="mb-5">
            <p className="text-[10px] tracking-[0.2em] text-[#d4af37]">
              MÚSICA
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#f8f3e5]">
              Playlists
            </h2>
          </div>

          <div className="rounded-xl border border-dashed border-[#d4af37]/20 bg-[#15120a]/60 p-8 text-center">
            <p className="text-sm text-[#a99e83]">
              Aquí aparecerán las playlists creadas por el usuario.
            </p>
            <span className="mt-3 inline-block text-[10px] tracking-[0.2em] text-[#d4af37]">
              PRÓXIMAMENTE
            </span>
          </div>
        </section>
      )}

      {/* Firmas */}
      {activeTab === "Firmas" && (
        <section className="mt-7">
          <div className="mb-5">
            <p className="text-[10px] tracking-[0.2em] text-[#d4af37]">
              COLECCIÓN
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#f8f3e5]">
              Firmas de integrantes
            </h2>
          </div>

          {signatures.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d4af37]/20 bg-[#15120a]/60 p-8 text-center">
              <p className="text-sm text-[#a99e83]">
                Todavía no hay firmas aprobadas de este usuario.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {signatures.map((signature) => (
                <article
                  key={signature.id}
                  className="rounded-xl border border-[#d4af37]/15 bg-gradient-to-br from-[#19150e] to-[#0d0b08] p-5 transition hover:border-[#d4af37]/35"
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#f8f3e5]">
                    {signature.message}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#d4af37]/15 pt-3">
                    <span className="text-sm text-[#d4af37]">
                      Para {signature.member_name}
                    </span>

                    <time className="text-xs text-[#a99e83]">
                      {new Date(signature.created_at).toLocaleDateString("es-AR")}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}