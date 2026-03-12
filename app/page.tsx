'use client'

// ============================================================
// app/page.tsx — lee eventos desde Firestore
//
// Cambiamos la fuente de datos: antes consumía la API de
// Córdoba Cultura (que tenía pocos eventos y daba 403 desde
// servidor). Ahora lee desde nuestra propia colección en
// Firestore, donde cargamos los eventos via el panel de admin.
// ============================================================

import { useState, useEffect } from 'react'
import { db } from './lib/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'

// --- TIPOS ---
type Evento = {
  id: string
  titulo: string
  descripcion: string
  imagen: string | null
  fecha_inicio: string
  fecha_fin: string
  es_gratis: boolean
  costo: string
  venue_nombre: string
  venue_direccion: string
  venue_ciudad: string
  categorias: string[]
  url_evento: string
}

// --- FILTROS ---
const FILTROS = [
  { slug: 'todos',    label: '✨ Todos' },
  { slug: 'gratis',   label: '🆓 Gratis' },
  { slug: 'cine',     label: '🎬 Cine' },
  { slug: 'teatro',   label: '🎭 Teatro' },
  { slug: 'música',   label: '🎵 Música' },
  { slug: 'danza',    label: '💃 Danza' },
  { slug: 'muestra',  label: '🖼️ Muestras' },
  { slug: 'charla',   label: '🎤 Charlas' },
]

// --- CATEGORÍAS DISPLAY ---
const CATEGORIAS_DISPLAY: Record<string, { emoji: string; label: string }> = {
  'cine':      { emoji: '🎬', label: 'Cine' },
  'teatro':    { emoji: '🎭', label: 'Teatro' },
  'música':    { emoji: '🎵', label: 'Música' },
  'danza':     { emoji: '💃', label: 'Danza' },
  'muestra':   { emoji: '🖼️', label: 'Muestra' },
  'charla':    { emoji: '🎤', label: 'Charla' },
  'taller':    { emoji: '🛠️', label: 'Taller' },
  'festival':  { emoji: '⭐', label: 'Festival' },
  'deporte':   { emoji: '⚽', label: 'Deporte' },
  'otro':      { emoji: '✨', label: 'Otro' },
}

// --- UNSPLASH PLACEHOLDER ---
// Palabras clave por categoría para que Unsplash devuelva fotos relevantes.
// La URL /featured/?keyword devuelve una foto aleatoria diferente cada vez.
// Si Unsplash falla, el onError muestra un gradiente de color como último recurso.

const UNSPLASH_KEYWORDS: Record<string, string> = {
  'teatro':   'theater,stage,performance',
  'música':   'music,concert,live',
  'cine':     'cinema,film,movie',
  'danza':    'dance,ballet,dancer',
  'muestra':  'art,exhibition,gallery',
  'charla':   'conference,talk,speaker',
  'taller':   'workshop,craft,art',
  'festival': 'festival,celebration,outdoor',
  'deporte':  'sport,stadium,action',
  'otro':     'culture,event,city',
}

const FALLBACK_GRADIENTS: Record<string, string> = {
  'teatro':   'linear-gradient(135deg, #1C1033, #4C1D95)',
  'música':   'linear-gradient(135deg, #0D1B2A, #92400E)',
  'cine':     'linear-gradient(135deg, #111827, #374151)',
  'danza':    'linear-gradient(135deg, #1A0820, #9D174D)',
  'muestra':  'linear-gradient(135deg, #0B1F14, #065F46)',
  'charla':   'linear-gradient(135deg, #0A1628, #1E3A5F)',
  'taller':   'linear-gradient(135deg, #1A1200, #78350F)',
  'festival': 'linear-gradient(135deg, #1A0A00, #C2410C)',
  'deporte':  'linear-gradient(135deg, #001A0A, #047857)',
  'otro':     'linear-gradient(135deg, #1A1410, #44403C)',
}

function getUnsplashUrl(categorias: string[]): string {
  const cat = categorias[0] ?? 'otro'
  const keyword = UNSPLASH_KEYWORDS[cat] ?? UNSPLASH_KEYWORDS['otro']
  // 400x300 es suficiente para la card, carga rápido
  return `https://source.unsplash.com/featured/400x300/?${keyword}`
}

function getFallbackGradient(categorias: string[]): string {
  const cat = categorias[0] ?? 'otro'
  return FALLBACK_GRADIENTS[cat] ?? FALLBACK_GRADIENTS['otro']
}

// --- HELPERS ---

function formatearFecha(fechaStr: string): string {
  if (!fechaStr) return ''
  const fecha = new Date(fechaStr + 'T00:00:00')
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const diaSemana = diasSemana[fecha.getDay()]
  const dia = fecha.getDate()
  const mes = meses[fecha.getMonth()]
  return `${diaSemana} ${dia} ${mes}`
}

function truncar(texto: string, max: number): string {
  if (texto.length <= max) return texto
  return texto.slice(0, max).trimEnd() + '…'
}

