import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

export const instant = false;

type BiographyBlock =
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "quote"; text: string; author: string }
  | {
      id: string;
      type: "image";
      image_url: string;
      caption: string;
    };

type BandMember = {
  name: string;
  slug: string;
  photo_url: string | null;
  content: BiographyBlock[];
};

type Props = {
  params: Promise<{ slug: string }>;
};

function parseBiographyContent(content: unknown): BiographyBlock[] {
  if (!Array.isArray(content)) return [];

  return content.flatMap((item, index): BiographyBlock[] => {
    if (!item || typeof item !== "object") return [];

    const block = item as Record<string, unknown>;
    const id =
      typeof block.id === "string" ? block.id : `block-${index}`;

    if (block.type === "paragraph" || block.type === "heading") {
      if (typeof block.text !== "string") return [];

      return [{
        id,
        type: block.type,
        text: block.text,
      }];
    }

    if (block.type === "quote") {
      return [{
        id,
        type: "quote",
        text: typeof block.text === "string" ? block.text : "",
        author: typeof block.author === "string" ? block.author : "",
      }];
    }

    if (block.type === "image") {
      return [{
        id,
        type: "image",
        image_url:
          typeof block.image_url === "string" ? block.image_url : "",
        caption:
          typeof block.caption === "string" ? block.caption : "",
      }];
    }

    return [];
  });
}

export default async function MemberDetailPage({ params }: Props) {
  await connection();

  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("band_members")
    .select("name, slug, photo_url, content")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("Error al cargar el integrante:", error.message);
    throw new Error("No se pudo cargar la biografía.");
  }

  if (!data) notFound();

  const member = data as BandMember;
  const biographyBlocks = parseBiographyContent(member.content);

  return (
    <main className="news-detail-page">
      <div className="news-detail-container">
        <Link href="/#biografia" className="news-back-link">
          ← VOLVER A INTEGRANTES
        </Link>

        <article className="news-detail">
          <header className="news-detail-header">
            <p className="eyebrow">
              CHARLOTTE WESSELS ARGENTINA · THE OBSESSION
            </p>

            <h1>{member.name}</h1>
          </header>

          {member.photo_url && (
            <figure className="news-detail-main-image">
              <img src={member.photo_url} alt={member.name} />
            </figure>
          )}

          <div className="news-detail-content">
            {biographyBlocks.map((block) => {
              if (block.type === "paragraph") {
                return (
                  <p key={block.id} className="news-detail-paragraph">
                    {block.text}
                  </p>
                );
              }

              if (block.type === "heading") {
                return (
                  <h2 key={block.id} className="news-detail-heading">
                    {block.text}
                  </h2>
                );
              }

              if (block.type === "quote") {
                return (
                  <blockquote key={block.id} className="news-detail-quote">
                    <p>{block.text}</p>
                    {block.author && <cite>{block.author}</cite>}
                  </blockquote>
                );
              }

              if (!block.image_url) return null;

              return (
                <figure
                  key={block.id}
                  className="news-detail-inline-image"
                >
                  <img
                    src={block.image_url}
                    alt={block.caption || member.name}
                  />

                  {block.caption && (
                    <figcaption>{block.caption}</figcaption>
                  )}
                </figure>
              );
            })}
          </div>
        </article>
      </div>
    </main>
  );
}