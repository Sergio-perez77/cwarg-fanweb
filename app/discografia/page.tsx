import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type Album = {
  id: string;
  title: string;
  slug: string;
  release_year: number | null;
  cover_url: string | null;
  tracks: { id: string; title: string; duration: string }[] | null;
};

export default async function DiscographyPage() {
  await connection();

  const supabase = await createClient();

  const { data: albums, error } = await supabase
    .from("albums")
    .select("id, title, slug, release_year, cover_url, tracks")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("release_year", { ascending: false });

  if (error) {
    console.error("Error al cargar la discografía:", error.message);
  }

  return (
    <main className="min-h-screen bg-[#080706] px-5 py-10 text-[#f8f3e5] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="text-sm text-[#a99e83] transition hover:text-[#d4af37]"
        >
          ← Volver al inicio
        </Link>

        <header className="mb-12 mt-12 border-b border-[#d4af37]/20 pb-8">
          <p className="mb-3 text-xs tracking-[0.3em] text-[#d4af37]">
            CHARLOTTE WESSELS ARGENTINA · SU UNIVERSO MUSICAL
          </p>

          <h1 className="text-4xl font-semibold sm:text-5xl">
            DISCOGRAFÍA
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#a99e83]">
            Álbumes, canciones y proyectos que forman parte de su trayectoria
            musical.
          </p>
        </header>

        {error ? (
          <p className="py-12 text-center text-sm text-red-400">
            No se pudo cargar la discografía. Intentá nuevamente más tarde.
          </p>
        ) : !albums || albums.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d4af37]/20 p-10 text-center">
            <p className="text-3xl text-[#d4af37]">♫</p>
            <h2 className="mt-4 text-xl font-semibold">
              Próximamente
            </h2>
            <p className="mt-2 text-sm text-[#a99e83]">
              Los álbumes publicados aparecerán en este espacio.
            </p>
          </div>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album: Album) => (
              <Link
                key={album.id}
                href={`/discografia/${album.slug}`}
                className="group overflow-hidden rounded-xl border border-[#d4af37]/15 bg-[#100e09] transition hover:-translate-y-1 hover:border-[#d4af37]/50"
              >
                <div className="aspect-square overflow-hidden bg-black">
                  {album.cover_url ? (
                    <img
                      src={album.cover_url}
                      alt={`Tapa de ${album.title}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl text-[#d4af37]">
                      ♫
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <p className="text-xs tracking-widest text-[#d4af37]">
                    {album.release_year || "ÁLBUM"}
                  </p>

                  <h2 className="mt-2 text-xl font-semibold">
                    {album.title}
                  </h2>

                  <p className="mt-3 text-xs text-[#a99e83]">
                    {album.tracks?.length || 0} canciones
                  </p>

                  <p className="mt-5 text-xs text-[#d4af37]">
                    EXPLORAR ÁLBUM →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <footer className="mt-16 border-t border-[#d4af37]/15 pt-6 text-xs text-[#766b54]">
          Charlotte Wessels Argentina · Discografía
        </footer>
      </div>
    </main>
  );
}