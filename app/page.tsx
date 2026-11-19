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

type BandMemberPublic = {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
};

const supabase = createClient();
export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  const [news, setNews] = useState<NewsItem[]>([]);
const [isNewsLoading, setIsNewsLoading] = useState(true);
const [newsError, setNewsError] = useState(false);

const [members, setMembers] = useState<BandMemberPublic[]>([]);
const [isMembersLoading, setIsMembersLoading] = useState(true);
const [membersError, setMembersError] = useState(false);

const [currentUser, setCurrentUser] = useState<{
  id: string;
  displayName: string;
  avatarUrl: string | null;
} | null>(null);

const [authLoading, setAuthLoading] = useState(true);
const [canAccessAdmin, setCanAccessAdmin] = useState(false);
const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
const [userSearch, setUserSearch] = useState("");
const [userResults, setUserResults] = useState<
  { id: string; display_name: string | null; avatar_url: string | null }[]
>([]);
const [isSearchingUsers, setIsSearchingUsers] = useState(false);

useEffect(() => {
  let isMounted = true;

  async function loadCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      if (isMounted) {
        setCurrentUser(null);
        setAuthLoading(false);
      }
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

      const { data: rolesData, error: rolesError } = await supabase.rpc(
        "get_public_user_roles",
        { _user_ids: [user.id] }
      );

      if (rolesError) {
        console.error("Error al consultar permisos:", rolesError.message);
        setCanAccessAdmin(false);
      } else {
        const hasAdminRole = (rolesData ?? []).some(
          (item: { user_id: string; role: string }) =>
            item.user_id === user.id &&
            (item.role === "admin" || item.role === "superadmin")
        );

        setCanAccessAdmin(hasAdminRole);
      }

    if (isMounted) {
      setCurrentUser({
        id: user.id,
        displayName:
          profile?.display_name ||
          user.user_metadata?.display_name ||
          user.email?.split("@")[0] ||
          "Usuario",
        avatarUrl: profile?.avatar_url || null,
      });

      setAuthLoading(false);
    }
  }

  void loadCurrentUser();

  return () => {
    isMounted = false;
  };
}, []);

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

  useEffect(() => {
  let isMounted = true;

    async function loadPublishedMembers() {
      const { data, error } = await supabase
        .from("band_members")
        .select("id, name, slug, photo_url")
        .eq("status", "published")
        .order("sort_order", { ascending: true });

      if (!isMounted) return;

      if (error) {
        console.error("Error al cargar integrantes:", error.message);
        setMembersError(true);
      } else {
        setMembers((data ?? []) as BandMemberPublic[]);
      }

      setIsMembersLoading(false);
    }

    void loadPublishedMembers();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
  const search = userSearch.trim();

  if (search.length < 2 || !currentUser) {
    setUserResults([]);
    setIsSearchingUsers(false);
    return;
  }

  let isMounted = true;

  async function searchUsers() {
    setIsSearchingUsers(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .ilike("display_name", `%${search}%`)
      .neq("id", currentUser!.id)
      .limit(8);

    if (!isMounted) return;

    if (error) {
      console.error("Error al buscar usuarios:", error.message);
      setUserResults([]);
    } else {
      setUserResults(data ?? []);
    }

    setIsSearchingUsers(false);
  }

  const timeout = setTimeout(() => {
    void searchUsers();
  }, 300);

  return () => {
    isMounted = false;
    clearTimeout(timeout);
  };
}, [userSearch, currentUser]);

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
            <a href="#biografia">Biografía</a>
            <a href="#noticias">Noticias</a>
            <Link href="/discografia">Discografía</Link>
            <a href="#multimedia">Multimedia</a>
          </nav>

          {!authLoading && (
            currentUser ? (
              <div className="user-menu-container">
                <button
                  type="button"
                  className="user-menu-trigger"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-expanded={isUserMenuOpen}
                >
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt="Foto de perfil"
                      className="user-menu-avatar"
                    />
                  ) : (
                    <div className="user-menu-avatar user-menu-avatar-fallback">
                      {currentUser.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <span className="user-menu-name">
                    {currentUser.displayName}
                  </span>
                </button>

                {isUserMenuOpen && (
                  <div className="user-menu-dropdown">
                    <div className="user-menu-search">
                      <input
                        type="search"
                        placeholder="Buscar usuarios..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>

                    <div className="user-menu-results">
                      {userSearch.trim().length < 2 ? (
                        <p>Escribí al menos 2 caracteres para buscar.</p>
                      ) : isSearchingUsers ? (
                        <p>Buscando usuarios...</p>
                      ) : userResults.length > 0 ? (
                        userResults.map((user) => (
                          <Link
                            key={user.id}
                            href={`/usuarios/${user.id}`}
                            className="user-menu-result"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt=""
                                className="user-menu-result-avatar"
                              />
                            ) : (
                              <div className="user-menu-result-avatar user-menu-avatar-fallback">
                                {(user.display_name || "U").charAt(0).toUpperCase()}
                              </div>
                            )}

                            <span>{user.display_name || "Usuario"}</span>
                          </Link>
                        ))
                      ) : (
                        <p>No se encontraron usuarios.</p>
                      )}
                    </div>

                    <div className="user-menu-divider" />

                    {canAccessAdmin && (
                      <Link
                        href="/admin/dashboard"
                        className="user-menu-option"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Panel administrativo
                      </Link>
                    )}

                    <Link
                      href="/perfil"
                      className="user-menu-option"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Mi perfil
                    </Link>

                    <button
                      type="button"
                      className="user-menu-option"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setCurrentUser(null);
                        setCanAccessAdmin(false);
                        setIsUserMenuOpen(false);
                        window.location.reload();
                      }}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="header-cta">
                Comunidad <span>↗</span>
              </Link>
            )
          )}
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


          <section className="content-section" id="biografia">
            <div className="section-heading">
              <div>
                <p className="eyebrow">THE OBSESSION</p>
                <h2>INTEGRANTES</h2>
              </div>
              
            </div>

            {isMembersLoading ? (
              <div className="empty-content">
                <h3>CARGANDO INTEGRANTES</h3>
              </div>
            ) : membersError ? (
              <div className="empty-content">
                <h3>NO SE PUDIERON CARGAR LOS INTEGRANTES</h3>
                <p>Intentá actualizar la página más tarde.</p>
              </div>
            ) : members.length === 0 ? (
              <div className="empty-content">
                <h3>PRÓXIMAMENTE</h3>
                <p>Conocé a los integrantes de The Obsession.</p>
              </div>
            ) : (
              <div className="members-scroll">
                {members.map((member) => (
                  <Link
                    href={`/integrantes/${member.slug}`}
                    className="member-card"
                    key={member.id}
                  >
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.name} />
                    ) : (
                      <div className="member-photo-placeholder">
                        THE OBSESSION
                      </div>
                    )}
                    <h3>{member.name}</h3>
                  </Link>
                ))}
              </div>
            )}
          </section>

  

          <section className="content-section" id="noticias">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ACTUALIDAD</p>
                <h2>ÚLTIMAS NOTICIAS</h2>
              </div>
              
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
              
            </div>

            <div className="empty-content">
              <span className="empty-symbol">♫</span>
              <h3>EXPLORÁ SU DISCOGRAFÍA</h3>
              <p>
                Descubrí sus álbumes, canciones, información y galerías
                en un espacio dedicado a su trayectoria musical.
              </p>
              <Link href="/discografia" className="button-primary">
                VER DISCOGRAFÍA <span>↗</span>
              </Link>
            </div>
          </section>

          <section className="content-section" id="multimedia">
            <div className="section-heading">
              <div>
                <p className="eyebrow">EXPERIENCIAS</p>
                <h2>MULTIMEDIA</h2>
              </div>
              
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
            <span className="community-label"> COMUNIDAD</span>
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