function getCategoriaDisplay(categorias: string[]) {
  for (const slug of categorias) {
    if (CATEGORIAS_DISPLAY[slug]) return CATEGORIAS_DISPLAY[slug]
  }
  return null
}

// --- COMPONENTE EVENTO CARD ---

function EventoCard({ evento }: { evento: Evento }) {
  const categoriaDisplay = getCategoriaDisplay(evento.categorias)
  const fechaLegible = formatearFecha(evento.fecha_inicio)

  return (
    <a
      href={evento.url_evento || '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block', background: 'white',
        borderRadius: '16px', overflow: 'hidden',
        border: '1px solid #F0EAD6',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        textDecoration: 'none'
      }}
    >
      {/* IMAGEN */}
      <div style={{ position: 'relative', width: '100%', height: '176px', overflow: 'hidden' }}>
        {/* Siempre mostramos una imagen:
            1. Si el evento tiene imagen propia → esa
            2. Si no → foto aleatoria de Unsplash por categoría
            3. Si Unsplash falla → gradiente de color como último recurso */}
        <img
          src={evento.imagen || getUnsplashUrl(evento.categorias)}
          alt={evento.titulo}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            const img = e.currentTarget
            img.style.display = 'none'
            if (img.parentElement) {
              img.parentElement.style.background = getFallbackGradient(evento.categorias)
            }
          }}
        />
        {categoriaDisplay && (
          <div style={{
            position: 'absolute', top: '10px', left: '10px',
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'rgba(255,255,255,0.92)', padding: '4px 10px',
            borderRadius: '100px', fontSize: '11px', fontWeight: 600,
            color: '#444', fontFamily: "'DM Sans', sans-serif"
          }}>
            <span>{categoriaDisplay.emoji}</span>
            <span>{categoriaDisplay.label}</span>
          </div>
        )}
        {evento.es_gratis && (
          <div style={{
            position: 'absolute', top: '10px', right: '10px',
            background: '#2D6A4F', color: 'white',
            fontSize: '10px', fontWeight: 700,
            padding: '4px 8px', borderRadius: '100px',
            fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.5px'
          }}>
            GRATIS
          </div>
        )}
      </div>

      {/* CONTENIDO */}
      <div style={{ padding: '16px' }}>
        <p style={{
          fontSize: '11px', fontWeight: 600, color: '#E07A2F',
          textTransform: 'uppercase', letterSpacing: '0.5px',
          marginBottom: '4px', fontFamily: "'DM Sans', sans-serif"
        }}>
          {fechaLegible}
          {evento.costo && !evento.es_gratis && (
            <span style={{ marginLeft: '8px', color: '#AAA', fontWeight: 400 }}>· {evento.costo}</span>
          )}
        </p>
        <h3 style={{
          fontFamily: "'Fraunces', serif", fontSize: '15px',
          fontWeight: 600, color: '#1B4332', lineHeight: 1.3, marginBottom: '8px'
        }}>
          {evento.titulo}
        </h3>
        {evento.descripcion && (
          <p style={{
            fontSize: '13px', color: '#888', lineHeight: 1.5,
            marginBottom: '10px', fontFamily: "'DM Sans', sans-serif"
          }}>
            {truncar(evento.descripcion, 100)}
          </p>
        )}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '4px',
          fontSize: '12px', color: '#AAA', fontFamily: "'DM Sans', sans-serif"
        }}>
          <span>📍</span>
          <span>{evento.venue_nombre}</span>
        </div>
      </div>
    </a>
  )
}

// --- PÁGINA PRINCIPAL ---

