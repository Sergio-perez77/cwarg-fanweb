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

type BandMember = {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  content: BiographyBlock[];
  sort_order: number;
  status: "draft" | "published";
  published_at: string | null;
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeBlocks(content: unknown): EditorBlock[] {
  if (!Array.isArray(content)) return [newParagraph()];

  const result: EditorBlock[] = [];

  for (const item of content) {
    if (!item || typeof item !== "object") continue;

    const block = item as Record<string, unknown>;
    const id =
      typeof block.id === "string" ? block.id : crypto.randomUUID();

    if (
      (block.type === "paragraph" || block.type === "heading") &&
      typeof block.text === "string"
    ) {
      result.push({
        id,
        type: block.type,
        text: block.text,
      });
    } else if (block.type === "quote") {
      result.push({
        id,
        type: "quote",
        text: typeof block.text === "string" ? block.text : "",
        author: typeof block.author === "string" ? block.author : "",
      });
    } else if (block.type === "image") {
      const url =
        typeof block.image_url === "string" ? block.image_url : "";

      result.push({
        id,
        type: "image",
        image_url: url,
        caption: typeof block.caption === "string" ? block.caption : "",
        file: null,
        preview_url: url,
      });
    }
  }

  return result.length ? result : [newParagraph()];
}

export default function IntegrantesAdminPage() {
  const supabase = createClient();

  const [members, setMembers] = useState<BandMember[]>([]);
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setBlocks([newParagraph()]);
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("band_members")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      setError("No se pudieron cargar los integrantes.");
    } else {
      setMembers((data || []) as BandMember[]);
    }

    setLoading(false);
  }

  function resetForm() {
    setName("");
    setPhotoUrl("");
    setPhotoFile(null);
    setPhotoPreview("");
    setBlocks([newParagraph()]);
    setStatus("draft");
    setEditingId(null);
    setMessage("");
    setError("");
  }

  function editMember(member: BandMember) {
    setName(member.name);
    setPhotoUrl(member.photo_url || "");
    setPhotoFile(null);
    setPhotoPreview(member.photo_url || "");
    setBlocks(normalizeBlocks(member.content));
    setStatus(member.status);
    setEditingId(member.id);
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

  function updateAuthor(id: string, author: string) {
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
      { id: crypto.randomUUID(), type: "heading", text: "" },
    ]);
  }

  function addParagraph() {
    setBlocks((current) => [...current, newParagraph()]);
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

      if (newIndex < 0 || newIndex >= current.length) return current;

      const updated = [...current];

      [updated[index], updated[newIndex]] = [
        updated[newIndex],
        updated[index],
      ];

      return updated;
    });
  }

  function selectPhoto(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("El archivo seleccionado no es una imagen.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("La fotografía puede pesar como máximo 5 MB.");
      return;
    }

    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
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

    const preview = URL.createObjectURL(file);

    setBlocks((current) =>
      current.map((block) => {
        if (block.id !== id || block.type !== "image") return block;

        if (block.preview_url.startsWith("blob:")) {
          URL.revokeObjectURL(block.preview_url);
        }

        return {
          ...block,
          file,
          preview_url: preview,
        };
      })
    );

    setError("");
  }

  async function uploadImage(file: File, folder: string) {
    const fileName = `${folder}/${Date.now()}-${crypto.randomUUID()}-${file.name.replace(
      /[^a-zA-Z0-9.-]/g,
      "-"
    )}`;

    const { error } = await supabase.storage
      .from("news-images")
      .upload(fileName, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from("news-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function saveMember() {
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

      if (!name.trim()) {
        throw new Error("El nombre del integrante es obligatorio.");
      }

      let finalPhotoUrl = photoUrl;

      if (photoFile) {
        finalPhotoUrl = await uploadImage(photoFile, "members");
      }

      if (!finalPhotoUrl) {
        throw new Error("Tenés que seleccionar una fotografía.");
      }

      const savedBlocks: BiographyBlock[] = [];

      for (const block of blocks) {
        if (
          block.type === "paragraph" ||
          block.type === "heading"
        ) {
          if (!block.text.trim()) continue;

          savedBlocks.push({
            id: block.id,
            type: block.type,
            text: block.text,
          });
        } else if (block.type === "quote") {
          if (!block.text.trim()) continue;

          savedBlocks.push({
            id: block.id,
            type: "quote",
            text: block.text,
            author: block.author,
          });
        } else {
          let imageUrl = block.image_url;

          if (block.file) {
            imageUrl = await uploadImage(block.file, "members");
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
      }

      const memberData = {
        name: name.trim(),
        slug: slugify(name),
        photo_url: finalPhotoUrl,
        content: savedBlocks,
        status,
        published_at:
          status === "published"
            ? new Date().toISOString()
            : null,
        updated_at: new Date().toISOString(),
      };

      let saveError;

      if (editingId) {
        const result = await supabase
          .from("band_members")
          .update(memberData)
          .eq("id", editingId);

        saveError = result.error;
      } else {
        const result = await supabase
          .from("band_members")
          .insert({
            ...memberData,
            created_by: user.id,
            sort_order:
              members.length > 0
                ? Math.max(...members.map((item) => item.sort_order)) + 1
                : 0,
          });

        saveError = result.error;
      }

      if (saveError) throw saveError;

      setMessage("Integrante guardado correctamente.");
      resetForm();
      await loadMembers();
    } catch (err) {
      console.error("Error al guardar integrante:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el integrante."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteMember(id: string) {
    const confirmed = window.confirm(
      "¿Seguro que querés eliminar este integrante?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("band_members")
      .delete()
      .eq("id", id);

    if (error) {
      setError("No se pudo eliminar el integrante.");
      return;
    }

    if (editingId === id) resetForm();

    setMessage("Integrante eliminado correctamente.");
    await loadMembers();
  }

  async function moveMember(index: number, direction: -1 | 1) {
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= members.length) return;

    const updated = [...members];

    [updated[index], updated[newIndex]] = [
      updated[newIndex],
      updated[index],
    ];

    setMembers(updated);

    const results = await Promise.all(
      updated.map((member, position) =>
        supabase
          .from("band_members")
          .update({ sort_order: position })
          .eq("id", member.id)
      )
    );

    if (results.some((result) => result.error)) {
      setError("No se pudo actualizar el orden.");
      await loadMembers();
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <p className="eyebrow">PANEL DE ADMINISTRACIÓN</p>
          <h1>Gestión de integrantes</h1>
        </div>

        <Link href="/admin/dashboard" className="admin-back-link">
          ← Volver al panel
        </Link>
      </div>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2>{editingId ? "Editar integrante" : "Agregar integrante"}</h2>

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
            Nombre del integrante
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre completo"
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

          <label>
            Fotografía principal
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) =>
                selectPhoto(event.target.files?.[0] || null)
              }
            />
          </label>

          {photoPreview && (
            <div className="admin-editor-image">
              <img src={photoPreview} alt="Fotografía del integrante" />
            </div>
          )}
        </div>
      

      <div className="admin-article-editor">
          <h3>Biografía completa</h3>
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
                        updateAuthor(block.id, event.target.value)
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
                        selectBlockImage(
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
          onClick={saveMember}
          disabled={saving}
        >
          {saving
            ? "Guardando..."
            : editingId
              ? "Guardar cambios"
              : "Crear integrante"}
        </button>
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Integrantes existentes</h2>
        </div>

        {loading ? (
          <p>Cargando integrantes...</p>
        ) : members.length === 0 ? (
          <p>Todavía no hay integrantes cargados.</p>
        ) : (
          <div className="admin-news-list">
            {members.map((member, index) => (
              <div className="admin-news-item" key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <p>
                    {member.status === "published"
                      ? "Publicada"
                      : "Borrador"}
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => moveMember(index, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    onClick={() => moveMember(index, 1)}
                    disabled={index === members.length - 1}
                  >
                    ↓
                  </button>

                  <button
                    type="button"
                    onClick={() => editMember(member)}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteMember(member.id)}
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