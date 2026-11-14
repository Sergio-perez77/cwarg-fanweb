"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import TurnstileCaptcha from "@/app/components/TurnstileCaptcha";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!captchaToken) {
      setError("Completá la verificación de seguridad.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
          options: {
            captchaToken,
          },
        });

      if (loginError || !data.user) {
        setError(
          "No se pudo iniciar sesión. Revisá tus datos y confirmá tu correo."
        );
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Ocurrió un error. Intentá nuevamente.");
    } finally {
      setLoading(false);
      setCaptchaToken("");
      setCaptchaKey((current) => current + 1);
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
            Iniciar sesión
          </h1>

          <p className="mt-3 text-sm text-[#a99e83]">
            Ingresá a tu cuenta de la comunidad.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm text-[#f8f3e5]"
            >
              Correo electrónico
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-[#d4af37]/25 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#d4af37]"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm text-[#f8f3e5]"
            >
              Contraseña
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-[#d4af37]/25 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#d4af37]"
              placeholder="Tu contraseña"
            />
          </div>

          <div className="flex justify-center">
            <TurnstileCaptcha
              key={captchaKey}
              onVerify={setCaptchaToken}
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
            disabled={loading || !captchaToken}
            className="w-full rounded-lg bg-[#d4af37] px-4 py-3 font-semibold text-black transition hover:bg-[#ffe680] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#a99e83]">
          ¿Todavía no tenés cuenta?{" "}
          <Link
            href="/registro"
            className="text-[#d4af37] hover:text-[#ffe680]"
          >
            Registrate
          </Link>
        </p>
      </div>
    </main>
  );
}