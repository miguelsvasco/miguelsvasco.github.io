// site-quiet.jsx — Personal site, responsive "Quiet Lab".
// Mobile: single-column, photo above name, Konami button in footer.
// Desktop: two-column hero, two-column About (bio + at-a-glance card).

const QL_BASE = {
  bg:       '#f7f5f1',
  bgAlt:    '#efece5',
  ink:      '#1a1815',
  inkSoft:  '#5b574e',
  inkFaint: '#9c9588',
  rule:     '#d8d3c8',
  accent:   '#c96442',
  fontBody: '"Inter", system-ui, sans-serif',
  fontDisp: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
  fontMono: '"JetBrains Mono", ui-monospace, monospace',
};
const QL = { ...QL_BASE };

function SiteQuiet({ density = 'regular', accentOverride, onActivate }) {
  QL.accent = accentOverride || QL_BASE.accent;
  const D = MV_DATA;
  const padX = density === 'compact' ? 32 : (density === 'comfy' ? 96 : 64);

  return (
    <div style={{
      width: '100%', background: QL.bg, color: QL.ink,
      fontFamily: QL.fontBody, fontSize: 15.5, lineHeight: 1.55,
      position: 'relative',
    }}>
      {/* Grain */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `radial-gradient(${QL.inkFaint}22 0.6px, transparent 0.6px)`,
        backgroundSize: '5px 5px', opacity: 0.4,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto' }}>

        {/* ── HEADER ── */}
        <header className="site-header" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `28px ${padX}px 0`, gap: 20,
        }}>
          <div style={{
            fontFamily: QL.fontMono, fontSize: 11, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: QL.inkSoft, whiteSpace: 'nowrap',
          }}>
            {D.location.toLowerCase()}
          </div>

          {/* Desktop nav */}
          <nav className="site-nav-links" style={{
            display: 'flex', alignItems: 'center', gap: 22, fontSize: 13,
            color: QL.inkSoft, flexWrap: 'wrap',
          }}>
            {['about','news','publications','contact'].map((s) => (
              <a key={s} href={`#${s}`} style={{
                color: 'inherit', textDecoration: 'none',
                borderBottom: `1px dotted ${QL.rule}`,
              }}>{s}</a>
            ))}
          </nav>

          <a href="files/CV.pdf" className="site-nav-cvlink" style={{
            fontFamily: QL.fontMono, fontSize: 11, color: QL.ink,
            textDecoration: 'none', padding: '5px 10px',
            border: `1px solid ${QL.rule}`,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>CV ↓</a>
        </header>

        {/* ── HERO ── */}
        <section data-screen-label="hero" className="site-hero-grid" style={{
          padding: `112px ${padX}px 96px`,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) 280px',
          gap: 80, alignItems: 'start',
        }}>
          <div className="hero-text-block">
            <div className="hero-eyebrow" style={{
              fontFamily: QL.fontMono, fontSize: 11, color: QL.accent,
              letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 20,
            }}>
              {D.role} · {D.org}
            </div>
            <h1 className="hero-title" style={{
              fontFamily: QL.fontDisp, fontWeight: 400,
              fontSize: 'clamp(52px, 7.5vw, 108px)', lineHeight: 1.0,
              letterSpacing: '-0.025em', margin: '0 0 36px', color: QL.ink,
            }}>
              {D.name}<span style={{ color: QL.accent }}>.</span>
            </h1>
            <p className="hero-lede" style={{
              fontFamily: QL.fontDisp, fontStyle: 'italic',
              fontSize: 'clamp(17px, 1.6vw, 22px)', lineHeight: 1.5,
              color: QL.inkSoft, maxWidth: 560, margin: 0,
            }}>{D.bioShort}</p>
          </div>

          {/* Square photo — no caption */}
          <image-slot
            id="miguel-face"
            shape="rounded"
            radius="4"
            fit="cover"
            src="assets/img/prof_pic_2026.png"
            placeholder="Drop your photo here"
            className="site-hero-photo"
            style={{
              display: 'block', width: '280px', height: '280px',
              background: QL.bgAlt, outline: `1px solid ${QL.rule}`,
            }}
          ></image-slot>
        </section>

        {/* ── ABOUT ── */}
        <Section id="about" label="01 · About" padX={padX}>
          <div className="site-about-cols" style={{
            columns: 2, columnGap: 56,
            fontSize: 18, lineHeight: 1.72, color: QL.ink,
          }}>
            {D.bioLong.map((p, i) => (
              <p key={i} style={{ margin: '0 0 1.4em', breakInside: 'avoid' }}>
                {i === 0 && (
                  <span style={{
                    fontFamily: QL.fontDisp, float: 'left',
                    fontSize: 68, lineHeight: 0.84, padding: '5px 8px 0 0',
                    color: QL.accent, fontWeight: 400,
                  }}>{p[0]}</span>
                )}
                {i === 0 ? p.slice(1) : p}
              </p>
            ))}
          </div>
        </Section>

        {/* ── NEWS ── */}
        <Section id="news" label="02 · News" padX={padX}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: 960 }}>
            {D.news.map((n, i) => (
              <li key={i} className="site-news-item" style={{
                display: 'grid', gridTemplateColumns: '140px 1fr',
                gap: 28, padding: '16px 0', borderTop: `1px solid ${QL.rule}`,
                alignItems: 'baseline',
              }}>
                <div style={{ fontFamily: QL.fontMono, fontSize: 12,
                              color: QL.accent, letterSpacing: '0.04em' }}>{n.date}</div>
                <div style={{ fontSize: 16.5, color: QL.ink, textWrap: 'pretty' }}
                     dangerouslySetInnerHTML={{ __html: n.body }} />
              </li>
            ))}
            <li style={{ height: 1, background: QL.rule }} />
          </ul>
        </Section>

        {/* ── PUBLICATIONS ── */}
        <Section
          id="publications"
          label="03 · Selected publications"
          padX={padX}
          note={
            <span>Complete list on{' '}
              <a href="https://scholar.google.com/citations?user=Of2hDmMAAAAJ"
                 target="_blank" rel="noopener noreferrer"
                 style={{ color: QL.inkSoft, textDecoration: 'underline',
                          textUnderlineOffset: 3 }}>Google Scholar</a>.
            </span>
          }
        >
          <ol style={{ listStyle: 'none', margin: 0, padding: 0,
                       borderTop: `1px solid ${QL.rule}` }}>
            {D.publications.map((p, i) => (
              <li key={i} className="site-pub-item" style={{
                display: 'grid',
                gridTemplateColumns: '52px 1fr 200px',
                gap: 24, padding: '22px 0',
                borderBottom: `1px solid ${QL.rule}`, alignItems: 'baseline',
              }}>
                <div className="site-pub-year" style={{
                  fontFamily: QL.fontMono, fontSize: 12, color: QL.inkFaint,
                }}>{p.year}</div>
                <div>
                  <a href={p.href || '#'} style={{
                    fontFamily: QL.fontDisp, fontSize: 19.5,
                    lineHeight: 1.28, color: QL.ink, textDecoration: 'none',
                    textWrap: 'pretty', display: 'block', marginBottom: 5,
                  }}>
                    {p.title}
                    {p.award && (
                      <span style={{
                        marginLeft: 8, fontFamily: QL.fontMono, fontSize: 10,
                        letterSpacing: '0.08em', color: QL.accent,
                        textTransform: 'uppercase', verticalAlign: 'middle',
                      }}>★ {p.award}</span>
                    )}
                  </a>
                  <div style={{ fontSize: 13.5, color: QL.inkSoft, fontStyle: 'italic' }}>
                    {p.authors}
                  </div>
                </div>
                <div className="site-pub-venue" style={{
                  fontSize: 13, color: QL.inkSoft, textAlign: 'right', lineHeight: 1.4,
                }}>{p.venue}</div>
              </li>
            ))}
          </ol>
        </Section>

        {/* ── CONTACT ── */}
        <Section id="contact" label="04 · Contact" padX={padX} last>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 560 }}>
            <div className="contact-email" style={{ fontFamily: QL.fontDisp, fontSize: 30 }}>{D.email}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {D.social.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                   style={{
                     fontFamily: QL.fontMono, fontSize: 12, color: QL.ink,
                     padding: '7px 12px', border: `1px solid ${QL.rule}`,
                     textDecoration: 'none', background: QL.bg,
                   }}>{s.label.toLowerCase()} ↗</a>
              ))}
            </div>
            <p style={{ margin: 0, fontFamily: QL.fontDisp, fontStyle: 'italic',
                        fontSize: 15, color: QL.inkSoft }}>
              {D.contactNote}
            </p>
          </div>
        </Section>

        {/* ── FOOTER ── */}
        <footer className="site-footer" style={{
          padding: `24px ${padX}px 36px`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: QL.fontMono, fontSize: 11, color: QL.inkFaint,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          borderTop: `1px solid ${QL.rule}`,
        }}>
          <span>© miguel vasco · {new Date().getFullYear()}</span>

          {/* Desktop: subtle hint */}
          <span className="site-konami-desktop"
                style={{ cursor: 'default', userSelect: 'none' }}
                title="Konami code activates something">
            ↑↑↓↓←→←→ba
          </span>

          {/* Mobile: tappable button */}
          <button
            className="site-konami-mobile"
            onClick={onActivate}
            style={{
              background: 'transparent', border: `1px solid ${QL.rule}`,
              color: QL.inkSoft, fontFamily: QL.fontMono, fontSize: 11,
              letterSpacing: '0.1em', padding: '8px 14px', cursor: 'pointer',
              textTransform: 'uppercase', display: 'none',
            }}
          >
            ↑↑↓↓←→←→ba
          </button>
        </footer>
      </div>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function Section({ id, label, children, padX, note, last }) {
  return (
    <section id={id} data-screen-label={id} className="site-section" style={{
      position: 'relative',
      padding: `72px ${padX}px ${last ? 96 : 72}px`,
      borderTop: `1px solid ${QL.rule}`,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 40, flexWrap: 'wrap', gap: 12,
      }}>
        <h2 style={{
          fontFamily: QL.fontMono, fontWeight: 500, fontSize: 12,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: QL.inkSoft, margin: 0,
        }}>{label}</h2>
        {note && (
          <span style={{ fontFamily: QL.fontDisp, fontStyle: 'italic',
                         fontSize: 14, color: QL.inkFaint }}>{note}</span>
        )}
      </div>
      {children}
    </section>
  );
}

Object.assign(window, { SiteQuiet });
