"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import UserPosts from "@/app/components/UserPosts";

type Profile = {
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);
      setUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, bio, avatar_url")
        .eq("id", user.id)
        .single();

      if (error) {
        setFeedback("No se pudo cargar tu perfil. Intentá nuevamente.");
      } else {
        const profile = data as Profile;
        setDisplayName(profile.display_name ?? "");
        setBio(profile.bio ?? "");
        setAvatarUrl(profile.avatar_url ?? null);
      }

      setLoading(false);
    }

    void loadProfile();
  }, []);

  async function handleAvatarUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFeedback("La imagen no puede superar los 2 MB.");
      event.target.value = "";
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setFeedback("Formato no válido. Usá JPG, PNG o WebP.");
      event.target.value = "";
      return;
    }

    setFeedback("");

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setFeedback("Tu sesión expiró. Iniciá sesión nuevamente.");
      return;
    }

    const extension =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : "webp";

    const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Error al subir la imagen:", uploadError.message);
      setFeedback("No se pudo subir la imagen. Intentá nuevamente.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("profile-avatars")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error al guardar la foto:", updateError.message);
      setFeedback("La imagen se subió, pero no se pudo guardar en el perfil.");
      return;
    }

    setAvatarUrl(publicUrl);
    setFeedback("¡Tu foto de perfil se actualizó correctamente!");
    event.target.value = "";
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = displayName.trim();
    const cleanBio = bio.trim();

    if (cleanName.length < 2 || cleanName.length > 60) {
      setFeedback("El nombre debe tener entre 2 y 60 caracteres.");
      return;
    }

    if (cleanBio.length > 300) {
      setFeedback("La biografía no puede superar los 300 caracteres.");
      return;
    }

    setSaving(true);
    setFeedback("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFeedback("Tu sesión expiró. Iniciá sesión nuevamente.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: cleanName,
        bio: cleanBio || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("Error al guardar el perfil:", error.message);
      setFeedback("No se pudieron guardar los cambios. Intentá nuevamente.");
    } else {
      setDisplayName(cleanName);
      setBio(cleanBio);
      setFeedback("¡Tu perfil se actualizó correctamente!");
      setEditing(false);
    }

    setSaving(false);
  }

  async function handleLogout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setFeedback("No se pudo cerrar la sesión.");
      return;
    }

    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080706] text-[#d4af37]">
        Cargando perfil...
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080706] px-6">
        <div className="w-full max-w-md rounded-2xl border border-[#d4af37]/20 bg-[#15120a] p-8 text-center">
          <h1 className="mb-4 text-2xl font-semibold text-[#f8f3e5]">
            Mi perfil
          </h1>
          <p className="mb-6 text-sm text-[#a99e83]">
            Iniciá sesión o creá una cuenta para acceder a tu perfil.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-[#d4af37] px-4 py-3 font-semibold text-black"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="rounded-lg border border-[#d4af37]/40 px-4 py-3 text-[#d4af37]"
            >
              Crear cuenta
            </Link>
            <Link href="/" className="mt-2 text-sm text-[#a99e83]">
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080706] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-[#a99e83] transition hover:text-[#d4af37]"
          >
            ← Volver al inicio
          </Link>

          <span className="text-right text-xs tracking-[0.2em] text-[#d4af37]">
            CHARLOTTE WESSELS ARGENTINA
          </span>
        </div>

        {/* Encabezado del perfil */}
        <section className="overflow-hidden rounded-xl border border-[#d4af37]/20 bg-gradient-to-br from-[#19150e] to-[#0d0b08] shadow-xl">
          <div className="h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />

          <div className="p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Foto de perfil"
                    className="h-20 w-20 shrink-0 rounded-full border-2 border-[#d4af37] object-cover sm:h-24 sm:w-24"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-[#d4af37] bg-black/40 text-3xl font-semibold text-[#ffe680] sm:h-24 sm:w-24">
                    {displayName.charAt(0).toUpperCase() || "U"}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="mb-1 text-[10px] tracking-[0.25em] text-[#d4af37]">
                    CHARLOTTE WESSELS ARGENTINA
                  </p>
                  <h1 className="break-words text-2xl font-semibold text-[#f8f3e5] sm:text-3xl">
                    {displayName || "Usuario"}
                  </h1>
                  <p className="mt-1 text-xs text-[#a99e83]">
                    Miembro de la comunidad
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFeedback("");
                    setEditing((current) => !current);
                  }}
                  className="rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffe680]"
                >
                  {editing ? "Cancelar edición" : "Editar perfil"}
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-red-400/30 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-400/10"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>

            <div className="mt-5 border-t border-[#d4af37]/15 pt-4">
              <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-[#d4af37]">
                SOBRE MÍ
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#c1b69e]">
                {bio || "Todavía no agregaste una biografía."}
              </p>
            </div>
          </div>
        </section>

        {/* Formulario de edición */}
        {editing && (
          <section className="mt-6 rounded-2xl border border-[#d4af37]/20 bg-[#15120a] p-5 shadow-xl sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[#f8f3e5]">
                Editar mi perfil
              </h2>
              <p className="mt-2 text-sm text-[#a99e83]">
                Actualizá tu información y tu foto de perfil.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="mb-3 block text-sm text-[#f8f3e5]">
                  Foto de perfil
                </label>

                <div className="flex items-center gap-5">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Foto de perfil"
                      className="h-20 w-20 rounded-full border-2 border-[#d4af37] object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#d4af37] bg-black/40 text-2xl font-semibold text-[#ffe680]">
                      {displayName.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="avatar"
                      className="inline-block cursor-pointer rounded-lg border border-[#d4af37]/40 px-4 py-2 text-sm text-[#d4af37] transition hover:bg-[#d4af37]/10"
                    >
                      Cambiar imagen
                    </label>

                    <input
                      id="avatar"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />

                    <p className="mt-2 text-xs text-[#a99e83]">
                      JPG, PNG o WebP. Máximo 2 MB.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="displayName"
                  className="mb-2 block text-sm text-[#f8f3e5]"
                >
                  Nombre público
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  minLength={2}
                  maxLength={60}
                  required
                  className="w-full rounded-lg border border-[#d4af37]/25 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#d4af37]"
                  placeholder="Tu nombre de usuario"
                />
              </div>

              <div>
                <label
                  htmlFor="bio"
                  className="mb-2 block text-sm text-[#f8f3e5]"
                >
                  Biografía
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  maxLength={300}
                  rows={4}
                  className="w-full resize-y rounded-lg border border-[#d4af37]/25 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#d4af37]"
                  placeholder="Contá algo sobre vos..."
                />
                <p className="mt-2 text-right text-xs text-[#a99e83]">
                  {bio.length}/300 caracteres
                </p>
              </div>

              {feedback && (
                <p role="status" className="text-sm text-[#d4af37]">
                  {feedback}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-[#d4af37] px-4 py-3 font-semibold text-black transition hover:bg-[#ffe680] disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>

                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-[#d4af37]/30 px-5 py-3 text-sm text-[#d4af37] transition hover:bg-[#d4af37]/10"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        )}

        {feedback && !editing && (
          <p role="status" className="mt-4 text-sm text-[#d4af37]">
            {feedback}
          </p>
        )}

        {/* Publicaciones */}
        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs tracking-[0.2em] text-[#d4af37]">
                COMUNIDAD
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-[#f8f3e5]">
                Mis publicaciones
              </h2>
            </div>
          </div>

          <UserPosts
            userId={userId}
            isOwner={true}
            displayName={displayName || "Usuario"}
            avatarUrl={avatarUrl}
          />
        </section>
      </div>
    </main>
  );
}