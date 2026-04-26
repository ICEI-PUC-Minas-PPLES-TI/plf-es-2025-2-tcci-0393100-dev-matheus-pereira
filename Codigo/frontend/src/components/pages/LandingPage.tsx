import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import "@/styles.css";

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "#inicio", label: "Início" },
  { href: "#sobre", label: "Sobre nós" },
  { href: "#solucoes", label: "Soluções" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#contato", label: "Contato" },
];

const HERO_CARDS: { title: string; subtitle?: string; metric?: string }[] = [
  { title: "Atendimento estratégico", subtitle: "Decisões com base em dados" },
  { title: "Rotina em dia", subtitle: "Obrigações acompanhadas de perto" },
  { title: "Satisfação", metric: "98%", subtitle: "Clientes que recomendam" },
];

const STATS: { value: string; label: string }[] = [
  { value: "+200", label: "clientes atendidos" },
  { value: "+20", label: "anos de experiência" },
  { value: "+130", label: "empresas ativas" },
];

const SOBRE_DESTAQUES: string[] = [
  "Atendimento próximo e humanizado",
  "Suporte para pequenas e médias empresas",
  "Rotina contábil, fiscal e trabalhista integrada",
  "Comunicação simples para decisões rápidas",
];

const SOLUCOES: { titulo: string; desc: string; icon: string }[] = [
  {
    titulo: "Contabilidade consultiva",
    desc: "Números e indicadores traduzidos em orientação prática para o dia a dia da sua gestão.",
    icon: "chart",
  },
  {
    titulo: "Fiscal e tributário",
    desc: "Conformidade com a legislação e planejamento que reduz riscos e surpresas.",
    icon: "doc",
  },
  {
    titulo: "Departamento pessoal",
    desc: "Folha, obrigações trabalhistas e eSocial alinhados à rotina do seu time.",
    icon: "people",
  },
  {
    titulo: "Abertura e regularização",
    desc: "Da abertura do CNPJ à regularização de pendências, com clareza em cada etapa.",
    icon: "building",
  },
];

const URL_WHATSAPP_ESCRITORIO =
  "https://api.whatsapp.com/send/?phone=%2B5531998211343&text&type=phone_number&app_absent=0";

const COMO_FUNCIONA: { passo: string; titulo: string; texto: string }[] = [
  {
    passo: "1",
    titulo: "Diagnóstico do momento da empresa",
    texto: "Entendemos a realidade do seu negócio, gargalos e prioridades fiscais e contábeis.",
  },
  {
    passo: "2",
    titulo: "Plano de ação claro e personalizado",
    texto: "Entregamos um roteiro objetivo, alinhado ao tamanho e ao setor da sua empresa.",
  },
  {
    passo: "3",
    titulo: "Acompanhamento constante",
    texto: "Revisões periódicas e canal aberto para dúvidas, com respostas em linguagem simples.",
  },
];

