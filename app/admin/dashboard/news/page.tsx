"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ArticleBlock =
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "quote"; text: string; author: string }
  | { id: string; type: "image"; image_url: string; caption: string };

type EditorBlock =
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "quote"; text: string; author: string }
  | {
      id: string;
      type: "image";
      image_url: string;
      caption: string;
      file: File | null;
      preview_url: string;
    };

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  image_url: string | null;
  status: "draft" | "published";
  created_at: string;
  published_at: string | null;
};

type NewsForm = {
  title: string;
  slug: string;
  excerpt: string;
  image_url: string;
  status: "draft" | "published";
};

function createParagraph(): EditorBlock {
  return {
    id: "",
    type: "paragraph",
    text: "",
  };
}

function createImageBlock(): EditorBlock {
  return {
    id: "",
    type: "image",
    image_url: "",
    caption: "",
    file: null,
    preview_url: "",
  };
}

function parseContent(content: string): EditorBlock[] {
  try {
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed)) {
      const blocks: EditorBlock[] = parsed
        .filter(
          (item) =>
            item &&
            (item.type === "paragraph" || item.type === "image")
        )
        .map((item) => {
          if (item.type === "paragraph" || item.type === "heading") {
              return {
                id: item.id || crypto.randomUUID(),
                type: item.type as "paragraph" | "heading",
                text: item.text || "",
              };
            }

            if (item.type === "quote") {
              return {
                id: item.id || crypto.randomUUID(),
                type: "quote" as const,
                text: item.text || "",
                author: item.author || "",
              };
            }

          return {
            id: item.id || crypto.randomUUID(),
            type: "image" as const,
            image_url: item.image_url || "",
            caption: item.caption || "",
            file: null,
            preview_url: item.image_url || "",
          };
        });

      if (blocks.length > 0) return blocks;
    }
  } catch {
    // El contenido anterior no estaba guardado como JSON.
  }

  return content
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((paragraph) => ({
      id: crypto.randomUUID(),
      type: "paragraph" as const,
      text: paragraph,
    }));
}

export default function NewsAdminPage() {
  const supabase = createClient();

  const [news, setNews] = useState<NewsItem[]>([]);
  const [form, setForm] = useState<NewsForm>({
    title: "",
    slug: "",
    excerpt: "",
    image_url: "",
    status: "draft",
  });

  const [blocks, setBlocks] = useState<EditorBlock[]>([
    createParagraph(),
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    setLoading(true);

    const { data, error } = await supabase
      .from("news")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError("No se pudieron cargar las noticias.");
    } else {
      setNews((data || []) as NewsItem[]);
    }

    setLoading(false);
  }

  function updateField<K extends keyof NewsForm>(
    field: K,
    value: NewsForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateParagraph(id: string, text: string) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id && block.type === "paragraph"
          ? { ...block, text }
          : block
      )
    );
  }

  function updateHeading(id: string, text: string) {
  setBlocks((current) =>
    current.map((block) =>
      block.id === id && block.type === "heading"
        ? { ...block, text }
        : block
    )
  );
}

function updateQuote(id: string, text: string) {
  setBlocks((current) =>
    current.map((block) =>
      block.id === id && block.type === "quote"
        ? { ...block, text }
        : block
    )
  );
}

function updateQuoteAuthor(id: string, author: string) {
  setBlocks((current) =>
    current.map((block) =>
      block.id === id && block.type === "quote"
        ? { ...block, author }
        : block
    )
  );
}

  function updateImageCaption(id: string, caption: string) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id && block.type === "image"
          ? { ...block, caption }
          : block
      )
    );
  }

  function addParagraph() {
    setBlocks((current) => [
      ...current,
      { ...createParagraph(), id: crypto.randomUUID() },
    ]);
  }

  function addHeading() {
  setBlocks((current) => [
    ...current,
    {
      id: crypto.randomUUID(),
      type: "heading",
      text: "",
    },
  ]);
}

