import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SancionesAdminClient from "./SancionesAdminClient";

export const instant = false;

export default async function SancionesAdminPage() {
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

  const hasAccess = roles?.some(
    (item) =>
      item.role === "admin" ||
      item.role === "superadmin"
  );

  if (error || !hasAccess) {
    redirect("/admin/dashboard");
  }

  return (
    <SancionesAdminClient
        isSuperAdmin={roles.some((item) => item.role === "superadmin")}
    />
    );
}