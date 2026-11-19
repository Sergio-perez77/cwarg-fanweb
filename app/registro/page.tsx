"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import TurnstileCaptcha from "@/app/components/TurnstileCaptcha";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (cleanName.length < 2 || cleanName.length > 60) {
      setError("El nombre debe tener entre 2 y 60 caracteres.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!captchaToken) {
      setError("Completá la verificación de seguridad.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: registerError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            captchaToken,
            data: {
              display_name: cleanName,
            },
          },
        });

      if (registerError) {
        console.error("Error de registro:", registerError);
        setError(
          "No se pudo completar el registro. Revisá los datos e intentá nuevamente."
        );
        return;
      }

      setSuccess(
        "¡Registro realizado! Revisá tu correo electrónico y confirmá tu cuenta desde el enlace que te enviamos."
      );

      setPendingEmail(cleanEmail);

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Error inesperado:", err);
      setError("Ocurrió un error. Intentá nuevamente.");
    } finally {
      setLoading(false);
      setCaptchaToken("");
      setCaptchaKey((current) => current + 1);
    }
  }

  async function handleResendConfirmation() {
  if (!pendingEmail) return;

  setResendMessage("");
  setLoading(true);

  try {
    const supabase = createClient();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
    });

    if (error) {
      setResendMessage(
        "No se pudo reenviar el correo. Intentá nuevamente."
      );
      return;
    }

    setResendMessage(
      "¡Nuevo correo enviado! Revisá tu bandeja de entrada."
    );
    } catch {
      setResendMessage("Ocurrió un error al reenviar el correo.");
    } finally {
      setLoading(false);
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
            Crear cuenta
          </h1>

          <p className="mt-3 text-sm text-[#a99e83]">
            Unite a nuestra comunidad.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm text-[#f8f3e5]">
              Nombre de usuario
            </label>

            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={60}
              autoComplete="nickname"
              className="w-full rounded-lg border border-[#d4af37]/25 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#d4af37]"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm text-[#f8f3e5]">
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
            <label htmlFor="password" className="mb-2 block text-sm text-[#f8f3e5]">
              Contraseña
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
            <label htmlFor="confirmPassword" className="mb-2 block text-sm text-[#f8f3e5]">
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
              placeholder="Repetí tu contraseña"
            />
          </div>

          <div className="flex justify-center">
            <TurnstileCaptcha
              key={captchaKey}
              onVerify={setCaptchaToken}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {success && (
            <div className="space-y-3">
              <p role="status" className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
                {success}
              </p>

              {pendingEmail && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={loading}
                  className="w-full rounded-lg border border-[#d4af37]/40 px-4 py-3 text-sm text-[#d4af37] hover:bg-[#d4af37]/10 disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Reenviar correo de confirmación"}
                </button>
              )}

              {resendMessage && (
                <p role="status" className="text-sm text-[#d4af37]">
                  {resendMessage}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="w-full rounded-lg bg-[#d4af37] px-4 py-3 font-semibold text-black transition hover:bg-[#ffe680] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#a99e83]">
          ¿Ya tenés una cuenta?{" "}
          <Link href="/login" className="text-[#d4af37] hover:text-[#ffe680]">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}