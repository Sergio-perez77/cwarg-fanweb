import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  image_url: string | null;
  published_at: string | null;
};

type ArticleBlock =
  | {
      id: string;
      type: "paragraph";
      text: string;
    }
  | {
      id: string;
      type: "heading";
      text: string;
    }
  | {
      id: string;
      type: "quote";
      text: string;
      author: string;
    }
  | {
      id: string;
      type: "image";
      image_url: string;
      caption: string;
    };

type Props = {
  params: Promise<{ slug: string }>;
};

function parseArticleContent(content: string): ArticleBlock[] {
  try {
    const parsed: unknown = JSON.parse(content);

    if (Array.isArray(parsed)) {
      return parsed.flatMap((item, index): ArticleBlock[] => {
        if (!item || typeof item !== "object") return [];

        const block = item as Record<string, unknown>;
        const id =
          typeof block.id === "string" ? block.id : `block-${index}`;

        if (block.type === "paragraph" || block.type === "heading") {
          return [
            {
              id,
              type: block.type,
              text: typeof block.text === "string" ? block.text : "",
            },
          ];
        }

        if (block.type === "quote") {
          return [
            {
              id,
              type: "quote",
              text: typeof block.text === "string" ? block.text : "",
              author: typeof block.author === "string" ? block.author : "",
            },
          ];
        }

        if (block.type === "image") {
          return [
            {
              id,
              type: "image",
              image_url:
                typeof block.image_url === "string"
                  ? block.image_url
                  : "",
              caption:
                typeof block.caption === "string" ? block.caption : "",
            },
          ];
        }

        return [];
      });
    }
  } catch {
    // Si es una noticia antigua, se conserva el formato de texto anterior.
  }

  return content
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((paragraph, index) => ({
      id: `legacy-${index}`,
      type: "paragraph" as const,
      text: paragraph,
    }));
}

export default async function NewsDetailPage({ params }: Props) {
  await connection();

  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("news")
    .select("id, title, slug, excerpt, content, image_url, published_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("Error al cargar la noticia:", error.message);
    throw new Error("No se pudo cargar la noticia.");
  }

  if (!data) notFound();

  const news = data as NewsItem;
  const articleBlocks = parseArticleContent(news.content || "");

  return (
    <main className="news-detail-page">
      <div className="news-detail-container">
        <Link href="/" className="news-back-link">
          ← VOLVER A LAS NOTICIAS
        </Link>

        <article className="news-detail">
          <header className="news-detail-header">
            <p className="eyebrow">
              CHARLOTTE WESSELS ARGENTINA · ACTUALIDAD
            </p>

            <h1>{news.title}</h1>

            {news.published_at && (
              <time dateTime={news.published_at}>
                {new Date(news.published_at).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            )}

            {news.excerpt && (
              <p className="news-detail-excerpt">{news.excerpt}</p>
            )}
          </header>

          {news.image_url && (
            <figure className="news-detail-main-image">
              <img src={news.image_url} alt={news.title} />
            </figure>
          )}

          <div className="news-detail-content">
            {articleBlocks.map((block) => {
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
                <figure key={block.id} className="news-detail-inline-image">
                  <img
                    src={block.image_url}
                    alt={block.caption || news.title}
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
