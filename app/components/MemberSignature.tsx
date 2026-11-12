"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Signature = {
  id: string;
  display_name: string;
  message: string;
  created_at: string;
};

type Props = {
  memberId: string;
};

export default function MemberSignatures({ memberId }: Props) {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSignatures() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("member_signatures")
        .select("id, display_name, message, created_at")
        .eq("member_id", memberId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error al cargar las firmas:", error.message);
      } else if (active) {
        setSignatures(data ?? []);
      }

      if (active) setLoading(false);
    }

    void loadSignatures();

    return () => {
      active = false;
    };
  }, [memberId]);

  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = displayName.trim();
    const text = message.trim();

    if (name.length < 2 || name.length > 60) {
      setFeedback("El nombre debe tener entre 2 y 60 caracteres.");
      return;
    }

    if (text.length < 3 || text.length > 1000) {
      setFeedback("El mensaje debe tener entre 3 y 1000 caracteres.");
      return;
    }

    setSending(true);
    setFeedback("");

    const supabase = createClient();

    const { error } = await supabase
      .from("member_signatures")
      .insert({
        member_id: memberId,
        display_name: name,
        message: text,
      });

    setSending(false);

    if (error) {
      console.error("Error al enviar la firma:", error.message);
      setFeedback("No se pudo enviar la firma. Intentá nuevamente.");
      return;
    }

    setDisplayName("");
    setMessage("");
    setFeedback("¡Gracias! Tu firma fue enviada y está pendiente de aprobación.");
  }

  return (
    <section className="member-signatures">
      <h2>Dejá tu firma</h2>
      <p>Compartí un mensaje para este integrante de The Obsession.</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Tu nombre"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          minLength={2}
          maxLength={60}
          required
        />

        <textarea
          placeholder="Escribí tu mensaje..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          minLength={3}
          maxLength={1000}
          rows={4}
          required
        />

        <button type="submit" disabled={sending}>
          {sending ? "Enviando..." : "Enviar firma"}
        </button>
      </form>

      {feedback && <p role="status">{feedback}</p>}

      <div className="member-signatures-list">
        <h3>Firmas</h3>

        {loading ? (
          <p>Cargando firmas...</p>
        ) : signatures.length === 0 ? (
          <p>Todavía no hay firmas aprobadas. ¡Podés ser el primero!</p>
        ) : (
          signatures.map((signature) => (
            <article key={signature.id}>
              <p>{signature.message}</p>
              <strong>{signature.display_name}</strong>
              <time>
                {new Date(signature.created_at).toLocaleDateString("es-AR")}
              </time>
            </article>
          ))
        )}
      </div>
    </section>
  );
}