export default function Home() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroActivo, setFiltroActivo] = useState('todos')

  const mesActual = new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' })

  useEffect(() => {
    async function cargarEventos() {
      try {
        const q = query(collection(db, 'eventos'), orderBy('fecha_inicio'))
        const snapshot = await getDocs(q)

        const eventosProcesados: Evento[] = snapshot.docs.map(doc => {
          const d = doc.data()
          return {
            id: doc.id,
            titulo: d.titulo ?? '',
            descripcion: d.descripcion ?? '',
            imagen: d.imagen_url || null,
            fecha_inicio: d.fecha_inicio ?? '',
            fecha_fin: d.fecha_fin ?? '',
            es_gratis: d.es_gratis ?? false,
            costo: d.costo ?? '',
            venue_nombre: d.venue ?? '',
            venue_direccion: d.direccion ?? '',
            venue_ciudad: 'Córdoba',
            categorias: d.categoria ? [d.categoria] : [],
            url_evento: d.fuente_url ?? '',
          }
        })

        setEventos(eventosProcesados)
      } catch (error) {
        console.error('Error cargando eventos desde Firestore:', error)
        setEventos([])
      } finally {
        setCargando(false)
      }
    }

    cargarEventos()
  }, [])

  // Filtro: gratis es campo booleano, el resto es categoria
  const eventosFiltrados = filtroActivo === 'todos'
    ? eventos
    : filtroActivo === 'gratis'
      ? eventos.filter(e => e.es_gratis)
      : eventos.filter(e => e.categorias.includes(filtroActivo))

  return (
    <div className="min-h-screen" style={{ background: 'var(--crema)' }}>

      {/* TICKER */}
      <div style={{ background: 'var(--verde)', padding: '9px 0', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'inline-flex', gap: '48px', animation: 'ticker 22s linear infinite' }}>
          {[...Array(2)].map((_, i) => (
            <span key={i} style={{ display: 'inline-flex', gap: '48px' }}>
              {['🎵 Jazz en La Cañada — hoy 20hs', '🎨 Muestra Caraffa — entrada gratis', '🛍️ Feria Güemes — sáb y dom', '🎭 Teatro Real — función esta noche', '🌿 Parque Sarmiento — sol toda la semana'].map((item, j) => (
                <span key={j} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {item} <span style={{ color: 'var(--verde-claro)' }}>·</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: 'var(--blanco)', borderBottom: '1px solid var(--crema-borde)', padding: '0 28px', height: '62px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 800, color: 'var(--verde)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', background: 'var(--naranja)', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
          VuelteandoCBA
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['Agenda', 'Lugares', 'Mapa', 'Mi recorrido'].map((tab, i) => (
            <button key={tab} style={{ padding: '7px 16px', borderRadius: '20px', color: i === 0 ? 'var(--verde)' : 'var(--gris-mid)', fontSize: '13px', fontWeight: i === 0 ? 600 : 500, background: i === 0 ? 'var(--verde-menta)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* HERO */}
      <div style={{ background: 'var(--verde)', padding: '56px 28px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
            <div style={{ width: '28px', height: '2px', background: 'var(--verde-claro)' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--verde-claro)', textTransform: 'uppercase', letterSpacing: '2px' }}>Córdoba, Argentina</span>
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(34px, 6vw, 58px)', fontWeight: 800, color: 'var(--blanco)', lineHeight: 1.05, marginBottom: '18px', letterSpacing: '-1px' }}>
            La ciudad que<br />no está en<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--verde-claro)' }}>ningún mapa</em>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '16px', lineHeight: 1.7, marginBottom: '36px', maxWidth: '480px' }}>
            El dato local real. Eventos, lugares y tips de gente que estuvo ahí — no de un algoritmo.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button style={{ background: 'var(--naranja)', color: 'var(--blanco)', border: 'none', padding: '13px 26px', borderRadius: '32px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 4px 16px rgba(224,122,47,0.35)' }}>🗓️ Ver agenda de hoy</button>
            <button style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--blanco)', border: '1px solid rgba(255,255,255,0.22)', padding: '13px 26px', borderRadius: '32px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>🗺️ Abrir el mapa</button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ background: 'var(--blanco)', borderBottom: '1px solid var(--crema-borde)', padding: '14px 28px', display: 'flex', justifyContent: 'center', gap: '48px' }}>
        {[
          { num: cargando ? '…' : String(eventos.length), label: 'eventos cargados' },
          { num: '27', label: 'lugares cargados' },
          { num: '🟢', label: 'Firestore activo' },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 800, color: 'var(--verde)' }}>{s.num}</div>
            <div style={{ fontSize: '11px', color: 'var(--gris-suave)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* AGENDA */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 28px' }}>

        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--naranja)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px', fontFamily: "'DM Sans', sans-serif" }}>
            Agenda cultural
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '28px', fontWeight: 700, color: 'var(--verde-dark)', textTransform: 'capitalize' }}>
            {mesActual}
          </h2>
        </div>

        {/* FILTROS */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
          {FILTROS.map((filtro) => (
            <button
              key={filtro.slug}
              onClick={() => setFiltroActivo(filtro.slug)}
              style={{
                padding: '8px 16px', borderRadius: '100px', border: '1.5px solid',
                borderColor: filtroActivo === filtro.slug ? '#2D6A4F' : '#DDD',
                background: filtroActivo === filtro.slug ? '#2D6A4F' : 'white',
                color: filtroActivo === filtro.slug ? 'white' : '#888',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap'
              }}
            >
              {filtro.label}
            </button>
          ))}
        </div>

        {/* CARGANDO */}
        {cargando && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#888' }}>Cargando agenda…</p>
          </div>
        )}

        {/* SIN EVENTOS */}
        {!cargando && eventosFiltrados.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎭</div>
            <p style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', marginBottom: '8px', color: '#1B4332' }}>Sin eventos por ahora</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#888' }}>Cargá eventos desde el panel de admin.</p>
          </div>
        )}

        {/* GRID */}
        {!cargando && eventosFiltrados.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {eventosFiltrados.map((evento) => (
              <EventoCard key={evento.id} evento={evento} />
            ))}
          </div>
        )}

      </section>

      {/* ANIMACIONES */}
      <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.75); } }
      `}</style>

    </div>
  )
}
