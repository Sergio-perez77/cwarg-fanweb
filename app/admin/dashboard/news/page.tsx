"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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

const emptyForm = {
  title: "",
  excerpt: "",
  content: "",
  image_url: "",
  status: "draft" as "draft" | "published",
};

function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function NewsAdminPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const supabase = createClient();

  async function loadNews() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("news")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError("No se pudieron cargar las noticias: " + error.message);
      setLoading(false);
      return;
    }

    setNews((data ?? []) as NewsItem[]);
    setLoading(false);
  }

  useEffect(() => {
    loadNews();
    // La carga inicial se realiza al abrir el módulo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField(
    field: keyof typeof emptyForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setError("");
    setSelectedFile(null);
  }

  function editNews(item: NewsItem) {
    setEditingId(item.id);

    setSelectedFile(null);

    setForm({
      title: item.title,
      excerpt: item.excerpt ?? "",
      content: item.content,
      image_url: item.image_url ?? "",
      status: item.status,
    });

    setMessage("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveNews(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("La sesión no está activa. Volvé a iniciar sesión.");
      setSaving(false);
      return;
    }

    const slug = createSlug(form.title);

    if (!slug) {
      setError("El título no permite generar un enlace válido.");
      setSaving(false);
      return;
    }

    const publishedAt =
      form.status === "published"
        ? new Date().toISOString()
        : null;

    let uploadedImageUrl = form.image_url.trim() || null;

    if (selectedFile) {
    const extension = selectedFile.name.split(".").pop()?.toLowerCase();

    if (!extension) {
        setError("No se pudo identificar el formato de la imagen.");
        setSaving(false);
        return;
    }

    const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
        .from("news-images")
        .upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: selectedFile.type,
        });

    if (uploadError) {
        setError("Error al subir la imagen: " + uploadError.message);
        setSaving(false);
        return;
    }

    const { data: publicUrlData } = supabase.storage
        .from("news-images")
        .getPublicUrl(filePath);

    uploadedImageUrl = publicUrlData.publicUrl;
    }

    const payload = {
      title: form.title.trim(),
      slug,
      excerpt: form.excerpt.trim() || null,
      content: form.content.trim(),
      image_url: uploadedImageUrl,
      status: form.status,
      updated_at: new Date().toISOString(),
      published_at: publishedAt,
    };

    if (editingId) {
      const { error } = await supabase
        .from("news")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        setError("No se pudo actualizar: " + error.message);
        setSaving(false);
        return;
      }

      setMessage("La noticia se actualizó correctamente.");
    } else {
      const { error } = await supabase
        .from("news")
        .insert({
          ...payload,
          author_id: user.id,
        });

      if (error) {
        setError("No se pudo crear la noticia: " + error.message);
        setSaving(false);
        return;
      }

      setMessage("La noticia se creó correctamente.");
    }

    setForm(emptyForm);
    setEditingId(null);
    await loadNews();
    setSaving(false);
    setSelectedFile(null);
  }

  async function deleteNews(id: string) {
    const confirmed = window.confirm(
      "¿Estás seguro de que querés eliminar esta noticia? Esta acción no se puede deshacer."
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error } = await supabase
      .from("news")
      .delete()
      .eq("id", id);

    if (error) {
      setError("No se pudo eliminar: " + error.message);
      return;
    }

    if (editingId === id) {
      resetForm();
    }

    setMessage("La noticia fue eliminada.");
    await loadNews();
  }

  return (
    <main className="min-h-screen bg-[#080706] px-5 py-8 text-[#f8f3e5] md:px-10">
      <div className="mx-auto max-w-6xl">

        <Link
          href="/admin/dashboard"
          className="text-sm text-[#d4af37] transition hover:text-[#ffe680]"
        >
          ← Volver al dashboard
        </Link>

        <header className="mb-10 mt-8 border-b border-[#d4af37]/20 pb-7">
          <p className="mb-2 text-xs tracking-[0.3em] text-[#d4af37]">
            CHARLOTTE WESSELS ARGENTINA
          </p>

          <h1 className="text-3xl font-semibold">
            Administración de noticias
          </h1>

          <p className="mt-3 text-sm text-[#a99e83]">
            Creá, editá y administrá las publicaciones de la fanweb.
          </p>
        </header>

        {message && (
          <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mb-12 rounded-xl border border-[#d4af37]/20 bg-[#15120a] p-6 md:p-8">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              {editingId ? "Editar noticia" : "Crear noticia"}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-[#a99e83] hover:text-white"
              >
                Cancelar edición
              </button>
            )}
          </div>

          <form onSubmit={saveNews} className="space-y-6">

            <div>
              <label className="mb-2 block text-sm">
                Título *
              </label>

              <input
                type="text"
                required
                maxLength={180}
                value={form.title}
                onChange={(event) =>
                  updateField("title", event.target.value)
                }
                placeholder="Título de la noticia"
                className="w-full rounded-lg border border-[#d4af37]/20 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">
                Resumen
              </label>

              <textarea
                rows={3}
                value={form.excerpt}
                onChange={(event) =>
                  updateField("excerpt", event.target.value)
                }
                placeholder="Breve descripción para la vista previa..."
                className="w-full resize-y rounded-lg border border-[#d4af37]/20 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">
                Contenido completo *
              </label>

              <textarea
                rows={10}
                required
                value={form.content}
                onChange={(event) =>
                  updateField("content", event.target.value)
                }
                placeholder="Escribí el contenido de la noticia..."
                className="w-full resize-y rounded-lg border border-[#d4af37]/20 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#d4af37]"
              />
            </div>

            <div>
                <label className="mb-2 block text-sm">
                    Imagen de la noticia
                </label>

                <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;

                    if (!file) {
                        setSelectedFile(null);
                        return;
                    }

                    if (file.size > 5 * 1024 * 1024) {
                        setError("La imagen no puede superar los 5 MB.");
                        event.target.value = "";
                        setSelectedFile(null);
                        return;
                    }

                    setError("");
                    setSelectedFile(file);
                    }}
                    className="w-full rounded-lg border border-[#d4af37]/20 bg-black/40 px-4 py-3 text-sm text-white file:mr-4 file:rounded-md file:border-0 file:bg-[#d4af37] file:px-4 file:py-2 file:font-semibold file:text-black"
                />

                <p className="mt-2 text-xs text-[#a99e83]">
                    JPG, PNG, WebP o GIF. Tamaño máximo: 5 MB.
                </p>

                {selectedFile && (
                    <p className="mt-3 text-sm text-[#d4af37]">
                    Archivo seleccionado: {selectedFile.name}
                    </p>
                )}

                {!selectedFile && form.image_url && (
                    <div className="mt-4">
                    <p className="mb-2 text-xs text-[#a99e83]">
                        Imagen actual
                    </p>
                    <img
                        src={form.image_url}
                        alt="Imagen actual de la noticia"
                        className="max-h-48 rounded-lg object-cover"
                    />
                    </div>
                )}
            </div>

            <div>
              <label className="mb-2 block text-sm">
                Estado de publicación
              </label>

              <select
                value={form.status}
                onChange={(event) =>
                  updateField(
                    "status",
                    event.target.value as "draft" | "published"
                  )
                }
                className="w-full rounded-lg border border-[#d4af37]/20 bg-[#080706] px-4 py-3 text-white outline-none focus:border-[#d4af37]"
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicada</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#d4af37] px-6 py-3 font-semibold text-black transition hover:bg-[#ffe680] disabled:opacity-50"
            >
              {saving
                ? "Guardando..."
                : editingId
                  ? "Guardar cambios"
                  : "Crear noticia"}
            </button>
          </form>
        </section>

        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              Noticias existentes
            </h2>

            <span className="text-sm text-[#a99e83]">
              {news.length} publicaciones
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-[#a99e83]">
              Cargando noticias...
            </p>
          ) : news.length === 0 ? (
            <div className="rounded-xl border border-[#d4af37]/15 bg-[#100e09] p-8 text-center">
              <p className="text-[#a99e83]">
                Todavía no hay noticias creadas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {news.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-5 rounded-xl border border-[#d4af37]/15 bg-[#100e09] p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold">
                        {item.title}
                      </h3>

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          item.status === "published"
                            ? "bg-green-500/10 text-green-300"
                            : "bg-yellow-500/10 text-yellow-300"
                        }`}
                      >
                        {item.status === "published"
                          ? "Publicada"
                          : "Borrador"}
                      </span>
                    </div>

                    <p className="text-sm text-[#a99e83]">
                      {item.excerpt || "Sin resumen"}
                    </p>

                    <p className="mt-2 text-xs text-[#766b54]">
                      {new Date(item.created_at).toLocaleDateString("es-AR")}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => editNews(item)}
                      className="rounded-lg border border-[#d4af37]/30 px-4 py-2 text-sm text-[#d4af37] hover:bg-[#d4af37]/10"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteNews(item.id)}
                      className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}