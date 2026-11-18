import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProfileTabs from "./ProfileTabs";
import RoleStars from "@/app/components/RoleStars";

export const instant = false;

type PublicProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default async function PublicUserProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const isOwner = currentUser?.id === id;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error al cargar el perfil público:", error.message);
    notFound();
  }

  if (!data) {
    notFound();
  }

  const { data: signatureData } = await supabase
    .from("member_signatures")
    .select(`
      id,
      display_name,
      message,
      created_at,
      band_members ( name )
    `)
    .eq("user_id", id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const signatures = (signatureData ?? []).map((item: any) => ({
    id: item.id,
    display_name: item.display_name,
    message: item.message,
    created_at: item.created_at,
    member_name: item.band_members?.name ?? "Integrante",
  }));

  const profile = data as PublicProfile;
  const displayName = profile.display_name || "Usuario";
  const { data: rolesData, error: rolesError } = await supabase.rpc(
  "get_public_user_roles",
  { _user_ids: [id] }
);

if (rolesError) {
  console.error("Error al cargar roles del perfil:", rolesError.message);
}

const userRoles = (rolesData ?? []).map(
  (item: { user_id: string; role: string }) => item.role
);

  return (
    <main className="min-h-screen bg-[#080706] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
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

        {/* Encabezado del perfil público */}
        <section className="overflow-hidden rounded-xl border border-[#d4af37]/20 bg-gradient-to-br from-[#19150e] to-[#0d0b08] shadow-xl">
          <div className="h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />

          <div className="p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={`Foto de perfil de ${displayName}`}
                    className="h-20 w-20 shrink-0 rounded-full border-2 border-[#d4af37] object-cover sm:h-24 sm:w-24"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-[#d4af37] bg-black/40 text-3xl font-semibold text-[#ffe680] sm:h-24 sm:w-24">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="mb-1 text-[10px] tracking-[0.25em] text-[#d4af37]">
                    CHARLOTTE WESSELS ARGENTINA
                  </p>

                  <h1 className="break-words text-2xl font-semibold text-[#f8f3e5] sm:text-3xl">
                    {displayName}
                    <RoleStars roles={userRoles} />
                  </h1>

                  <p className="mt-1 text-xs text-[#a99e83]">
                    Miembro de la comunidad
                  </p>
                </div>
              </div>

              {isOwner && (
                <Link
                  href="/perfil"
                  className="inline-flex w-fit items-center justify-center rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffe680]"
                >
                  Editar perfil
                </Link>
              )}
            </div>

            <div className="mt-5 border-t border-[#d4af37]/15 pt-4">
              <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-[#d4af37]">
                SOBRE MÍ
              </p>

              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#c1b69e]">
                {profile.bio || "Este usuario todavía no agregó una biografía."}
              </p>
            </div>
          </div>
        </section>

        <ProfileTabs
          signatures={signatures}
          userId={profile.id}
          displayName={displayName}
          avatarUrl={profile.avatar_url}
          isOwner={isOwner}
        />
      </div>
    </main>
  );
}