function IconChart() {
  return (
    <svg className="landing-card__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-6M22 20V8" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg className="landing-card__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  );
}

function IconPeople() {
  return (
    <svg className="landing-card__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg className="landing-card__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22V12h6v10M9 6h.01M12 6h.01M15 6h.01M9 9h.01M12 9h.01M15 9h.01" />
    </svg>
  );
}

const SOLUCOES_ICONS: Record<string, ReactNode> = {
  chart: <IconChart />,
  doc: <IconDoc />,
  people: <IconPeople />,
  building: <IconBuilding />,
};

export default function LandingPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.title = "Contabilidade São Judas Tadeu";
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (navOpen) document.body.classList.add("landing-nav-open");
    else document.body.classList.remove("landing-nav-open");
    return () => document.body.classList.remove("landing-nav-open");
  }, [navOpen]);

  function scrollToId(id: string) {
    setNavOpen(false);
    const el = document.querySelector(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="landing">
      <header className={`landing-header ${scrolled ? "landing-header--scrolled" : ""}`}>
        <div className="landing-header__inner">
          <a
            href="#inicio"
            className="landing-logo"
            onClick={(e) => {
              e.preventDefault();
              scrollToId("#inicio");
            }}
          >
            <span className="landing-logo__main">CONTABILIDADE</span>
            <span className="landing-logo__sub">São Judas Tadeu</span>
          </a>

          <button
            type="button"
            className="landing-nav__toggle"
            aria-expanded={navOpen}
            aria-controls="landing-nav"
            onClick={() => setNavOpen((o) => !o)}
          >
            <span className="landing-nav__toggle-bar" />
            <span className="landing-nav__toggle-bar" />
            <span className="landing-nav__toggle-bar" />
            <span className="visually-hidden">Abrir menu</span>
          </button>

          <nav id="landing-nav" className={`landing-nav ${navOpen ? "landing-nav--open" : ""}`} aria-label="Principal">
            <ul className="landing-nav__list">
              {NAV_LINKS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="landing-nav__link"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToId(item.href);
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="landing-header__actions">
              <button type="button" className="landing-btn landing-btn--ghost" onClick={() => scrollToId("#contato")}>
                Solicitar proposta
              </button>
              <Link to="/login" className="landing-btn landing-btn--primary" onClick={() => setNavOpen(false)}>
                Área do funcionário
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <section id="inicio" className="landing-hero">
          <div className="landing-hero__bg" aria-hidden />
          <div className="landing-container landing-hero__grid">
            <div className="landing-hero__content landing-reveal">
              <p className="landing-eyebrow">Escritório de contabilidade</p>
              <h1 className="landing-hero__title">Assessoria contábil moderna para empresas que querem crescer com tranquilidade.</h1>
              <p className="landing-hero__lead">
                Organização fiscal, contábil e trabalhista para você focar no que importa. Menos improviso, mais previsibilidade
                e suporte de quem acompanha o seu negócio de perto.
              </p>
              <div className="landing-hero__ctas">
                <button type="button" className="landing-btn landing-btn--primary landing-btn--lg" onClick={() => scrollToId("#solucoes")}>
                  Conhecer soluções
                </button>
                <button type="button" className="landing-btn landing-btn--outline landing-btn--lg" onClick={() => scrollToId("#sobre")}>
                  Saber mais
                </button>
              </div>
            </div>
            <div className="landing-hero__aside">
              {HERO_CARDS.map((c, i) => (
                <div key={c.title} className="landing-hero-card landing-reveal" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
                  {c.metric ? (
                    <span className="landing-hero-card__metric">{c.metric}</span>
                  ) : null}
                  <h3 className="landing-hero-card__title">{c.title}</h3>
                  {c.subtitle ? <p className="landing-hero-card__text">{c.subtitle}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-stats" aria-label="Números">
          <div className="landing-container landing-stats__grid">
            {STATS.map((s, i) => (
              <div key={s.label} className="landing-stat landing-reveal" style={{ animationDelay: `${i * 0.06}s` }}>
                <span className="landing-stat__value">{s.value}</span>
                <span className="landing-stat__label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="sobre" className="landing-section landing-section--muted">
          <div className="landing-container">
            <div className="landing-section__head landing-reveal">
              <h2 className="landing-section__title">Sobre nós</h2>
              <p className="landing-section__intro">
                Somos parceiros de empresas que precisam de organização, suporte próximo e respostas objetivas. Nosso papel é dar
                clareza na rotina fiscal, contábil e trabalhista, para que você tome decisões com segurança.
              </p>
            </div>
            <ul className="landing-list landing-reveal">
              {SOBRE_DESTAQUES.map((item) => (
                <li key={item} className="landing-list__item">
                  <span className="landing-list__check" aria-hidden>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="solucoes" className="landing-section">
          <div className="landing-container">
            <div className="landing-section__head landing-reveal">
              <h2 className="landing-section__title">Soluções</h2>
              <p className="landing-section__subtitle">O que podemos fazer pelo seu negócio</p>
            </div>
            <div className="landing-cards">
              {SOLUCOES.map((s) => (
                <article key={s.titulo} className="landing-card landing-reveal">
                  <div className="landing-card__icon">{SOLUCOES_ICONS[s.icon]}</div>
                  <h3 className="landing-card__title">{s.titulo}</h3>
                  <p className="landing-card__text">{s.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="landing-section landing-section--muted">
          <div className="landing-container">
            <div className="landing-section__head landing-reveal">
              <h2 className="landing-section__title">Como funciona</h2>
              <p className="landing-section__subtitle">Três etapas para alinhar expectativas e entregar resultados</p>
            </div>
            <ol className="landing-steps">
              {COMO_FUNCIONA.map((step, i) => (
                <li key={step.passo} className="landing-step landing-reveal" style={{ animationDelay: `${i * 0.07}s` }}>
                  <span className="landing-step__num">{step.passo}</span>
                  <div>
                    <h3 className="landing-step__title">{step.titulo}</h3>
                    <p className="landing-step__text">{step.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="contato" className="landing-cta">
          <div className="landing-container landing-cta__inner landing-reveal">
            <h2 className="landing-cta__title">Pronto para organizar a sua contabilidade?</h2>
            <p className="landing-cta__text">Fale com o escritório e receba uma proposta alinhada à realidade da sua empresa.</p>
            <div className="landing-cta__btns">
              <a
                className="landing-btn landing-btn--light landing-btn--lg"
                href={URL_WHATSAPP_ESCRITORIO}
                target="_blank"
                rel="noopener noreferrer"
              >
                Falar com o escritório
              </a>
              <button type="button" className="landing-btn landing-btn--outline landing-btn--lg landing-btn--on-dark" onClick={() => scrollToId("#inicio")}>
                Voltar ao topo
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer__inner">
          <p>
            MCA-Serviços Contábeis Ltda - CNPJ 07.797.964/0001-51 | MCA-Serviços Contábeis Ltda •{" "}
            {new Date().getFullYear()} Todos os Direitos Reservados.
          </p>
          <Link to="/login" className="landing-footer__link">
            Acesso do funcionário
          </Link>
        </div>
      </footer>
    </div>
  );
}
