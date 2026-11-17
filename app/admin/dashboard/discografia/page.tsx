"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Track = {
  id: string;
  title: string;
  duration: string;
};

type InfoBlock = {
  id: string;
  text: string;
};

type GalleryImage = {
  id: string;
  url: string;
  file?: File;
};

type Album = {
  id: string;
  title: string;
  slug: string;
  release_year: number | null;
  cover_url: string | null;
  tracks: Track[];
  info: InfoBlock[];
  gallery_images: GalleryImage[];
  status: "draft" | "published";
  created_at: string;
};

const emptyTrack = (): Track => ({
  id: crypto.randomUUID(),
  title: "",
  duration: "",
});

const emptyInfo = (): InfoBlock => ({
  id: crypto.randomUUID(),
  text: "",
});

export default function DiscographyAdminPage() {
  const supabase = createClient();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [year, setYear] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [info, setInfo] = useState<InfoBlock[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadAlbums();
  }, []);

  async function loadAlbums() {
    setLoading(true);

    const { data, error } = await supabase
      .from("albums")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setError("No se pudieron cargar los álbumes: " + error.message);
    } else {
      setAlbums((data || []) as Album[]);
    }

    setLoading(false);
  }

  function resetForm() {
    setTitle("");
    setSlug("");
    setYear("");
    setCoverUrl("");
    setCoverFile(null);
    setCoverPreview("");
    setTracks([]);
    setInfo([]);
    setGalleryImages([]);
    setStatus("draft");
    setEditingId(null);
    setError("");
    setMessage("");
  }

  function editAlbum(album: Album) {
    setTitle(album.title);
    setSlug(album.slug);
    setYear(album.release_year?.toString() || "");
    setCoverUrl(album.cover_url || "");
    setCoverPreview(album.cover_url || "");
    setCoverFile(null);
    setTracks(album.tracks || []);
    setInfo(album.info || []);
    setGalleryImages(album.gallery_images || []);
    setStatus(album.status);
    setEditingId(album.id);
    setError("");
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectCover(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("El archivo seleccionado no es una imagen.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("La tapa no puede superar los 5 MB.");
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setError("");
  }

  function updateTrack(id: string, field: keyof Track, value: string) {
    setTracks((current) =>
      current.map((track) =>
        track.id === id ? { ...track, [field]: value } : track
      )
    );
  }

  function moveTrack(index: number, direction: -1 | 1) {
    setTracks((current) => {
      const next = index + direction;
      if (next < 0 || next >= current.length) return current;

      const updated = [...current];
      [updated[index], updated[next]] = [
        updated[next],
        updated[index],
      ];
      return updated;
    });
  }

  function updateInfo(id: string, text: string) {
    setInfo((current) =>
      current.map((block) =>
        block.id === id ? { ...block, text } : block
      )
    );
  }

  function selectGalleryImages(files: FileList | null) {
  if (!files) return;

  const selected = Array.from(files);
  const validImages: GalleryImage[] = [];

  for (const file of selected) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("La galería solo admite imágenes JPG, PNG o WEBP.");
      continue;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(`La imagen ${file.name} supera los 5 MB.`);
      continue;
    }

    validImages.push({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      file,
    });
  }

  setGalleryImages((current) => [...current, ...validImages]);
}

function moveGalleryImage(index: number, direction: -1 | 1) {
  setGalleryImages((current) => {
    const next = index + direction;

    if (next < 0 || next >= current.length) return current;

    const updated = [...current];
    [updated[index], updated[next]] = [updated[next], updated[index]];

    return updated;
  });
}

