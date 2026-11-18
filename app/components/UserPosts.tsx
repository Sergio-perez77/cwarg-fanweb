"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import RoleStars from "@/app/components/RoleStars";
import SocialComments from "@/app/components/SocialComments";
import ReactionBar from "@/app/components/ReactionBar";

type UserPost = {
  id: string;
  user_id: string;
  media_url: string;
  media_path: string;
  media_type: "image" | "video";
  caption: string | null;
  created_at: string;
};

type UserPostsProps = {
  userId: string;
  isOwner?: boolean;
  displayName?: string;
  avatarUrl?: string | null;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export default function UserPosts({
  userId,
  isOwner = false,
  displayName = "Usuario",
  avatarUrl = null,
}: UserPostsProps) {
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState("");

  const loadPosts = useCallback(async () => {
  setLoading(true);

  const supabase = createClient();

  const { data, error } = await supabase
    .from("user_posts")
    .select(
      "id, user_id, media_url, media_path, media_type, caption, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al cargar publicaciones:", error.message);
    setFeedback("No se pudieron cargar las publicaciones.");
  } else {
    setPosts((data ?? []) as UserPost[]);
  }

  const { data: rolesData, error: rolesError } = await supabase.rpc(
  "get_public_user_roles",
  { _user_ids: [userId] }
  );

  if (rolesError) {
    console.error("Error al cargar distintivos:", rolesError.message);
    setUserRoles([]);
  } else {
    setUserRoles(
      (rolesData ?? []).map((item: { user_id: string; role: string }) => item.role)
    );
  }

  setLoading(false);
  }, [userId]);

  

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setFeedback("");
    setSelectedFile(null);

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFeedback("Formato no válido. Usá JPG, PNG, WebP, GIF, MP4, WebM o MOV.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFeedback("El archivo no puede superar los 50 MB.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile || !isOwner) return;

    if (caption.trim().length > 500) {
      setFeedback("El texto no puede superar los 500 caracteres.");
      return;
    }

    setUploading(true);
    setFeedback("");

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      setFeedback("Tu sesión no es válida. Iniciá sesión nuevamente.");
      setUploading(false);
      return;
    }

    const extension = selectedFile.name.split(".").pop() || "file";
    const safeFileName = selectedFile.name
      .replace(/\.[^/.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 60);

    const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("user-posts")
      .upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: selectedFile.type,
      });

    if (uploadError) {
      console.error("Error al subir el archivo:", uploadError.message);
      setFeedback("No se pudo subir el archivo. Intentá nuevamente.");
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("user-posts")
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase
      .from("user_posts")
      .insert({
        user_id: user.id,
        media_url: publicUrlData.publicUrl,
        media_path: filePath,
        media_type: selectedFile.type.startsWith("image/")
          ? "image"
          : "video",
        caption: caption.trim() || null,
      });

    if (insertError) {
      console.error("Error al guardar la publicación:", insertError.message);

      await supabase.storage.from("user-posts").remove([filePath]);

      setFeedback("El archivo se subió, pero no se pudo crear la publicación.");
      setUploading(false);
      return;
    }

    setSelectedFile(null);
    setCaption("");

    const fileInput = document.getElementById(
      "post-media"
    ) as HTMLInputElement | null;

    if (fileInput) fileInput.value = "";

    setFeedback("¡Publicación creada correctamente!");

    await loadPosts();
    setUploading(false);
  }

  async function handleDelete(post: UserPost) {
    if (!isOwner) return;

    const confirmed = window.confirm(
      "¿Seguro que querés eliminar esta publicación?"
    );

    if (!confirmed) return;

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      setFeedback("No tenés permiso para eliminar esta publicación.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("user_posts")
      .delete()
      .eq("id", post.id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error al eliminar la publicación:", deleteError.message);
      setFeedback("No se pudo eliminar la publicación.");
      return;
    }

    setPosts((currentPosts) =>
      currentPosts.filter((item) => item.id !== post.id)
    );

    const { error: storageError } = await supabase.storage
      .from("user-posts")
      .remove([post.media_path]);

    if (storageError) {
      console.error("No se pudo eliminar el archivo:", storageError.message);
      setFeedback(
        "La publicación se eliminó, pero no se pudo borrar el archivo multimedia."
      );
    } else {
      setFeedback("Publicación eliminada correctamente.");
    }
  }

  return (
    <div className="space-y-6">
      {isOwner && (
        <form
          onSubmit={handleUpload}
          className="space-y-4 rounded-xl border border-[#d4af37]/20 bg-black/30 p-5"
        >
          <h3 className="text-lg font-semibold text-[#f8f3e5]">
            Crear publicación
          </h3>

          <div>
            <label
              htmlFor="post-media"
              className="mb-2 block text-sm text-[#f8f3e5]"
            >
              Foto o video
            </label>

            <input
              id="post-media"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              onChange={handleFileChange}
              required
              className="block w-full text-sm text-[#a99e83] file:mr-4 file:rounded-lg file:border-0 file:bg-[#d4af37] file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-[#ffe680]"
            />

            <p className="mt-2 text-xs text-[#a99e83]">
              Imágenes y videos. Máximo 50 MB por archivo.
            </p>

            {selectedFile && (
              <p className="mt-2 break-all text-xs text-[#d4af37]">
                Archivo seleccionado: {selectedFile.name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="post-caption"
              className="mb-2 block text-sm text-[#f8f3e5]"
            >
              Texto de la publicación
            </label>

            <textarea
              id="post-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Compartí algo con la comunidad..."
              className="w-full resize-y rounded-lg border border-[#d4af37]/25 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#d4af37]"
            />

            <p className="mt-1 text-right text-xs text-[#a99e83]">
              {caption.length}/500 caracteres
            </p>
          </div>

          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className="w-full rounded-lg bg-[#d4af37] px-4 py-3 font-semibold text-black transition hover:bg-[#ffe680] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Publicando..." : "Publicar"}
          </button>
        </form>
      )}

      {feedback && (
        <p role="status" className="text-sm text-[#d4af37]">
          {feedback}
        </p>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-[#a99e83]">
          Cargando publicaciones...
        </p>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#d4af37]/20 bg-black/20 p-8 text-center">
          <p className="text-sm text-[#a99e83]">
            {isOwner
              ? "Todavía no publicaste nada. ¡Compartí tu primera foto o video!"
              : "Este usuario todavía no tiene publicaciones."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="overflow-hidden rounded-xl border border-[#d4af37]/20 bg-black/30"
            >
              <div className="flex items-center gap-3 p-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full border border-[#d4af37]/50 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d4af37]/50 bg-[#15120a] font-semibold text-[#d4af37]">
                    {displayName.charAt(0).toUpperCase() || "U"}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#f8f3e5]">
                    {displayName}
                    <RoleStars roles={userRoles} />
                  </p>
                  <time className="text-xs text-[#a99e83]">
                    {new Date(post.created_at).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                </div>

                {isOwner && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(post)}
                    className="text-xs text-red-400 transition hover:text-red-300"
                  >
                    Eliminar
                  </button>
                )}
              </div>

              {post.media_type === "image" ? (
                <img
                  src={post.media_url}
                  alt={`Publicación de ${displayName}`}
                  loading="lazy"
                  className="max-h-[600px] w-full bg-black object-contain"
                />
              ) : (
                <video
                  src={post.media_url}
                  controls
                  preload="metadata"
                  className="max-h-[600px] w-full bg-black"
                >
                  Tu navegador no puede reproducir este video.
                </video>
              )}

              {post.caption && (
                <p className="whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-[#f8f3e5]">
                  {post.caption}
                </p>
              )}
               <ReactionBar
                  targetType="user_post"
                  targetId={post.id}
                />

                <SocialComments
                  targetType="user_post"
                  targetId={post.id}
                />
            </article>
           
          ))}
        </div>
      )}
    </div>
  );
}