function addQuote() {
  setBlocks((current) => [
    ...current,
    {
      id: crypto.randomUUID(),
      type: "quote",
      text: "",
      author: "",
    },
  ]);
}

  function addImage() {
    setBlocks((current) => [
      ...current,
      { ...createImageBlock(), id: crypto.randomUUID() },
    ]);
  }

  function removeBlock(id: string) {
    setBlocks((current) => {
      const block = current.find((item) => item.id === id);

      if (block?.type === "image" && block.preview_url.startsWith("blob:")) {
        URL.revokeObjectURL(block.preview_url);
      }

      return current.filter((item) => item.id !== id);
    });
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((current) => {
      const newIndex = index + direction;

      if (newIndex < 0 || newIndex >= current.length) {
        return current;
      }

      const updated = [...current];
      [updated[index], updated[newIndex]] = [
        updated[newIndex],
        updated[index],
      ];

      return updated;
    });
  }

  function selectBlockImage(id: string, file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("El archivo seleccionado no es una imagen.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Cada imagen puede pesar como máximo 5 MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setBlocks((current) =>
      current.map((block) => {
        if (block.id !== id || block.type !== "image") return block;

        if (block.preview_url.startsWith("blob:")) {
          URL.revokeObjectURL(block.preview_url);
        }

        return {
          ...block,
          file,
          preview_url: previewUrl,
        };
      })
    );

    setError("");
  }

  function resetForm() {
    setForm({
      title: "",
      slug: "",
      excerpt: "",
      image_url: "",
      status: "draft",
    });

    setBlocks([createParagraph()]);
    setEditingId(null);
    setSelectedFile(null);
    setMessage("");
    setError("");
  }

  function editNews(item: NewsItem) {
    setForm({
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || "",
      image_url: item.image_url || "",
      status: item.status,
    });

    setBlocks(parseContent(item.content || ""));
    setEditingId(item.id);
    setSelectedFile(null);
    setMessage("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveNews() {
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

      let mainImageUrl = form.image_url;

      if (selectedFile) {
        const fileName = `${Date.now()}-${selectedFile.name.replace(
          /[^a-zA-Z0-9.-]/g,
          "-"
        )}`;

        const { error: uploadError } = await supabase.storage
          .from("news-images")
          .upload(fileName, selectedFile, {
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: imageData } = supabase.storage
          .from("news-images")
          .getPublicUrl(fileName);

        mainImageUrl = imageData.publicUrl;
      }

      const savedBlocks: ArticleBlock[] = [];

      for (const block of blocks) {
        if (block.type === "paragraph") {
          savedBlocks.push({
            id: block.id,
            type: "paragraph",
            text: block.text,
          });
          continue;
        }

        if (block.type === "heading") {
          savedBlocks.push({
            id: block.id,
            type: "heading",
            text: block.text,
          });
          continue;
        }

        if (block.type === "quote") {
          savedBlocks.push({
            id: block.id,
            type: "quote",
            text: block.text,
            author: block.author,
          });
          continue;
        }

        let imageUrl = block.image_url;

        if (block.file) {
          const fileName = `${Date.now()}-${block.file.name.replace(
            /[^a-zA-Z0-9.-]/g,
            "-"
          )}`;

        const { error: uploadError } = await supabase.storage
          .from("news-images")
          .upload(fileName, block.file, {
            upsert: true,
          });

        if (uploadError) throw uploadError;

          const { data: imageData } = supabase.storage
            .from("news-images")
            .getPublicUrl(fileName);

          imageUrl = imageData.publicUrl;
        }

        savedBlocks.push({
          id: block.id,
          type: "image",
          image_url: imageUrl,
          caption: block.caption,
        });
      }

      const newsData = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim() || null,
        content: JSON.stringify(savedBlocks),
        image_url: mainImageUrl || null,
        status: form.status,
        published_at:
          form.status === "published"
            ? new Date().toISOString()
            : null,
        updated_at: new Date().toISOString(),
      };

      if (!newsData.title || !newsData.slug) {
        throw new Error("El título y el slug son obligatorios.");
      }

      let saveError;

      if (editingId) {
        const result = await supabase
          .from("news")
          .update(newsData)
          .eq("id", editingId);

        saveError = result.error;
      } else {
        const result = await supabase
          .from("news")
          .insert({
            ...newsData,
            author_id: user.id,
          });

        saveError = result.error;
      }

      if (saveError) throw saveError;

      setMessage("Noticia guardada correctamente.");
      resetForm();
      await loadNews();
    } catch (err) {
      console.error("Error al guardar noticia:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la noticia."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteNews(id: string) {
    const confirmed = window.confirm(
      "¿Seguro que querés eliminar esta noticia?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("news")
      .delete()
      .eq("id", id);

    if (error) {
      setError("No se pudo eliminar la noticia.");
      return;
    }

    setMessage("Noticia eliminada correctamente.");

    if (editingId === id) {
      resetForm();
    }

    await loadNews();
  }

  return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <p className="eyebrow">PANEL DE ADMINISTRACIÓN</p>
          <h1>Gestión de noticias</h1>
        </div>

        <Link href="/admin/dashboard" className="admin-back-link">
          ← Volver al panel
        </Link>
      </div>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2>{editingId ? "Editar noticia" : "Crear noticia"}</h2>

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
            Título
            <input
              type="text"
              value={form.title}
              onChange={(event) =>
                updateField("title", event.target.value)
              }
              placeholder="Título de la noticia"
            />
          </label>

          <label>
            Slug (URL)
            <input
              type="text"
              value={form.slug}
              onChange={(event) =>
                updateField(
                  "slug",
                  event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-")
                )
              }
              placeholder="titulo-de-la-noticia"
            />
          </label>

          <label>
            Resumen
            <textarea
              value={form.excerpt}
              onChange={(event) =>
                updateField("excerpt", event.target.value)
              }
              placeholder="Breve descripción de la noticia"
              rows={3}
            />
          </label>

          <label>
            Imagen principal
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] || null)
              }
            />
          </label>

          {form.image_url && !selectedFile && (
            <img
              src={form.image_url}
              alt="Imagen principal actual"
              className="admin-image-preview"
            />
          )}

          {selectedFile && (
            <p>Imagen principal seleccionada: {selectedFile.name}</p>
          )}

          <label>
            Estado
            <select
              value={form.status}
              onChange={(event) =>
                updateField(
                  "status",
                  event.target.value as "draft" | "published"
                )
              }
            >
              <option value="draft">Borrador</option>
              <option value="published">Publicada</option>
            </select>
          </label>
        </div>

      <div className="admin-article-editor">
          <h3>Contenido de la noticia</h3>
          <p>
            Agregá párrafos e imágenes y organizalos en el orden que quieras.
          </p>

          <div className="admin-editor-actions">
            <button type="button" onClick={addHeading}>
              + Agregar subtítulo
            </button>

            <button type="button" onClick={addParagraph}>
              + Agregar párrafo
            </button>

            <button type="button" onClick={addQuote}>
              + Agregar cita
            </button>

            <button type="button" onClick={addImage}>
              + Agregar imagen
            </button>
          </div>

          <div className="admin-editor-blocks">
            {blocks.map((block, index) => (
              <div className="admin-editor-block" key={block.id}>
                <div className="admin-editor-block-header">
                  <strong>
                    {block.type === "paragraph"
                      ? `Párrafo ${index + 1}`
                      : `Imagen ${index + 1}`}
                  </strong>

                  <div>
                    <button
                      type="button"
                      onClick={() => moveBlock(index, -1)}
                      disabled={index === 0}
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() => moveBlock(index, 1)}
                      disabled={index === blocks.length - 1}
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {block.type === "paragraph" ? (
                  <textarea
                    rows={6}
                    value={block.text}
                    onChange={(event) =>
                      updateParagraph(block.id, event.target.value)
                    }
                    placeholder="Escribí el párrafo..."
                  />
                    ) : block.type === "heading" ? (
                      <input
                        type="text"
                        value={block.text}
                        onChange={(event) =>
                          updateHeading(block.id, event.target.value)
                        }
                        placeholder="Escribí el subtítulo..."
                      />
                        ) : block.type === "quote" ? (
                          <div className="admin-editor-quote">
                            <textarea
                              rows={4}
                              value={block.text}
                              onChange={(event) =>
                                updateQuote(block.id, event.target.value)
                              }
                              placeholder="Escribí la cita..."
                            />

                            <input
                              type="text"
                              value={block.author}
                              onChange={(event) =>
                                updateQuoteAuthor(block.id, event.target.value)
                              }
                              placeholder="Autor de la cita (opcional)"
                            />
                          </div>
                        ) : (
                          <div className="admin-editor-image">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={(event) =>
                                selectBlockImage(
                                  block.id,
                                  event.target.files?.[0] || null
                                )
                              }
                            />

                    {block.preview_url && (
                      <img
                        src={block.preview_url}
                        alt="Vista previa de imagen"
                      />
                    )}

                    <label>
                      Epígrafe / descripción / crédito fotográfico
                      <input
                        type="text"
                        value={block.caption}
                        onChange={(event) =>
                          updateImageCaption(block.id, event.target.value)
                        }
                        placeholder="Ej.: Fotografía: nombre del autor"
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>

          <details className="admin-article-preview">
            <summary>Vista previa del contenido</summary>

            <div>
              {blocks.map((block) => {
                if (block.type === "paragraph") {
                  return <p key={block.id}>{block.text}</p>;
                }

                if (block.type === "heading") {
                  return <h2 key={block.id}>{block.text}</h2>;
                }

                if (block.type === "quote") {
                  return (
                    <blockquote key={block.id}>
                      <p>{block.text}</p>
                      {block.author && <cite>{block.author}</cite>}
                    </blockquote>
                  );
                }

                return (
                  <figure key={block.id}>
                    {block.preview_url && (
                      <img
                        src={block.preview_url}
                        alt={block.caption || "Imagen de la noticia"}
                      />
                    )}

                    {block.caption && (
                      <figcaption>{block.caption}</figcaption>
                    )}
                  </figure>
                );
              })}
            </div>
          </details>
        </div>

        <button
          type="button"
          onClick={saveNews}
          disabled={saving}
          className="admin-save-button"
        >
          {saving
            ? "Guardando..."
            : editingId
              ? "Actualizar noticia"
              : "Guardar noticia"}
        </button>
      </section>

      <section className="admin-section">
        <h2>Noticias existentes</h2>

        {loading ? (
          <p>Cargando noticias...</p>
        ) : news.length === 0 ? (
          <p>Todavía no hay noticias.</p>
        ) : (
          <div className="admin-news-list">
            {news.map((item) => (
              <article key={item.id} className="admin-news-item">
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    Estado:{" "}
                    {item.status === "published"
                      ? "Publicada"
                      : "Borrador"}
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => editNews(item)}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteNews(item.id)}
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