function removeGalleryImage(id: string) {
  setGalleryImages((current) =>
    current.filter((image) => image.id !== id)
  );
}

  async function saveAlbum() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("No hay una sesión activa.");
      }

      if (!title.trim() || !slug.trim()) {
        throw new Error("El nombre del álbum y su URL son obligatorios.");
      }

      if (tracks.some((track) => !track.title.trim())) {
        throw new Error("Todas las canciones deben tener un título.");
      }

      let finalCoverUrl = coverUrl;

      if (coverFile) {
        const extension = coverFile.name.split(".").pop() || "jpg";
        const fileName = `albums/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("news-images")
          .upload(fileName, coverFile, {
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: imageData } = supabase.storage
          .from("news-images")
          .getPublicUrl(fileName);

        finalCoverUrl = imageData.publicUrl;
      }

      const finalGalleryImages: GalleryImage[] = [];

        for (const image of galleryImages) {
        if (image.file) {
            const extension = image.file.name.split(".").pop() || "jpg";
            const fileName = `albums/gallery/${crypto.randomUUID()}.${extension}`;

            const { error: galleryUploadError } = await supabase.storage
            .from("news-images")
            .upload(fileName, image.file, {
                upsert: false,
            });

            if (galleryUploadError) throw galleryUploadError;

            const { data: galleryImageData } = supabase.storage
            .from("news-images")
            .getPublicUrl(fileName);

            finalGalleryImages.push({
            id: image.id,
            url: galleryImageData.publicUrl,
            });
        } else {
            finalGalleryImages.push({
            id: image.id,
            url: image.url,
            });
        }
        }

      const albumData = {
        title: title.trim(),
        slug: slug.trim(),
        release_year: year ? Number(year) : null,
        cover_url: finalCoverUrl || null,
        tracks: tracks.filter((track) => track.title.trim()),
        info: info.filter((block) => block.text.trim()),
        gallery_images: finalGalleryImages,
        status,
        published_at:
          status === "published" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (year && (!Number.isInteger(Number(year)) || Number(year) < 1900 || Number(year) > 2100)) {
        throw new Error("Ingresá un año de lanzamiento válido.");
      }

      let saveError;

      if (editingId) {
        const result = await supabase
          .from("albums")
          .update(albumData)
          .eq("id", editingId);

        saveError = result.error;
      } else {
        const result = await supabase
          .from("albums")
          .insert({
            ...albumData,
            created_by: user.id,
          });

        saveError = result.error;
      }

      if (saveError) throw saveError;

      setMessage("Álbum guardado correctamente.");
      resetForm();
      await loadAlbums();
    } catch (err) {
      console.error("Error al guardar álbum:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el álbum."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteAlbum(id: string) {
    if (!window.confirm("¿Seguro que querés eliminar este álbum?")) return;

    const { error } = await supabase
      .from("albums")
      .delete()
      .eq("id", id);

    if (error) {
      setError("No se pudo eliminar el álbum: " + error.message);
      return;
    }

    if (editingId === id) resetForm();

    setMessage("Álbum eliminado correctamente.");
    await loadAlbums();
  }

  return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <p className="eyebrow">PANEL DE ADMINISTRACIÓN</p>
          <h1>Gestión de discografía</h1>
        </div>

        <Link href="/admin/dashboard" className="admin-back-link">
          ← Volver al panel
        </Link>
      </div>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2>{editingId ? "Editar álbum" : "Agregar álbum"}</h2>

          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancelar edición
            </button>
          )}
        </div>

        {error && <p className="admin-error">{error}</p>}
        {message && <p className="admin-success">{message}</p>}

        <div className="admin-form">
          <label>
            Nombre del álbum
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!editingId) {
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")
                  );
                }
              }}
              placeholder="Nombre del álbum"
            />
          </label>

          <label>
            URL del álbum
            <input
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-")
                )
              }
              placeholder="nombre-del-album"
            />
          </label>

          <label>
            Año de lanzamiento
            <input
              type="number"
              min="1900"
              max="2100"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2026"
            />
          </label>

          <label>
            Estado de publicación
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "draft" | "published")
              }
            >
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </select>
          </label>

          <label>
            Tapa del álbum
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) =>
                selectCover(e.target.files?.[0] || null)
              }
            />
          </label>
        </div>

        {coverPreview && (
          <div style={{ marginTop: 20 }}>
            <p>Vista previa de la tapa</p>
            <img
              src={coverPreview}
              alt="Tapa del álbum"
              className="admin-image-preview"
              style={{ maxWidth: 280, marginTop: 10 }}
            />
          </div>
        )}

        <div className="admin-article-editor">
          <h3>Setlist</h3>
          <p>Agregá las canciones y organizalas en el orden del álbum.</p>

          <div className="admin-editor-actions">
            <button
              type="button"
              onClick={() =>
                setTracks((current) => [...current, emptyTrack()])
              }
            >
              + Agregar canción
            </button>
          </div>

          <div className="admin-editor-blocks">
            {tracks.map((track, index) => (
              <div className="admin-editor-block" key={track.id}>
                <div className="admin-editor-block-header">
                  <strong>Canción {index + 1}</strong>

                  <div>
                    <button
                      type="button"
                      onClick={() => moveTrack(index, -1)}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTrack(index, 1)}
                      disabled={index === tracks.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTracks((current) =>
                          current.filter((item) => item.id !== track.id)
                        )
                      }
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="admin-form">
                  <label>
                    Título de la canción
                    <input
                      value={track.title}
                      onChange={(e) =>
                        updateTrack(track.id, "title", e.target.value)
                      }
                      placeholder="Nombre de la canción"
                    />
                  </label>

                  <label>
                    Duración (opcional)
                    <input
                      value={track.duration}
                      onChange={(e) =>
                        updateTrack(track.id, "duration", e.target.value)
                      }
                      placeholder="Ej.: 4:35"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          {tracks.length === 0 && (
            <p>Todavía no agregaste canciones.</p>
          )}
        </div>

        <div className="admin-article-editor">
          <h3>Información del álbum</h3>
          <p>
            Agregá los textos que quieras incluir en la ficha pública.
          </p>

          <div className="admin-editor-actions">
            <button
              type="button"
              onClick={() =>
                setInfo((current) => [...current, emptyInfo()])
              }
            >
              + Agregar información
            </button>
          </div>

          <div className="admin-editor-blocks">
            {info.map((block, index) => (
              <div className="admin-editor-block" key={block.id}>
                <div className="admin-editor-block-header">
                  <strong>Información {index + 1}</strong>
                  <button
                    type="button"
                    onClick={() =>
                      setInfo((current) =>
                        current.filter((item) => item.id !== block.id)
                      )
                    }
                  >
                    Eliminar
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={block.text}
                  onChange={(e) => updateInfo(block.id, e.target.value)}
                  placeholder="Escribí información sobre el álbum..."
                />
              </div>
            ))}
          </div>
        </div>

        <div className="admin-article-editor">
            <h3>Galería de imágenes</h3>
            <p>
                Agregá fotografías relacionadas con el álbum. Podés organizarlas
                en el orden en que aparecerán en la ficha pública.
            </p>

            <div className="admin-form">
                <label>
                Seleccionar fotografías
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(e) => {
                    selectGalleryImages(e.target.files);
                    e.target.value = "";
                    }}
                />
                </label>
            </div>

            <div className="admin-editor-blocks">
                {galleryImages.map((image, index) => (
                <div className="admin-editor-block" key={image.id}>
                    <div className="admin-editor-block-header">
                    <strong>Imagen {index + 1}</strong>

                    <div>
                        <button
                        type="button"
                        onClick={() => moveGalleryImage(index, -1)}
                        disabled={index === 0}
                        >
                        ↑
                        </button>

                        <button
                        type="button"
                        onClick={() => moveGalleryImage(index, 1)}
                        disabled={index === galleryImages.length - 1}
                        >
                        ↓
                        </button>

                        <button
                        type="button"
                        onClick={() => removeGalleryImage(image.id)}
                        >
                        Eliminar
                        </button>
                    </div>
                    </div>

                    <img
                    src={image.url}
                    alt={`Fotografía ${index + 1} del álbum`}
                    className="admin-image-preview"
                    style={{
                        maxWidth: 240,
                        maxHeight: 220,
                        objectFit: "contain",
                        marginTop: 12,
                    }}
                    />
                </div>
                ))}
            </div>

            {galleryImages.length === 0 && (
                <p>Todavía no agregaste fotografías a la galería.</p>
            )}
        </div>

        <button
          type="button"
          className="admin-save-button"
          onClick={saveAlbum}
          disabled={saving}
        >
          {saving
            ? "Guardando..."
            : editingId
              ? "Actualizar álbum"
              : "Guardar álbum"}
        </button>
      </section>

      <section className="admin-section">
        <h2>Álbumes existentes</h2>

        {loading ? (
          <p>Cargando álbumes...</p>
        ) : albums.length === 0 ? (
          <p>Todavía no hay álbumes cargados.</p>
        ) : (
          <div className="admin-news-list">
            {albums.map((album) => (
              <article className="admin-news-item" key={album.id}>
                <div>
                  <h3>{album.title}</h3>
                  <p>
                    {album.release_year || "Año sin especificar"} ·{" "}
                    {album.status === "published" ? "Publicado" : "Borrador"}
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => editAlbum(album)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAlbum(album.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}