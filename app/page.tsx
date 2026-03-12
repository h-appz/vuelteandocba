'use client'

// ============================================================
// app/page.tsx — lee eventos desde Firestore
// Actualización: placeholders con íconos Phosphor duotone
// inline (sin CDN, sin dependencias extra).
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

// --- CONFIGURACIÓN DE PLACEHOLDERS POR CATEGORÍA ---
// Cada categoría tiene: color de fondo, color del ícono, y el SVG path de Phosphor duotone.
// Los íconos son inline (sin CDN) — funcionan siempre.

const PLACEHOLDER_CONFIG: Record<string, {
  bg: string
  colorPrimary: string
  colorSecondary: string
  label: string
  icon: React.ReactNode
}> = {
  teatro: {
    bg: '#1C1033',
    colorPrimary: '#C4A8FF',
    colorSecondary: '#7C3AED',
    label: 'Teatro',
    icon: (
      // Phosphor duotone: MaskHappy
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 256 256">
        <path d="M236,84v46a108,108,0,0,1-108,108A108,108,0,0,1,20,130V84a8,8,0,0,1,8-8H228A8,8,0,0,1,236,84Z" fill="#C4A8FF" opacity="0.2"/>
        <path d="M236,84v46a108,108,0,0,1-108,108A108,108,0,0,1,20,130V84a8,8,0,0,1,8-8H228A8,8,0,0,1,236,84Z" fill="none" stroke="#C4A8FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <path d="M100,128a36,36,0,0,0,56,0" fill="none" stroke="#C4A8FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <circle cx="92" cy="104" r="12" fill="#C4A8FF"/>
        <circle cx="164" cy="104" r="12" fill="#C4A8FF"/>
        <path d="M76,12,28,20V76" fill="none" stroke="#7C3AED" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <path d="M180,12l48,8V76" fill="none" stroke="#7C3AED" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
      </svg>
    )
  },
  música: {
    bg: '#0D1B2A',
    colorPrimary: '#FFB347',
    colorSecondary: '#E07A2F',
    label: 'Música',
    icon: (
      // Phosphor duotone: MicrophoneStage
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 256 256">
        <path d="M80,128a48,48,0,0,1,96,0v16a48,48,0,0,1-96,0Z" fill="#FFB347" opacity="0.25"/>
        <path d="M80,128a48,48,0,0,1,96,0v16a48,48,0,0,1-96,0Z" fill="none" stroke="#FFB347" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <line x1="128" y1="192" x2="128" y2="224" stroke="#FFB347" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <line x1="96" y1="224" x2="160" y2="224" stroke="#FFB347" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <path d="M48,160a80,80,0,0,0,160,0" fill="none" stroke="#E07A2F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <line x1="128" y1="32" x2="128" y2="80" stroke="#E07A2F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <line x1="104" y1="56" x2="152" y2="56" stroke="#E07A2F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
      </svg>
    )
  },
  cine: {
    bg: '#0A0A0A',
    colorPrimary: '#E0E0E0',
    colorSecondary: '#888888',
    label: 'Cine',
    icon: (
      // Phosphor duotone: FilmSlate
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 256 256">
        <path d="M216,80V208a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80Z" fill="#E0E0E0" opacity="0.15"/>
        <path d="M216,80V208a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80Z" fill="none" stroke="#E0E0E0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <path d="M40,80,82.06,48H216L174,80Z" fill="#E0E0E0" opacity="0.3"/>
        <path d="M40,80,82.06,48H216L174,80Z" fill="none" stroke="#E0E0E0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <line x1="107" y1="48" x2="88" y2="80" stroke="#888" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <line x1="153" y1="48" x2="134" y2="80" stroke="#888" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <line x1="199" y1="48" x2="180" y2="80" stroke="#888" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
      </svg>
    )
  },
  danza: {
    bg: '#1A0820',
    colorPrimary: '#F4A7CE',
    colorSecondary: '#D6336C',
    label: 'Danza',
    icon: (
      // Phosphor duotone: PersonSimpleDance
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 256 256">
        <circle cx="160" cy="48" r="24" fill="#F4A7CE" opacity="0.3"/>
        <circle cx="160" cy="48" r="24" fill="none" stroke="#F4A7CE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <path d="M48,120l64-16,32,48,32-64" fill="none" stroke="#F4A7CE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <path d="M144,88l-32,80H80" fill="none" stroke="#D6336C" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <path d="M112,168l16,56" fill="none" stroke="#D6336C" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
      </svg>
    )
  },
  muestra: {
    bg: '#0B1F14',
    colorPrimary: '#7DCCA4',
    colorSecondary: '#2D6A4F',
    label: 'Muestra',
    icon: (
      // Phosphor duotone: PaintBrushBroad
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 256 256">
        <path d="M56,216c0-24,24-40,48-40s48,16,48,40a48,48,0,0,1-96,0Z" fill="#7DCCA4" opacity="0.25"/>
        <path d="M56,216c0-24,24-40,48-40s48,16,48,40a48,48,0,0,1-96,0Z" fill="none" stroke="#7DCCA4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <path d="M152,176,224,48" fill="none" stroke="#7DCCA4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <path d="M104,176c0-17.67,21.49-32,48-32" fill="none" stroke="#2D6A4F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
      </svg>
    )
  },
  charla: {
    bg: '#0A1628',
    colorPrimary: '#93C5FD',
    colorSecondary: '#3B82F6',
    label: 'Charla',
    icon: (
      // Phosphor duotone: Microphone
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 256 256">
        <rect x="88" y="24" width="80" height="128" rx="40" fill="#93C5FD" opacity="0.2"/>
        <rect x="88" y="24" width="80" height="128" rx="40" fill="none" stroke="#93C5FD" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <path d="M48,128a80,80,0,0,0,160,0" fill="none" stroke="#3B82F6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <line x1="128" y1="208" x2="128" y2="240" stroke="#3B82F6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <line x1="96" y1="240" x2="160" y2="240" stroke="#3B82F6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
      </svg>
    )
  },
  taller: {
    bg: '#1A1200',
    colorPrimary: '#FCD34D',
    colorSecondary: '#D97706',
    label: 'Taller',
    icon: (
      // Phosphor duotone: Wrench
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 256 256">
        <path d="M218.83,103.77l-80,80a12,12,0,0,1-17,0L33.17,95.06a12,12,0,0,1,0-17C70,41.56,148,33,193.09,62.91A12,12,0,0,1,218.83,103.77Z" fill="#FCD34D" opacity="0.2"/>
        <path d="M218.83,103.77l-80,80a12,12,0,0,1-17,0L33.17,95.06a12,12,0,0,1,0-17C70,41.56,148,33,193.09,62.91A12,12,0,0,1,218.83,103.77Z" fill="none" stroke="#FCD34D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <line x1="100" y1="156" x2="60" y2="196" stroke="#D97706" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
      </svg>
    )
  },
  festival: {
    bg: '#1A0A00',
    colorPrimary: '#FDBA74',
    colorSecondary: '#EA580C',
    label: 'Festival',
    icon: (
      // Phosphor duotone: Star
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 256 256">
        <path d="M128,24l29.09,62.26L224,94.81l-50,48.29,12.24,67.54L128,177.51,69.76,210.64,82,143.1,32,94.81l66.91-8.55Z" fill="#FDBA74" opacity="0.25"/>
        <path d="M128,24l29.09,62.26L224,94.81l-50,48.29,12.24,67.54L128,177.51,69.76,210.64,82,143.1,32,94.81l66.91-8.55Z" fill="none" stroke="#FDBA74" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
      </svg>
    )
  },
  deporte: {
    bg: '#001A0A',
    colorPrimary: '#6EE7B7',
    colorSecondary: '#059669',
    label: 'Deporte',
    icon: (
      // Phosphor duotone: Trophy
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 256 256">
        <path d="M56,56V168a72,72,0,0,0,144,0V56Z" fill="#6EE7B7" opacity="0.2"/>
        <path d="M56,56V168a72,72,0,0,0,144,0V56Z" fill="none" stroke="#6EE7B7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <path d="M56,88H24A16,16,0,0,0,40,104" fill="none" stroke="#059669" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <path d="M200,88h32a16,16,0,0,1-16,16" fill="none" stroke="#059669" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <line x1="128" y1="240" x2="128" y2="208" stroke="#059669" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
        <line x1="96" y1="240" x2="160" y2="240" stroke="#059669" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"/>
      </svg>
    )
  },
  otro: {
    bg: '#1A1410',
    colorPrimary: '#D6D3D1',
    colorSecondary: '#78716C',
    label: 'Otro',
    icon: (
      // Phosphor duotone: Sparkle
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 256 256">
        <path d="M152,128l-32,8-8,32-8-32L72,128l32-8,8-32,8,32Z" fill="#D6D3D1" opacity="0.3"/>
        <path d="M152,128l-32,8-8,32-8-32L72,128l32-8,8-32,8,32Z" fill="none" stroke="#D6D3D1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12"/>
        <path d="M224,64l-16,4-4,16-4-16L184,64l16-4,4-16,4,16Z" fill="#78716C" opacity="0.6"/>
        <path d="M80,32l-8,2-2,8-2-8L60,32l8-2,2-8,2,8Z" fill="#78716C" opacity="0.6"/>
      </svg>
    )
  },
}

