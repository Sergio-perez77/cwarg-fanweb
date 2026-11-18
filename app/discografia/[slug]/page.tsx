import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

export const instant = false;

type Track = {
  id: string;
  title: string;
  duration?: string;
};

type InfoBlock = {
  id: string;
  text: string;
};

type GalleryImage = {
  id: string;
  url: string;
};

type Album = {
  id: string;
  title: string;
  slug: string;
  release_year: number | null;
  cover_url: string | null;
  tracks: Track[] | null;
  info: InfoBlock[] | null;
  gallery_images: GalleryImage[] | null;
};

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function AlbumDetailPage({ params }: Props) {
  await connection();

  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("albums")
    .select(
      "id, title, slug, release_year, cover_url, tracks, info, gallery_images"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("Error al cargar el álbum:", error.message);
    throw new Error("No se pudo cargar el álbum.");
  }

  if (!data) notFound();

  const album = data as Album;
  const tracks = Array.isArray(album.tracks) ? album.tracks : [];
  const info = Array.isArray(album.info) ? album.info : [];
  const gallery = Array.isArray(album.gallery_images)
    ? album.gallery_images.filter((image) => image.url)
    : [];

  return (
    <main className="news-detail-page">
      <div className="news-detail-container">
        <Link href="/discografia" className="news-back-link">
          ← VOLVER A DISCOGRAFÍA
        </Link>

        <article className="news-detail">
          <header className="news-detail-header">
            <p className="eyebrow">
              CHARLOTTE WESSELS ARGENTINA · DISCOGRAFÍA
            </p>

            <h1>{album.title}</h1>

            {album.release_year && (
              <p className="news-detail-date">
                {album.release_year}
              </p>
            )}
          </header>

          {album.cover_url && (
            <figure className="news-detail-main-image">
              <img
                src={album.cover_url}
                alt={`Portada del álbum ${album.title}`}
              />
            </figure>
          )}

          {info.length > 0 && (
            <section className="news-detail-content">
              {info.map((block, index) => (
                <p
                  key={block.id || index}
                  className="news-detail-paragraph"
                >
                  {block.text}
                </p>
              ))}
            </section>
          )}

          {tracks.length > 0 && (
            <section className="album-tracks">
              <h2>LISTA DE CANCIONES</h2>

              <ol>
                {tracks.map((track, index) => (
                  <li key={track.id || index}>
                    <span className="album-track-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="album-track-title">
                      {track.title}
                    </span>

                    {track.duration && (
                      <span className="album-track-duration">
                        {track.duration}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {gallery.length > 0 && (
            <section className="album-gallery">
              <h2>GALERÍA</h2>

              <div className="album-gallery-grid">
                {gallery.map((image, index) => (
                  <figure key={image.id || index}>
                    <img
                      src={image.url}
                      alt={`${album.title} - Fotografía ${index + 1}`}
                      loading="lazy"
                    />
                  </figure>
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </main>
  );
}