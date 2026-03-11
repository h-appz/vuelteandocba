'use client'

// ============================================================
// app/page.tsx — versión Client Component
//
// ¿Por qué 'use client'?
// La API de Córdoba Cultura bloquea llamadas desde servidores
// con error 403. Al usar 'use client', la llamada la hace el
// navegador del usuario — que sí es aceptado por la API.
// ============================================================

import { useState, useEffect } from 'react'

// --- TIPOS ---
type Evento = {
  id: number
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
  { slug: 'musica',   label: '🎵 Música' },
  { slug: 'danza',    label: '💃 Danza' },
  { slug: 'muestras', label: '🖼️ Muestras' },
  { slug: 'charla',   label: '🎤 Charlas' },
]

// --- CATEGORÍAS DISPLAY ---
const CATEGORIAS_DISPLAY: Record<string, { emoji: string; label: string }> = {
  'cine':           { emoji: '🎬', label: 'Cine' },
  'teatro':         { emoji: '🎭', label: 'Teatro' },
  'musica':         { emoji: '🎵', label: 'Música' },
  'danza':          { emoji: '💃', label: 'Danza' },
  'muestras':       { emoji: '🖼️', label: 'Muestra' },
  'artes-visuales': { emoji: '🎨', label: 'Artes Visuales' },
  'charla':         { emoji: '🎤', label: 'Charla' },
  'literatura':     { emoji: '📚', label: 'Literatura' },
  'coro':           { emoji: '🎶', label: 'Coro' },
  'eventos-especiales': { emoji: '⭐', label: 'Especial' },
}

// --- HELPERS ---

function formatearFecha(fechaStr: string): string {
  const fecha = new Date(fechaStr.replace(' ', 'T'))
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const diaSemana = diasSemana[fecha.getDay()]
  const dia = fecha.getDate()
  const mes = meses[fecha.getMonth()]
  const hora = String(fecha.getHours()).padStart(2, '0')
  const minutos = String(fecha.getMinutes()).padStart(2, '0')
  return `${diaSemana} ${dia} ${mes} · ${hora}:${minutos} hs`
}

function limpiarHTML(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
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

function formatearFechaAPI(fecha: Date): string {
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

// --- COMPONENTE EVENTO CARD ---

function EventoCard({ evento }: { evento: Evento }) {
  const categoriaDisplay = getCategoriaDisplay(evento.categorias)
  const fechaLegible = formatearFecha(evento.fecha_inicio)

  return (
    <a
      href={evento.url_evento}
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
      <div style={{ position: 'relative', width: '100%', height: '176px', background: '#D8F3DC', overflow: 'hidden' }}>
        {evento.imagen ? (
          <img src={evento.imagen} alt={evento.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '40px' }}>🎭</span>
          </div>
        )}
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
        const hoy = new Date()
        const finDeMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        const fechaInicio = formatearFechaAPI(hoy)
        const fechaFin = formatearFechaAPI(finDeMes)

        const url = `https://cultura.cba.gov.ar/wp-json/tribe/events/v1/events?per_page=100&start_date=${fechaInicio}&end_date=${fechaFin}&status=publish`

        const respuesta = await fetch(url)
        if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`)

        const datos = await respuesta.json()
        const eventosRaw = datos.events ?? []

        const eventosProcesados: Evento[] = eventosRaw
          .filter((e: any) => e.venue?.city === 'Córdoba')
          .map((e: any): Evento => ({
            id: e.id,
            titulo: e.title,
            descripcion: limpiarHTML(e.description ?? ''),
            imagen: e.image?.sizes?.medium?.url ?? e.image?.url ?? null,
            fecha_inicio: e.start_date,
            fecha_fin: e.end_date,
            es_gratis: e.categories?.some((cat: any) => cat.slug === 'gratis') ?? false,
            costo: e.cost ?? '',
            venue_nombre: e.venue?.venue ?? '',
            venue_direccion: e.venue?.address ?? '',
            venue_ciudad: e.venue?.city ?? '',
            categorias: e.categories?.map((cat: any) => cat.slug) ?? [],
            url_evento: e.url ?? '',
          }))

        setEventos(eventosProcesados)
      } catch (error) {
        console.error('Error cargando eventos:', error)
        setEventos([])
      } finally {
        setCargando(false)
      }
    }

    cargarEventos()
  }, [])

  const eventosFiltrados = filtroActivo === 'todos'
    ? eventos
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
          { num: cargando ? '…' : String(eventos.length), label: 'eventos este mes' },
          { num: '27', label: 'lugares cargados' },
          { num: '🟢', label: 'API en vivo' },
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
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#888' }}>La agenda se actualiza automáticamente desde Córdoba Cultura.</p>
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
