"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import TurnstileCaptcha from "@/app/components/TurnstileCaptcha";

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRecovery(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!captchaToken) {
      setError("Completá la verificación de seguridad.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: recoveryError } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/actualizar-password`,
            captchaToken,
          }
        );

      if (recoveryError) {
        setError(
          "No se pudo procesar la solicitud. Intentá nuevamente."
        );
        return;
      }

      setSuccess(
        "Si existe una cuenta asociada a ese correo, recibirás un mensaje con las instrucciones para restablecer tu contraseña."
      );

      setEmail("");
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
            CHARLOTTE WESSELS ARGENTINA
          </p>

          <h1 className="text-3xl font-semibold text-[#f8f3e5]">
            Recuperar contraseña
          </h1>

          <p className="mt-3 text-sm text-[#a99e83]">
            Ingresá el correo asociado a tu cuenta y te enviaremos las instrucciones.
          </p>
        </div>

        <form onSubmit={handleRecovery} className="space-y-5">
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

          {success && (
            <p
              role="status"
              className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300"
            >
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="w-full rounded-lg bg-[#d4af37] px-4 py-3 font-semibold text-black transition hover:bg-[#ffe680] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar instrucciones"}
          </button>
        </form>

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