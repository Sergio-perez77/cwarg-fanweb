"use client";

import { useCallback, useEffect, useState } from "react";
import InitialLoader from "@/app/components/InitialLoader";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  published_at: string | null;
};

const supabase = createClient();
export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  const [news, setNews] = useState<NewsItem[]>([]);
const [isNewsLoading, setIsNewsLoading] = useState(true);
const [newsError, setNewsError] = useState(false);

useEffect(() => {
  let isMounted = true;

  async function loadPublishedNews() {
    const { data, error } = await supabase
      .from("news")
      .select("id, title, slug, excerpt, image_url, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3);

    if (!isMounted) return;

    if (error) {
      console.error("Error al cargar noticias:", error.message);
      setNewsError(true);
    } else {
      setNews((data ?? []) as NewsItem[]);
    }

    setIsNewsLoading(false);
  }

  void loadPublishedNews();

  return () => {
    isMounted = false;
  };
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <>
      {isLoading && (
        <InitialLoader onLoadingComplete={handleLoadingComplete} />
      )}

      <div className="site-shell">
        <header className="site-header">
          <a href="#inicio" className="brand">
            <span className="brand-mark">
                <Image
                  src="/logodecarga.png"
                  alt="Charlotte Wessels Argentina"
                  width={55}
                  height={55}
                  className="brand-logo"
                  priority
                />
            </span>
            <span className="brand-name">
              CHARLOTTE WESSELS
              <small>ARGENTINA · FAN COMMUNITY</small>
            </span>
          </a>

          <nav className="main-nav" aria-label="Navegación principal">
            <a href="#inicio">Inicio</a>
            <a href="#noticias">Noticias</a>
            <a href="#musica">Música</a>
            <a href="#multimedia">Multimedia</a>
          </nav>

          <a href="#comunidad" className="header-cta">
            Comunidad <span>↗</span>
          </a>
        </header>

        <main>
          <section className="hero-section" id="inicio">
            <div className="hero-content">
              <p className="eyebrow">
                UN ESPACIO PARA LOS FANS · ARGENTINA
              </p>

              <h1>
                CHARLOTTE
                <span>WESSELS</span>
              </h1>

              <div className="hero-divider" />

              <p className="hero-description">
                Música, arte y emociones.
                <br />
                Un punto de encuentro para quienes conectan con su universo
                musical.
              </p>

              <div className="hero-actions">
                <a href="#musica" className="button-primary">
                  Explorar música <span>↗</span>
                </a>

                <a href="#noticias" className="button-secondary">
                  Últimas novedades
                </a>
              </div>

              <div className="hero-footer">
                <span>CHARLOTTE WESSELS ARGENTINA</span>
                <span>DESDE ARGENTINA, PARA EL MUNDO</span>
              </div>
            </div>

            <div className="hero-decoration" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit orbit-three" />
              <div className="orbit-center">
                <Image
                  src="/logocentral.png"
                  alt="Charlotte Wessels"
                  width={150}
                  height={150}
                  className="central-logo"
                />
                <small>MUSIC · ART · SOUL</small>
              </div>
              <span className="decoration-label">EST. ARGENTINA</span>
            </div>
          </section>

          <section className="intro-section">
            <p className="eyebrow">BIENVENIDOS</p>
            <h2>
              UN UNIVERSO
              <span>QUE NOS CONECTA.</span>
            </h2>
            <p>
              Este espacio nace de la pasión por la música de Charlotte
              Wessels y del deseo de reunir a sus seguidores en Argentina y todo el mundo.
              Noticias, lanzamientos, contenido y una comunidad para compartir
              esa conexión.
            </p>
          </section>

          <section className="content-section" id="noticias">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ACTUALIDAD</p>
                <h2>ÚLTIMAS NOTICIAS</h2>
              </div>
              <span className="section-number">01 / 04</span>
            </div>

            {isNewsLoading ? (
              <div className="empty-content">
                <span className="empty-symbol">✳</span>
                <h3>CARGANDO NOTICIAS</h3>
                <p>Estamos buscando las últimas novedades.</p>
              </div>
            ) : newsError ? (
              <div className="empty-content">
                <span className="empty-symbol">✳</span>
                <h3>NO SE PUDIERON CARGAR LAS NOTICIAS</h3>
                <p>Intentá actualizar la página más tarde.</p>
              </div>
            ) : news.length === 0 ? (
              <div className="empty-content">
                <span className="empty-symbol">✳</span>
                <h3>PRÓXIMAMENTE</h3>
                <p>
                  Este espacio reunirá noticias, novedades y artículos sobre
                  Charlotte Wessels.
                </p>
              </div>
            ) : (
              <div className="news-grid">
                {news.map((item) => (
                    <Link
                      href={`/noticias/${item.slug}`}
                      className="news-card"
                      key={item.id}
                    >
                      {item.image_url && (
                        <div className="news-card-image-container">
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="news-card-image"
                          />
                        </div>
                      )}

                      <div className="news-card-content">
                        {item.published_at && (
                          <span className="news-card-date">
                            {new Date(item.published_at).toLocaleDateString("es-AR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        )}

                        <h3>{item.title}</h3>

                        {item.excerpt && <p>{item.excerpt}</p>}
                      </div>
                    </Link>
                  ))}
            </div>
          )}
          </section>

          <section className="content-section music-section" id="musica">
            <div className="section-heading">
              <div>
                <p className="eyebrow">SU UNIVERSO MUSICAL</p>
                <h2>DISCOGRAFÍA</h2>
              </div>
              <span className="section-number">02 / 04</span>
            </div>

            <div className="empty-content">
              <span className="empty-symbol">♫</span>
              <h3>LA MÚSICA, EN UN SOLO LUGAR</h3>
              <p>
                Próximamente: álbumes, canciones, proyectos y una biblioteca
                musical organizada.
              </p>
            </div>
          </section>

          <section className="content-section" id="multimedia">
            <div className="section-heading">
              <div>
                <p className="eyebrow">EXPERIENCIAS</p>
                <h2>MULTIMEDIA</h2>
              </div>
              <span className="section-number">03 / 04</span>
            </div>

            <div className="empty-content">
              <span className="empty-symbol">▷</span>
              <h3>IMÁGENES, VIDEOS Y MÁS</h3>
              <p>
                Un futuro espacio para explorar contenido multimedia y
                material relacionado con su trayectoria artística.
              </p>
            </div>
          </section>

          <section className="community-section" id="comunidad">
            <p className="eyebrow">CHARLOTTE WESSELS ARGENTINA</p>
            <h2>LA MÚSICA NOS UNE.</h2>
            <p>
              Una comunidad crece cuando las personas comparten lo que las
              emociona.
            </p>
            <span className="community-label">04 / 04 · COMUNIDAD</span>
          </section>
        </main>

        <footer className="site-footer">
          <a href="#inicio" className="footer-brand">
            CHARLOTTE WESSELS <span>ARGENTINA</span>
          </a>

          <p>
            Fan community independiente. Este sitio no representa ni está
            afiliado oficialmente a Charlotte Wessels.
          </p>

          <a href="#inicio" className="back-to-top">
            VOLVER ARRIBA ↑
          </a>
        </footer>
      </div>
    </>
  );
}