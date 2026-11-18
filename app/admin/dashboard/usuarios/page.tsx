import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UsuariosAdminClient from "./UsuariosAdminClient";

export const instant = false;

export default async function UsuariosAdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/admin/login");
  }

  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (
    error ||
    !roles?.some((item) => item.role === "superadmin")
  ) {
    redirect("/admin/dashboard");
  }

  return <UsuariosAdminClient />;
}