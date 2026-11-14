"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ActualizarPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") &&
        session
      ) {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleUpdate(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        setError(
          "No se pudo actualizar la contraseña. Volvé a solicitar el enlace de recuperación."
        );
        return;
      }

      setSuccess("Tu contraseña fue actualizada correctamente.");

      await supabase.auth.signOut();

      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 2000);
    } catch {
      setError("Ocurrió un error. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#080706] px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[#d4af37]/20 bg-[#15120a] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <p className="mb-3 text-sm tracking-[0.35em] text-[#d4af37]">
            CHARLOTTE WESSELS
          </p>

          <h1 className="text-3xl font-semibold text-[#f8f3e5]">
            Nueva contraseña
          </h1>

          <p className="mt-3 text-sm text-[#a99e83]">
            Elegí una contraseña nueva para tu cuenta.
          </p>
        </div>

        {!ready && !success && (
          <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
            Estamos verificando el enlace de recuperación. Si no funciona, solicitá uno nuevo.
          </p>
        )}

        {ready && !success && (
          <form onSubmit={handleUpdate} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm text-[#f8f3e5]"
              >
                Nueva contraseña
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-[#d4af37]/25 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#d4af37]"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm text-[#f8f3e5]"
              >
                Confirmar contraseña
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-[#d4af37]/25 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#d4af37]"
                placeholder="Repetí la contraseña"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#d4af37] px-4 py-3 font-semibold text-black transition hover:bg-[#ffe680] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Actualizando..." : "Guardar contraseña"}
            </button>
          </form>
        )}

        {success && (
          <p
            role="status"
            className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300"
          >
            {success} Serás redirigido al inicio de sesión.
          </p>
        )}

        <p className="mt-8 text-center text-sm text-[#a99e83]">
          <Link
            href="/login"
            className="text-[#d4af37] hover:text-[#ffe680]"
          >
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </main>
  );
}