import { supabase } from "@/lib/supabase";

export async function testSupabaseConnection() {
  const { error } = await supabase
    .from("connection_test")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error de Supabase:", error.message);
    return false;
  }

  console.log("Conexión con Supabase correcta");
  return true;
}