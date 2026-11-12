"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type BiographyBlock =
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

type BiographySection = {
  id: string;
  title: string;
  content: BiographyBlock[];
  sort_order: number;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
};

function newParagraph(): EditorBlock {
  return {
    id: crypto.randomUUID(),
    type: "paragraph",
    text: "",
  };
}

function newImage(): EditorBlock {
  return {
    id: crypto.randomUUID(),
    type: "image",
    image_url: "",
    caption: "",
    file: null,
    preview_url: "",
  };
}

function normalizeBlocks(content: unknown): EditorBlock[] {
  if (!Array.isArray(content)) return [newParagraph()];

  const blocks: EditorBlock[] = [];

  for (const item of content) {
    if (!item || typeof item !== "object") continue;

    const block = item as Record<string, unknown>;
    const id =
      typeof block.id === "string" ? block.id : crypto.randomUUID();

    if (
      (block.type === "paragraph" || block.type === "heading") &&
      typeof block.text === "string"
    ) {
      blocks.push({
        id,
        type: block.type,
        text: block.text,
      });
    } else if (block.type === "quote") {
      blocks.push({
        id,
        type: "quote",
        text: typeof block.text === "string" ? block.text : "",
        author: typeof block.author === "string" ? block.author : "",
      });
    } else if (block.type === "image") {
      const imageUrl =
        typeof block.image_url === "string" ? block.image_url : "";

      blocks.push({
        id,
        type: "image",
        image_url: imageUrl,
        caption: typeof block.caption === "string" ? block.caption : "",
        file: null,
        preview_url: imageUrl,
      });
    }
  }

  return blocks.length > 0 ? blocks : [newParagraph()];
}

