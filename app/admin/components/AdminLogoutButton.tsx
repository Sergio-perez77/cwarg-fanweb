"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error cerrando sesión:", error.message);
      setLoading(false);
      return;
    }

    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="w-full rounded-lg border border-red-500/20 px-4 py-3 text-left text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
    >
      {loading ? "Cerrando sesión..." : "↪ Cerrar sesión"}
    </button>
  );
}