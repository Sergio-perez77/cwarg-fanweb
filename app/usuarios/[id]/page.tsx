import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProfileTabs from "./ProfileTabs";

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

  return (
    <main className="min-h-screen bg-[#080706] px-6 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-[#a99e83] transition hover:text-[#d4af37]"
        >
          ← Volver al inicio
        </Link>

        <section className="rounded-2xl border border-[#d4af37]/20 bg-[#15120a] p-8 text-center shadow-2xl">
          <p className="mb-8 text-sm tracking-[0.3em] text-[#d4af37]">
            CHARLOTTE WESSELS ARGENTINA
          </p>

          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={`Foto de perfil de ${displayName}`}
              className="mx-auto mb-5 h-28 w-28 rounded-full border-2 border-[#d4af37] object-cover"
            />
          ) : (
            <div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#d4af37] bg-black/40 text-4xl font-semibold text-[#ffe680]">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <h1 className="text-3xl font-semibold text-[#f8f3e5]">
            {displayName}
          </h1>

          <div className="mx-auto mt-6 max-w-lg border-t border-[#d4af37]/15 pt-6">
            <p className="mb-3 text-xs tracking-widest text-[#d4af37]">
              SOBRE MÍ
            </p>

            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#a99e83]">
              {profile.bio || "Este usuario todavía no agregó una biografía."}
            </p>
          </div>
        </section>
        <ProfileTabs signatures={signatures} />
      </div>
    </main>
  );
}