export default function BiographyAdminPage() {
  const supabase = createClient();

  const [sections, setSections] = useState<BiographySection[]>([]);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setBlocks([newParagraph()]);
    loadSections();
    }, []);

  async function loadSections() {
    setLoading(true);

    const { data, error } = await supabase
      .from("biography_sections")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      setError("No se pudieron cargar las secciones.");
    } else {
      setSections((data || []) as BiographySection[]);
    }

    setLoading(false);
  }

  function resetForm() {
    setTitle("");
    setBlocks([newParagraph()]);
    setStatus("draft");
    setEditingId(null);
    setMessage("");
    setError("");
  }

  function editSection(section: BiographySection) {
    setTitle(section.title);
    setBlocks(normalizeBlocks(section.content));
    setStatus(section.status);
    setEditingId(section.id);
    setMessage("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateText(id: string, text: string) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id &&
        (block.type === "paragraph" || block.type === "heading")
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

  function updateCaption(id: string, caption: string) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id && block.type === "image"
          ? { ...block, caption }
          : block
      )
    );
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
    setBlocks((current) => [...current, newImage()]);
  }

  function addParagraph() {
    setBlocks((current) => [...current, newParagraph()]);
  }

  function removeBlock(id: string) {
    setBlocks((current) => {
      const block = current.find((item) => item.id === id);

      if (
        block?.type === "image" &&
        block.preview_url.startsWith("blob:")
      ) {
        URL.revokeObjectURL(block.preview_url);
      }

      return current.filter((item) => item.id !== id);
    });
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((current) => {
      const newIndex = index + direction;

      if (newIndex < 0 || newIndex >= current.length) return current;

      const updated = [...current];
      [updated[index], updated[newIndex]] = [
        updated[newIndex],
        updated[index],
      ];

      return updated;
    });
  }

  function selectImage(id: string, file: File | null) {
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

  async function saveSection() {
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

      if (!title.trim()) {
        throw new Error("El título de la sección es obligatorio.");
      }

      const savedBlocks: BiographyBlock[] = [];

      for (const block of blocks) {
        if (block.type === "paragraph" || block.type === "heading") {
          if (!block.text.trim()) continue;

          savedBlocks.push({
            id: block.id,
            type: block.type,
            text: block.text,
          });

          continue;
        }

        if (block.type === "quote") {
          if (!block.text.trim()) continue;

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
          const fileName = `biography/${Date.now()}-${crypto.randomUUID()}-${block.file.name.replace(
            /[^a-zA-Z0-9.-]/g,
            "-"
          )}`;

          const { error: uploadError } = await supabase.storage
            .from("news-images")
            .upload(fileName, block.file);

          if (uploadError) throw uploadError;

          const { data: imageData } = supabase.storage
            .from("news-images")
            .getPublicUrl(fileName);

          imageUrl = imageData.publicUrl;
        }

        if (imageUrl) {
          savedBlocks.push({
            id: block.id,
            type: "image",
            image_url: imageUrl,
            caption: block.caption,
          });
        }
      }

      const sectionData = {
        title: title.trim(),
        content: savedBlocks,
        status,
        published_at:
          status === "published" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      let saveError;

      if (editingId) {
        const result = await supabase
          .from("biography_sections")
          .update(sectionData)
          .eq("id", editingId);

        saveError = result.error;
      } else {
        const result = await supabase
          .from("biography_sections")
          .insert({
            ...sectionData,
            created_by: user.id,
            sort_order:
              sections.length > 0
                ? Math.max(...sections.map((item) => item.sort_order)) + 1
                : 0,
          });

        saveError = result.error;
      }

      if (saveError) throw saveError;

      setMessage("Sección guardada correctamente.");
      resetForm();
      await loadSections();
    } catch (err) {
      console.error("Error al guardar biografía:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la sección."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSection(id: string) {
    const confirmed = window.confirm(
      "¿Seguro que querés eliminar esta sección?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("biography_sections")
      .delete()
      .eq("id", id);

    if (error) {
      setError("No se pudo eliminar la sección.");
      return;
    }

    if (editingId === id) resetForm();

    setMessage("Sección eliminada correctamente.");
    await loadSections();
  }

  async function moveSection(index: number, direction: -1 | 1) {
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= sections.length) return;

    const updated = [...sections];

    [updated[index], updated[newIndex]] = [
      updated[newIndex],
      updated[index],
    ];

    setSections(updated);

    const results = await Promise.all(
      updated.map((section, position) =>
        supabase
          .from("biography_sections")
          .update({ sort_order: position })
          .eq("id", section.id)
      )
    );

    if (results.some((result) => result.error)) {
      setError("No se pudo actualizar el orden de las secciones.");
      await loadSections();
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <p className="eyebrow">PANEL DE ADMINISTRACIÓN</p>
          <h1>Gestión de biografía</h1>
        </div>

        <Link href="/admin/dashboard" className="admin-back-link">
          ← Volver al panel
        </Link>
      </div>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2>{editingId ? "Editar sección" : "Crear sección"}</h2>

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
            Título de la sección
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej.: Primeros años"
            />
          </label>

          <label>
            Estado
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "draft" | "published")
              }
            >
              <option value="draft">Borrador</option>
              <option value="published">Publicada</option>
            </select>
          </label>
        </div>

        <div className="admin-article-editor">
          <h3>Contenido de la sección</h3>
          <p>
            Organizá el contenido agregando párrafos, subtítulos, citas e
            imágenes.
          </p>

          <div className="admin-editor-actions">
            <button type="button" onClick={addHeading}>
              + Subtítulo
            </button>

            <button type="button" onClick={addParagraph}>
              + Párrafo
            </button>

            <button type="button" onClick={addQuote}>
              + Cita
            </button>

            <button type="button" onClick={addImage}>
              + Imagen
            </button>
          </div>

          <div className="admin-editor-blocks">
            {blocks.map((block, index) => (
              <div className="admin-editor-block" key={block.id}>
                <div className="admin-editor-block-header">
                  <strong>
                    {block.type === "paragraph"
                      ? `Párrafo ${index + 1}`
                      : block.type === "heading"
                        ? `Subtítulo ${index + 1}`
                        : block.type === "quote"
                          ? `Cita ${index + 1}`
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

                {block.type === "paragraph" && (
                  <textarea
                    rows={6}
                    value={block.text}
                    onChange={(event) =>
                      updateText(block.id, event.target.value)
                    }
                    placeholder="Escribí el párrafo..."
                  />
                )}

                {block.type === "heading" && (
                  <input
                    type="text"
                    value={block.text}
                    onChange={(event) =>
                      updateText(block.id, event.target.value)
                    }
                    placeholder="Escribí el subtítulo..."
                  />
                )}

                {block.type === "quote" && (
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
                )}

                {block.type === "image" && (
                  <div className="admin-editor-image">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(event) =>
                        selectImage(
                          block.id,
                          event.target.files?.[0] || null
                        )
                      }
                    />

                    {block.preview_url && (
                      <img
                        src={block.preview_url}
                        alt="Vista previa"
                      />
                    )}

                    <label>
                      Epígrafe / descripción / crédito fotográfico
                      <input
                        type="text"
                        value={block.caption}
                        onChange={(event) =>
                          updateCaption(block.id, event.target.value)
                        }
                        placeholder="Descripción de la imagen"
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="admin-save-button"
          onClick={saveSection}
          disabled={saving}
        >
          {saving
            ? "Guardando..."
            : editingId
              ? "Guardar cambios"
              : "Crear sección"}
        </button>
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Secciones existentes</h2>
        </div>

        {loading ? (
          <p>Cargando secciones...</p>
        ) : sections.length === 0 ? (
          <p>Todavía no hay secciones de biografía.</p>
        ) : (
          <div className="admin-news-list">
            {sections.map((section, index) => (
              <div className="admin-news-item" key={section.id}>
                <div>
                  <strong>{section.title}</strong>
                  <p>
                    {section.status === "published"
                      ? "Publicada"
                      : "Borrador"}
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => moveSection(index, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    onClick={() => moveSection(index, 1)}
                    disabled={index === sections.length - 1}
                  >
                    ↓
                  </button>

                  <button
                    type="button"
                    onClick={() => editSection(section)}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteSection(section.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}