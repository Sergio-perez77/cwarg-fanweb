"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RoleStars from "@/app/components/RoleStars";

type Signature = {
  id: string;
  user_id: string;
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
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      const supabase = createClient();

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (active && user) {
        setUserId(user.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();

        const name =
          profile?.display_name?.trim() ||
          user.user_metadata?.display_name?.trim() ||
          user.email?.split("@")[0] ||
          "Usuario";

        if (active) setDisplayName(name);
      }

      const { data, error } = await supabase
        .from("member_signatures")
        .select("id, user_id, display_name, message, created_at")
        .eq("member_id", memberId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error al cargar las firmas:", error.message);
      } else if (active) {
        const loadedSignatures = data ?? [];
        setSignatures(loadedSignatures);

        const userIds = [
          ...new Set(
            loadedSignatures
              .map((signature) => signature.user_id)
              .filter((id): id is string => Boolean(id))
          ),
        ];

        if (userIds.length > 0) {
          const { data: rolesData, error: rolesError } = await supabase.rpc(
            "get_public_user_roles",
            { _user_ids: userIds }
          );

          if (rolesError) {
            console.error("Error al cargar distintivos:", rolesError.message);
          } else if (active) {
            const rolesMap: Record<string, string[]> = {};

          for (const item of rolesData ?? []) {
            if (!rolesMap[item.user_id]) {
              rolesMap[item.user_id] = [];
            }

            rolesMap[item.user_id].push(item.role);
          }

            setUserRoles(rolesMap);
          }
        }
      }

      if (active) {
        setLoading(false);
        setAuthLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [memberId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = message.trim();

    if (!userId) {
      setFeedback("Iniciá sesión para poder firmar.");
      return;
    }

    if (displayName.length < 2 || displayName.length > 60) {
      setFeedback("Tu nombre de perfil debe tener entre 2 y 60 caracteres.");
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
        user_id: userId,
        display_name: displayName,
        message: text,
        status: "pending",
      });

    setSending(false);

    if (error) {
      console.error("Error al enviar la firma:", error.message);
      setFeedback("No se pudo enviar la firma. Intentá nuevamente.");
      return;
    }

    setMessage("");
    setFeedback("¡Gracias! Tu firma fue enviada y está pendiente de aprobación.");
  }

  return (
    <section className="member-signatures">
      <h2>Dejá tu firma</h2>
      <p>Compartí un mensaje para este integrante de The Obsession.</p>

      {authLoading ? (
        <p>Verificando tu sesión...</p>
      ) : userId ? (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={displayName}
            readOnly
            aria-label="Nombre de perfil"
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
      ) : (
        <p>
          Para dejar una firma necesitás{" "}
          <a href="/login">iniciar sesión</a> o{" "}
          <a href="/registro">crear una cuenta</a>.
        </p>
      )}

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
              <strong>
                {signature.display_name}
                <RoleStars
                  roles={
                    signature.user_id
                      ? userRoles[signature.user_id] ?? []
                      : []
                  }
                />
              </strong>
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