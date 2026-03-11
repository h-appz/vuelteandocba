export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--crema)' }}>

      {/* TICKER */}
      <div style={{ background: 'var(--verde)', padding: '9px 0', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <div style={{
          display: 'inline-flex', gap: '48px',
          animation: 'ticker 22s linear infinite'
        }}>
          {[...Array(2)].map((_, i) => (
            <span key={i} style={{ display: 'inline-flex', gap: '48px' }}>
              {[
                '🎵 Jazz en La Cañada — hoy 20hs',
                '🎨 Muestra Caraffa — entrada gratis',
                '🛍️ Feria Güemes — sáb y dom',
                '🎭 Teatro Real — función esta noche',
                '🌿 Parque Sarmiento — sol toda la semana',
              ].map((item, j) => (
                <span key={j} style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '12px', fontWeight: 600,
                  color: 'rgba(255,255,255,0.9)',
                  textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  {item} <span style={{ color: 'var(--verde-claro)' }}>·</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{
        background: 'var(--blanco)',
        borderBottom: '1px solid var(--crema-borde)',
        padding: '0 28px', height: '62px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          fontFamily: "'Fraunces', serif",
          fontSize: '22px', fontWeight: 800,
          color: 'var(--verde)', letterSpacing: '-0.5px',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <div style={{
            width: '8px', height: '8px',
            background: 'var(--naranja)', borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }} />
          VuelteandoCBA
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['Agenda', 'Lugares', 'Mapa', 'Mi recorrido'].map((tab, i) => (
            <button key={tab} style={{
              padding: '7px 16px', borderRadius: '20px',
              color: i === 0 ? 'var(--verde)' : 'var(--gris-mid)',
              fontSize: '13px', fontWeight: i === 0 ? 600 : 500,
              background: i === 0 ? 'var(--verde-menta)' : 'transparent',
              border: 'none', cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif"
            }}>
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* HERO */}
      <div style={{
        background: 'var(--verde)',
        padding: '56px 28px 72px',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
            <div style={{ width: '28px', height: '2px', background: 'var(--verde-claro)' }} />
            <span style={{
              fontSize: '11px', fontWeight: 600,
              color: 'var(--verde-claro)',
              textTransform: 'uppercase', letterSpacing: '2px'
            }}>
              Córdoba, Argentina
            </span>
          </div>
          <h1 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 'clamp(34px, 6vw, 58px)',
            fontWeight: 800, color: 'var(--blanco)',
            lineHeight: 1.05, marginBottom: '18px', letterSpacing: '-1px'
          }}>
            La ciudad que<br />no está en<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--verde-claro)' }}>
              ningún mapa
            </em>
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.72)',
            fontSize: '16px', lineHeight: 1.7,
            marginBottom: '36px', maxWidth: '480px'
          }}>
            El dato local real. Eventos, lugares y tips de gente que estuvo ahí — no de un algoritmo.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button style={{
              background: 'var(--naranja)', color: 'var(--blanco)',
              border: 'none', padding: '13px 26px', borderRadius: '32px',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: '0 4px 16px rgba(224,122,47,0.35)'
            }}>
              🗓️ Ver agenda de hoy
            </button>
            <button style={{
              background: 'rgba(255,255,255,0.1)', color: 'var(--blanco)',
              border: '1px solid rgba(255,255,255,0.22)',
              padding: '13px 26px', borderRadius: '32px',
              fontSize: '14px', fontWeight: 500, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif"
            }}>
              🗺️ Abrir el mapa
            </button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{
        background: 'var(--blanco)',
        borderBottom: '1px solid var(--crema-borde)',
        padding: '14px 28px',
        display: 'flex', justifyContent: 'center', gap: '48px'
      }}>
        {[
          { num: '48', label: 'eventos esta semana' },
          { num: '27', label: 'lugares cargados' },
          { num: '🟢', label: 'API en vivo' },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Fraunces', serif",
              fontSize: '24px', fontWeight: 800, color: 'var(--verde)'
            }}>{s.num}</div>
            <div style={{
              fontSize: '11px', color: 'var(--gris-suave)',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px'
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ANIMACIONES */}
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.75); }
        }
      `}</style>

    </div>
  );
}