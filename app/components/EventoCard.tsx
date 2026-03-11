// ============================================================
// app/components/EventoCard.tsx
// Componente que muestra un evento individual en la agenda.
// Recibe un objeto de tipo Evento y lo renderiza como una card.
// ============================================================

import { Evento } from '@/app/lib/getEventos'

// Mapa de slugs de categoría → emoji + etiqueta legible
// Solo las categorías que queremos mostrar visualmente
const CATEGORIAS_DISPLAY: Record<string, { emoji: string; label: string }> = {
  'cine':          { emoji: '🎬', label: 'Cine' },
  'teatro':        { emoji: '🎭', label: 'Teatro' },
  'musica':        { emoji: '🎵', label: 'Música' },
  'danza':         { emoji: '💃', label: 'Danza' },
  'muestras':      { emoji: '🖼️', label: 'Muestra' },
  'artes-visuales':{ emoji: '🎨', label: 'Artes Visuales' },
  'charla':        { emoji: '🎤', label: 'Charla' },
  'literatura':    { emoji: '📚', label: 'Literatura' },
  'coro':          { emoji: '🎶', label: 'Coro' },
  'eventos-especiales': { emoji: '⭐', label: 'Especial' },
}

// --- HELPERS ---

// Convierte "2026-03-13 20:00:00" → "Vie 13 mar · 20:00 hs"
function formatearFechaLegible(fechaStr: string): string {
  const fecha = new Date(fechaStr.replace(' ', 'T')) // compatibilidad cross-browser
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

  const diaSemana = diasSemana[fecha.getDay()]
  const dia = fecha.getDate()
  const mes = meses[fecha.getMonth()]
  const hora = String(fecha.getHours()).padStart(2, '0')
  const minutos = String(fecha.getMinutes()).padStart(2, '0')

  return `${diaSemana} ${dia} ${mes} · ${hora}:${minutos} hs`
}

// Trunca la descripción a un máximo de caracteres
function truncar(texto: string, max: number): string {
  if (texto.length <= max) return texto
  return texto.slice(0, max).trimEnd() + '…'
}

// Encuentra la primera categoría "visual" del evento (la que mostramos como badge)
function getCategoriaDisplay(categorias: string[]) {
  for (const slug of categorias) {
    if (CATEGORIAS_DISPLAY[slug]) return CATEGORIAS_DISPLAY[slug]
  }
  return null
}

// --- COMPONENTE ---

type Props = {
  evento: Evento
}

export default function EventoCard({ evento }: Props) {
  const categoriaDisplay = getCategoriaDisplay(evento.categorias)
  const fechaLegible = formatearFechaLegible(evento.fecha_inicio)

  return (
    <a
      href={evento.url_evento}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 border border-stone-100"
    >
      {/* IMAGEN */}
      <div className="relative w-full h-44 bg-stone-100 overflow-hidden">
        {evento.imagen ? (
          <img
            src={evento.imagen}
            alt={evento.titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          // Placeholder cuando no hay imagen
          <div className="w-full h-full flex items-center justify-center bg-[#D8F3DC]">
            <span className="text-4xl">🎭</span>
          </div>
        )}

        {/* BADGE DE CATEGORÍA — arriba a la izquierda */}
        {categoriaDisplay && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-xs font-semibold px-2 py-1 rounded-full text-stone-700">
            <span>{categoriaDisplay.emoji}</span>
            <span>{categoriaDisplay.label}</span>
          </div>
        )}

        {/* BADGE DE GRATIS — arriba a la derecha */}
        {evento.es_gratis && (
          <div className="absolute top-3 right-3 bg-[#2D6A4F] text-white text-xs font-bold px-2 py-1 rounded-full">
            GRATIS
          </div>
        )}
      </div>

      {/* CONTENIDO */}
      <div className="p-4">

        {/* FECHA */}
        <p className="text-xs font-semibold text-[#E07A2F] uppercase tracking-wide mb-1">
          {fechaLegible}
        </p>

        {/* TÍTULO */}
        <h3 className="font-semibold text-[#1B4332] text-base leading-snug mb-2 group-hover:text-[#2D6A4F] transition-colors">
          {evento.titulo}
        </h3>

        {/* DESCRIPCIÓN */}
        {evento.descripcion && (
          <p className="text-stone-500 text-sm leading-relaxed mb-3">
            {truncar(evento.descripcion, 100)}
          </p>
        )}

        {/* VENUE */}
        <div className="flex items-start gap-1.5 text-xs text-stone-400">
          <span className="mt-0.5 flex-shrink-0">📍</span>
          <span className="leading-tight">{evento.venue_nombre}</span>
        </div>

      </div>
    </a>
  )
}
