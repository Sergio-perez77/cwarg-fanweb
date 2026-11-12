"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Signature = {
  id: string;
  display_name: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  member_name: string;
};

export default function CommentsAdminPage() {
  const supabase = createClient();

  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");

  useEffect(() => {
    loadSignatures();
  }, []);

  async function loadSignatures() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("member_signatures")
      .select(`
        id,
        display_name,
        message,
        status,
        created_at,
        band_members ( name )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al cargar firmas:", error.message);
      setError("No se pudieron cargar las firmas.");
      setSignatures([]);
    } else {
      const formatted = (data ?? []).map((item: any) => ({
        id: item.id,
        display_name: item.display_name,
        message: item.message,
        status: item.status,
        created_at: item.created_at,
        member_name: item.band_members?.name ?? "Integrante desconocido",
      }));

      setSignatures(formatted);
    }

    setLoading(false);
  }

  async function updateStatus(
    id: string,
    status: "approved" | "rejected"
  ) {
    const { error } = await supabase
      .from("member_signatures")
      .update({ status })
      .eq("id", id);

    if (error) {
      setError("No se pudo actualizar el estado de la firma.");
      return;
    }

    setMessage(
      status === "approved"
        ? "Firma aprobada correctamente."
        : "Firma rechazada correctamente."
    );

    await loadSignatures();
  }

  async function deleteSignature(id: string) {
    const confirmed = window.confirm(
      "¿Seguro que querés eliminar esta firma definitivamente?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("member_signatures")
      .delete()
      .eq("id", id);

    if (error) {
      setError("No se pudo eliminar la firma.");
      return;
    }

    setMessage("Firma eliminada correctamente.");
    await loadSignatures();
  }

  const filteredSignatures =
    filter === "all"
      ? signatures
      : signatures.filter((item) => item.status === filter);

    return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <p className="eyebrow">PANEL DE ADMINISTRACIÓN</p>
          <h1>Moderación de firmas</h1>
        </div>

        <Link href="/admin/dashboard" className="admin-back-link">
          ← Volver al panel
        </Link>
      </div>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Firmas recibidas</h2>

          <select
            value={filter}
            onChange={(event) =>
              setFilter(
                event.target.value as
                  | "all"
                  | "pending"
                  | "approved"
                  | "rejected"
              )
            }
          >
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="all">Todas</option>
          </select>
        </div>

        {message && <p className="admin-success">{message}</p>}
        {error && <p className="admin-error">{error}</p>}

        {loading ? (
          <p>Cargando firmas...</p>
        ) : filteredSignatures.length === 0 ? (
          <p>No hay firmas en esta categoría.</p>
        ) : (
          <div className="admin-news-list">
            {filteredSignatures.map((signature) => (
              <article className="admin-news-item" key={signature.id}>
                <div>
                  <p>
                    **{signature.display_name}**
                    {" · "}
                    {signature.member_name}
                  </p>

                  <p>{signature.message}</p>

                  <small>
                    {new Date(signature.created_at).toLocaleDateString("es-AR")}
                    {" · Estado: "}
                    {signature.status}
                  </small>
                </div>

                <div className="admin-actions">
                  {signature.status !== "approved" && (
                    <button
                      onClick={() => updateStatus(signature.id, "approved")}
                    >
                      Aprobar
                    </button>
                  )}

                  {signature.status !== "rejected" && (
                    <button
                      onClick={() => updateStatus(signature.id, "rejected")}
                    >
                      Rechazar
                    </button>
                  )}

                  <button onClick={() => deleteSignature(signature.id)}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}