// Fallback si la categoría no tiene config
const PLACEHOLDER_DEFAULT = PLACEHOLDER_CONFIG['otro']

function getPlaceholder(categorias: string[]) {
  for (const cat of categorias) {
    if (PLACEHOLDER_CONFIG[cat]) return PLACEHOLDER_CONFIG[cat]
  }
  return PLACEHOLDER_DEFAULT
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
  const placeholder = getPlaceholder(evento.categorias)

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
      {/* IMAGEN / PLACEHOLDER */}
      <div style={{ position: 'relative', width: '100%', height: '176px', overflow: 'hidden' }}>
        {evento.imagen ? (
          // Si hay imagen real, la mostramos — si falla la carga, el onError muestra el placeholder
          <img
            src={evento.imagen}
            alt={evento.titulo}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              // Si la imagen falla, ocultamos el img y mostramos el placeholder padre
              const target = e.currentTarget as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent) {
                parent.style.background = placeholder.bg
                parent.style.display = 'flex'
                parent.style.alignItems = 'center'
                parent.style.justifyContent = 'center'
              }
            }}
          />
        ) : (
          // Placeholder Phosphor duotone
          <div style={{
            width: '100%', height: '100%',
            background: placeholder.bg,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '10px'
          }}>
            {placeholder.icon}
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '10px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.15em',
              color: placeholder.colorPrimary, opacity: 0.6
            }}>
              {placeholder.label}
            </span>
          </div>
        )}

        {/* CHIP CATEGORÍA */}
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

        {/* BADGE GRATIS */}
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
