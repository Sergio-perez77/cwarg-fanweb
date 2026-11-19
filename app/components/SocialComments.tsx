"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RoleStars from "@/app/components/RoleStars";
import ReactionBar from "@/app/components/ReactionBar";

type SocialComment = {
  id: string;
  user_id: string;
  target_type: string;
  target_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

type CommentProfile = {
  display_name: string | null;
};

type SocialCommentsProps = {
  targetType: "user_post" | "signature" | "news";
  targetId: string;
};

type CommentItem = SocialComment & {
  displayName: string;
  roles: string[];
  replies: CommentItem[];
};

const MAX_LENGTH = 2000;

export default function SocialComments({
  targetType,
  targetId,
}: SocialCommentsProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");

  const loadComments = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUserId(user?.id ?? null);

    const { data, error } = await supabase
      .from("social_comments")
      .select(
        "id, user_id, target_type, target_id, body, created_at, updated_at"
      )
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error al cargar comentarios:", error.message);
      setFeedback("No se pudieron cargar los comentarios.");
      setLoading(false);
      return;
    }

    const mainComments = (data ?? []) as SocialComment[];
    const mainIds = mainComments.map((comment) => comment.id);

    let replies: SocialComment[] = [];

    if (mainIds.length > 0) {
      const { data: repliesData, error: repliesError } = await supabase
        .from("social_comments")
        .select(
          "id, user_id, target_type, target_id, body, created_at, updated_at"
        )
        .eq("target_type", "comment")
        .in("target_id", mainIds)
        .order("created_at", { ascending: true });

      if (repliesError) {
        console.error("Error al cargar respuestas:", repliesError.message);
      } else {
        replies = (repliesData ?? []) as SocialComment[];
      }
    }

    const allComments = [...mainComments, ...replies];
    const userIds = [...new Set(allComments.map((comment) => comment.user_id))];

    const profileMap: Record<string, string> = {};
    const rolesMap: Record<string, string[]> = {};

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error al cargar autores:", profilesError.message);
      } else {
        (profiles ?? []).forEach(
          (profile: { id: string; display_name: string | null }) => {
            profileMap[profile.id] = profile.display_name || "Usuario";
          }
        );
      }

      const { data: roles, error: rolesError } = await supabase.rpc(
        "get_public_user_roles",
        { _user_ids: userIds }
      );

      if (rolesError) {
        console.error("Error al cargar roles:", rolesError.message);
      } else {
        (roles ?? []).forEach(
          (item: { user_id: string; role: string }) => {
            rolesMap[item.user_id] ??= [];
            rolesMap[item.user_id].push(item.role);
          }
        );
      }
    }

    const repliesByParent: Record<string, CommentItem[]> = {};

    replies.forEach((reply) => {
      repliesByParent[reply.target_id] ??= [];
      repliesByParent[reply.target_id].push({
        ...reply,
        displayName: profileMap[reply.user_id] || "Usuario",
        roles: rolesMap[reply.user_id] || [],
        replies: [],
      });
    });

    const formatted = mainComments.map((comment) => ({
      ...comment,
      displayName: profileMap[comment.user_id] || "Usuario",
      roles: rolesMap[comment.user_id] || [],
      replies: repliesByParent[comment.id] || [],
    }));

    setComments(formatted);
    setLoading(false);
  }, [targetType, targetId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function submitComment(
    event: React.FormEvent<HTMLFormElement>,
    parentId?: string
  ) {
    event.preventDefault();

    const body = parentId
      ? replyDrafts[parentId] || ""
      : draft;

    if (!body.trim() || body.trim().length > MAX_LENGTH) return;

    const supabase = createClient();

    setSending(true);
    setFeedback("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setFeedback("Iniciá sesión para comentar.");
      setSending(false);
      return;
    }

    const { error } = await supabase.from("social_comments").insert({
      user_id: user.id,
      target_type: parentId ? "comment" : targetType,
      target_id: parentId || targetId,
      body: body.trim(),
    });

    if (error) {
      console.error("Error al publicar comentario:", error.message);
      setFeedback(
        error.message.includes("restricted")
          ? "Tu cuenta tiene una restricción activa para comentar."
          : "No se pudo publicar. Revisá tu sesión o tus permisos."
      );
      setSending(false);
      return;
    }

    if (parentId) {
      setReplyDrafts((current) => ({ ...current, [parentId]: "" }));
      setReplyingTo(null);
    } else {
      setDraft("");
    }

    await loadComments();
    setSending(false);
  }

  async function saveEdit(commentId: string) {
    if (!editDraft.trim() || editDraft.trim().length > MAX_LENGTH) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("social_comments")
      .update({ body: editDraft.trim() })
      .eq("id", commentId)
      .eq("user_id", currentUserId);

    if (error) {
      console.error("Error al editar comentario:", error.message);
      setFeedback("No se pudo editar el comentario.");
      return;
    }

    setEditingId(null);
    setEditDraft("");
    await loadComments();
  }

  async function deleteComment(commentId: string) {
    if (!window.confirm("¿Seguro que querés eliminar este comentario?")) {
      return;
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("social_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error("Error al eliminar comentario:", error.message);
      setFeedback("No se pudo eliminar el comentario.");
      return;
    }

    await loadComments();
  }

  function renderComment(comment: CommentItem, isReply = false) {
    const isAuthor = currentUserId === comment.user_id;

    return (
      <div
        key={comment.id}
        className={`${isReply ? "ml-5 border-l border-[#d4af37]/20 pl-4" : ""} space-y-3`}
      >
        <div className="rounded-lg bg-black/30 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#f8f3e5]">
              {comment.displayName}
              <RoleStars roles={comment.roles} />
            </span>

            <time className="text-xs text-[#a99e83]">
              {new Date(comment.created_at).toLocaleDateString("es-AR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </time>
          </div>

          {editingId === comment.id ? (
            <div className="space-y-2">
              <textarea
                value={editDraft}
                onChange={(event) => setEditDraft(event.target.value)}
                maxLength={MAX_LENGTH}
                rows={3}
                className="w-full rounded-lg border border-[#d4af37]/30 bg-black/40 p-3 text-sm text-white outline-none focus:border-[#d4af37]"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void saveEdit(comment.id)}
                  className="text-xs font-semibold text-[#d4af37]"
                >
                  Guardar
                </button>

                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-xs text-[#a99e83]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#f8f3e5]">
                {comment.body}
              </p>

              <ReactionBar
                targetType="comment"
                targetId={comment.id}
              />
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-4">
            {isAuthor && editingId !== comment.id && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(comment.id);
                  setEditDraft(comment.body);
                }}
                className="text-xs text-[#d4af37]"
              >
                Editar
              </button>
            )}

            {(isAuthor || !isReply) && (
              <button
                type="button"
                onClick={() => void deleteComment(comment.id)}
                className="text-xs text-red-400"
              >
                Eliminar
              </button>
            )}

            {!isReply && currentUserId && (
              <button
                type="button"
                onClick={() =>
                  setReplyingTo(
                    replyingTo === comment.id ? null : comment.id
                  )
                }
                className="text-xs text-[#a99e83] hover:text-[#d4af37]"
              >
                Responder
              </button>
            )}
          </div>
        </div>

        {replyingTo === comment.id && (
          <form
            onSubmit={(event) => void submitComment(event, comment.id)}
            className="space-y-2"
          >
            <textarea
              value={replyDrafts[comment.id] || ""}
              onChange={(event) =>
                setReplyDrafts((current) => ({
                  ...current,
                  [comment.id]: event.target.value,
                }))
              }
              maxLength={MAX_LENGTH}
              rows={2}
              placeholder="Escribí una respuesta..."
              className="w-full rounded-lg border border-[#d4af37]/25 bg-black/40 p-3 text-sm text-white outline-none focus:border-[#d4af37]"
            />

            <button
              type="submit"
              disabled={sending || !(replyDrafts[comment.id] || "").trim()}
              className="rounded-lg bg-[#d4af37] px-4 py-2 text-xs font-semibold text-black disabled:opacity-50"
            >
              Responder
            </button>
          </form>
        )}

        {comment.replies.length > 0 && (
          <div className="space-y-3">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-4 border-t border-[#d4af37]/15 p-4">
      <h4 className="text-sm font-semibold text-[#f8f3e5]">
        Comentarios ({comments.length})
      </h4>

      {currentUserId ? (
        <form
          onSubmit={(event) => void submitComment(event)}
          className="space-y-2"
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={MAX_LENGTH}
            rows={2}
            placeholder="Escribí un comentario..."
            className="w-full rounded-lg border border-[#d4af37]/25 bg-black/40 p-3 text-sm text-white outline-none focus:border-[#d4af37]"
          />

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[#a99e83]">
              {draft.length}/{MAX_LENGTH}
            </span>

            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="rounded-lg bg-[#d4af37] px-4 py-2 text-xs font-semibold text-black disabled:opacity-50"
            >
              {sending ? "Enviando..." : "Comentar"}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-[#a99e83]">
          Iniciá sesión para participar en los comentarios.
        </p>
      )}

      {feedback && (
        <p role="status" className="text-xs text-red-400">
          {feedback}
        </p>
      )}

      {loading ? (
        <p className="text-xs text-[#a99e83]">Cargando comentarios...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-[#a99e83]">
          Todavía no hay comentarios. ¡Sé el primero en participar!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => renderComment(comment))}
        </div>
      )}
    </section>
  );
}