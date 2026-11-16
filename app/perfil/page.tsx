"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();

      const { data: { user }, error: authError } =
        await supabase.auth.getUser();

      if (authError || !user) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

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
      }

      setLoading(false);
    }

    void loadProfile();
  }, []);

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

    const { data: { user } } = await supabase.auth.getUser();

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
      setFeedback("¡Tu perfil se actualizó correctamente!");
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
      <main className="min-h-screen flex items-center justify-center bg-[#080706] text-[#d4af37]">
        Cargando perfil...
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#080706] px-6">
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
    <main className="min-h-screen bg-[#080706] px-6 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-[#a99e83] hover:text-[#d4af37]"
        >
          ← Volver al inicio
        </Link>

        <section className="rounded-2xl border border-[#d4af37]/20 bg-[#15120a] p-8 shadow-2xl">
          <div className="mb-8">
            <p className="mb-3 text-sm tracking-[0.3em] text-[#d4af37]">
              CHARLOTTE WESSELS ARGENTINA
            </p>
            <h1 className="text-3xl font-semibold text-[#f8f3e5]">
              Mi perfil
            </h1>
            <p className="mt-3 text-sm text-[#a99e83]">
              Personalizá cómo te ve el resto de la comunidad.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
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
                rows={5}
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

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-[#d4af37] px-4 py-3 font-semibold text-black transition hover:bg-[#ffe680] disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>

          <div className="mt-8 border-t border-[#d4af37]/15 pt-6">
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-red-400 transition hover:text-red-300"
            >
              Cerrar sesión
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}