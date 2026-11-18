"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const EMOJIS = ["😍", "🤩", "🥳", "🤯", "😭", "🖤", "🦢"] as const;

type Emoji = (typeof EMOJIS)[number];

type Reaction = {
  id: string;
  user_id: string;
  emoji: Emoji;
};

type ReactionBarProps = {
  targetType: "user_post" | "signature" | "news" | "comment";
  targetId: string;
};

export default function ReactionBar({
  targetType,
  targetId,
}: ReactionBarProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [showReactors, setShowReactors] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const loadReactions = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUserId(user?.id ?? null);

    const { data, error } = await supabase
      .from("social_reactions")
      .select("id, user_id, emoji")
      .eq("target_type", targetType)
      .eq("target_id", targetId);

    if (error) {
      console.error("Error al cargar reacciones:", error.message);
      setFeedback("No se pudieron cargar las reacciones.");
      setLoading(false);
      return;
    }

    const items = (data ?? []) as Reaction[];
    setReactions(items);

    const userIds = [...new Set(items.map((item) => item.user_id))];

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error al cargar autores:", profilesError.message);
      } else {
        const profileNames: Record<string, string> = {};

        (profiles ?? []).forEach(
          (profile: { id: string; display_name: string | null }) => {
            profileNames[profile.id] = profile.display_name || "Usuario";
          }
        );

        setNames(profileNames);
      }
    } else {
      setNames({});
    }

    setLoading(false);
  }, [targetType, targetId]);

  useEffect(() => {
    void loadReactions();
  }, [loadReactions]);

  async function toggleReaction(emoji: Emoji) {
    if (!currentUserId || saving) return;

    setSaving(true);
    setFeedback("");

    const supabase = createClient();

    const existing = reactions.find(
      (reaction) => reaction.user_id === currentUserId
    );

    let error;

    if (existing?.emoji === emoji) {
      const result = await supabase
        .from("social_reactions")
        .delete()
        .eq("user_id", currentUserId)
        .eq("target_type", targetType)
        .eq("target_id", targetId);

      error = result.error;
    } else {
      const result = await supabase
        .from("social_reactions")
        .upsert(
          {
            user_id: currentUserId,
            target_type: targetType,
            target_id: targetId,
            emoji,
          },
          {
            onConflict: "user_id,target_type,target_id",
          }
        );

      error = result.error;
    }

    if (error) {
      console.error("Error al guardar reacción:", error.message);
      setFeedback(
        "No se pudo guardar la reacción. Verificá tu sesión y tus permisos."
      );
    } else {
      await loadReactions();
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="px-4 py-2 text-xs text-[#a99e83]">
        Cargando reacciones...
      </div>
    );
  }

  const currentReaction = reactions.find(
    (reaction) => reaction.user_id === currentUserId
  );

  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {EMOJIS.map((emoji) => {
          const count = reactions.filter(
            (reaction) => reaction.emoji === emoji
          ).length;

          const selected = currentReaction?.emoji === emoji;

          return (
            <button
              key={emoji}
              type="button"
              disabled={!currentUserId || saving}
              onClick={() => void toggleReaction(emoji)}
              title={
                currentUserId
                  ? `Reaccionar con ${emoji}`
                  : "Iniciá sesión para reaccionar"
              }
              className={`flex items-center gap-1 rounded-full border px-2 py-1 text-sm transition ${
                selected
                  ? "border-[#d4af37] bg-[#d4af37]/20"
                  : "border-[#d4af37]/15 bg-black/20 hover:border-[#d4af37]/50"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span>{emoji}</span>
              {count > 0 && (
                <span className="text-xs text-[#f8f3e5]">{count}</span>
              )}
            </button>
          );
        })}

        {reactions.length > 0 && (
          <button
            type="button"
            onClick={() => setShowReactors((current) => !current)}
            className="text-xs text-[#a99e83] hover:text-[#d4af37]"
          >
            {showReactors ? "Ocultar" : "Ver quién reaccionó"}
          </button>
        )}
      </div>

      {showReactors && (
        <div className="rounded-lg border border-[#d4af37]/15 bg-black/30 p-3">
          <p className="mb-2 text-xs font-semibold text-[#d4af37]">
            Reacciones de la comunidad
          </p>

          <div className="space-y-1">
            {EMOJIS.map((emoji) => {
              const users = reactions.filter(
                (reaction) => reaction.emoji === emoji
              );

              if (users.length === 0) return null;

              return (
                <p
                  key={emoji}
                  className="text-xs text-[#f8f3e5]"
                >
                  {emoji}{" "}
                  {users.map((reaction) => (
                    <span key={reaction.id} className="mr-1">
                      {names[reaction.user_id] || "Usuario"}
                    </span>
                  ))}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {feedback && (
        <p role="status" className="text-xs text-red-400">
          {feedback}
        </p>
      )}
    </div>
  );
}