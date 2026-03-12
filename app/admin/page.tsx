'use client'

// ============================================================
// app/admin/page.tsx
// Panel de administración de VuelteandoCBA.
// Funcionalidad principal: pegar URL del blog de Córdoba Cultura,
// la IA extrae los eventos y los guarda en Firestore.
// ============================================================

import { useState } from 'react'
import { db } from '../lib/firebase'
import { collection, addDoc, Timestamp } from 'firebase/firestore'

// --- Tipos ---
interface Evento {
  titulo: string
  descripcion: string
  fecha_inicio: string
  fecha_fin: string
  hora: string
  venue: string
  direccion: string
  costo: string
  es_gratis: boolean
  categoria: string
  imagen_url: string
  barrio: string
  fuente_url: string
}

// --- Categorías disponibles ---
const CATEGORIAS = [
  'teatro', 'música', 'cine', 'danza', 'muestra',
  'charla', 'taller', 'festival', 'deporte', 'otro'
]

export default function AdminPage() {
  const [url, setUrl] = useState('')
  const [cargando, setCargando] = useState(false)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState<number[]>([])
  const [guardados, setGuardados] = useState<number[]>([])
  const [mensajeExito, setMensajeExito] = useState('')

  // ============================================================
  // PASO 1: Leer el contenido de la URL del blog
  // Usamos un proxy público para evitar problemas de CORS
  // ============================================================
async function leerContenidoURL(url: string): Promise<string> {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`
    const res = await fetch(proxyUrl)
    if (!res.ok) throw new Error('No se pudo acceder a la URL')
    return await res.text()
  }
  // ============================================================
  // PASO 2: Extraer texto limpio del HTML
  // Removemos tags HTML para que la IA reciba texto legible
  // ============================================================
  function extraerTextoDeHTML(html: string): string {
    // Crear un elemento DOM temporal para parsear el HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Remover scripts, styles y nav para limpiar el texto
    doc.querySelectorAll('script, style, nav, header, footer').forEach(el => el.remove())

    // Buscar el contenido principal del post
    const contenido =
      doc.querySelector('.entry-content') ||
      doc.querySelector('.post-content') ||
      doc.querySelector('article') ||
      doc.querySelector('main') ||
      doc.body

return contenido?.textContent || ''
  }

  // ============================================================
  // PASO 3: Enviar el texto a Claude y pedir el JSON de eventos
  // ============================================================
  async function extraerEventosConIA(texto: string, urlFuente: string): Promise<Evento[]> {
    const hoy = new Date().toISOString().split('T')[0]

    const prompt = `Sos un asistente que extrae información de agendas culturales de Córdoba, Argentina.

A continuación te doy el texto de una página web con una agenda de eventos.
Extraé TODOS los eventos que encuentres y devolvé un JSON array.

FECHA DE REFERENCIA: ${hoy}
URL DE LA FUENTE: ${urlFuente}

Para cada evento, devolvé este objeto:
{
  "titulo": "nombre del evento",
  "descripcion": "descripción corta, máximo 150 caracteres",
  "fecha_inicio": "YYYY-MM-DD",
  "fecha_fin": "YYYY-MM-DD (igual que fecha_inicio si es un día)",
  "hora": "HH:MM (formato 24hs, vacío si no se menciona)",
  "venue": "nombre del lugar",
  "direccion": "dirección completa si se menciona, vacío si no",
  "costo": "precio en texto, o 'Gratis' si es gratuito",
  "es_gratis": true o false,
  "categoria": "una de: teatro, música, cine, danza, muestra, charla, taller, festival, deporte, otro",
  "imagen_url": "",
  "barrio": "barrio de Córdoba si se menciona, vacío si no",
  "fuente_url": "${urlFuente}"
}

REGLAS IMPORTANTES:
- Si un evento dura varios días, poné fecha_inicio y fecha_fin distintas
- Si el costo no se menciona, poné costo: "" y es_gratis: false
- Si dice "entrada libre" o "gratuito" o "gratis", es_gratis: true
- Devolvé SOLO el JSON array, sin texto adicional, sin markdown, sin explicaciones

TEXTO DE LA AGENDA:
${texto.slice(0, 8000)}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!res.ok) throw new Error('Error al llamar a la IA')
    const data = await res.json()
    const texto_respuesta = data.content?.[0]?.text || '[]'

    // Parsear el JSON devuelto por la IA
    const clean = texto_respuesta.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  }

  // ============================================================
  // Handler principal: leer URL → extraer texto → IA → mostrar tabla
  // ============================================================
  async function handleExtraer() {
    if (!url.trim()) return
    setCargando(true)
    setError('')
    setEventos([])
    setGuardados([])

    try {
      const html = await leerContenidoURL(url)
      const texto = extraerTextoDeHTML(html)
      if (!texto || texto.length < 100) throw new Error('No se pudo extraer contenido de la página')
      const eventosExtraidos = await extraerEventosConIA(texto, url)
      if (!Array.isArray(eventosExtraidos) || eventosExtraidos.length === 0) {
        throw new Error('La IA no encontró eventos en esa página')
      }
      setEventos(eventosExtraidos)
    } catch (e: any) {
      setError(e.message || 'Ocurrió un error inesperado')
    } finally {
      setCargando(false)
    }
  }

  // ============================================================
  // Editar un campo de un evento en la tabla
  // ============================================================
  function editarCampo(index: number, campo: keyof Evento, valor: string | boolean) {
    setEventos(prev => prev.map((ev, i) =>
      i === index ? { ...ev, [campo]: valor } : ev
    ))
  }

  // ============================================================
  // Guardar un evento individual en Firestore
  // ============================================================
  async function guardarEvento(index: number) {
    setGuardando(prev => [...prev, index])
    try {
      const evento = eventos[index]
      await addDoc(collection(db, 'eventos'), {
        ...evento,
        estado: 'publicado',
        creado_en: Timestamp.now(),
        actualizado_en: Timestamp.now(),
      })
      setGuardados(prev => [...prev, index])
      setMensajeExito(`✅ "${evento.titulo}" guardado en Firestore`)
      setTimeout(() => setMensajeExito(''), 3000)
    } catch (e: any) {
      setError(`Error al guardar: ${e.message}`)
    } finally {
      setGuardando(prev => prev.filter(i => i !== index))
    }
  }

  // ============================================================
  // Guardar todos los eventos de una vez
  // ============================================================
  async function guardarTodos() {
    const pendientes = eventos
      .map((_, i) => i)
      .filter(i => !guardados.includes(i))

    for (const i of pendientes) {
      await guardarEvento(i)
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F0', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#2D6A4F', padding: '24px 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '28px' }}>🛠️</span>
        <div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '22px', fontFamily: 'Fraunces, serif' }}>
            Panel de Admin — VuelteandoCBA
          </h1>
          <p style={{ color: '#D8F3DC', margin: 0, fontSize: '14px' }}>
            Extraé eventos del blog de Córdoba Cultura con IA
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Sección: ingresar URL */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '24px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
        }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '18px', color: '#1a1a1a', fontFamily: 'Fraunces, serif' }}>
            1. Pegá la URL de la agenda semanal
          </h2>
          <p style={{ margin: '0 0 20px', color: '#666', fontSize: '14px' }}>
            Ejemplo: <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
              https://cultura.cba.gov.ar/agenda-cultural-de-eventos-del-09-al-15-de-marzo/
            </code>
          </p>

          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://cultura.cba.gov.ar/agenda-cultural-..."
              onKeyDown={e => e.key === 'Enter' && handleExtraer()}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '10px',
                border: '2px solid #e0e0e0',
                fontSize: '15px',
                outline: 'none',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#2D6A4F')}
              onBlur={e => (e.target.style.borderColor = '#e0e0e0')}
            />
            <button
              onClick={handleExtraer}
              disabled={cargando || !url.trim()}
              style={{
                padding: '12px 28px',
                background: cargando ? '#999' : '#2D6A4F',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: cargando ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'background 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {cargando ? '⏳ Analizando...' : '🤖 Extraer eventos'}
            </button>
          </div>

          {/* Estado de carga */}
          {cargando && (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: '#D8F3DC', borderRadius: '8px', color: '#2D6A4F', fontSize: '14px' }}>
              ⏳ La IA está leyendo la agenda... esto puede tardar unos segundos.
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: '#FFF0F0', borderRadius: '8px', color: '#c0392b', fontSize: '14px' }}>
              ❌ {error}
            </div>
          )}

          {/* Éxito al guardar */}
          {mensajeExito && (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: '#D8F3DC', borderRadius: '8px', color: '#2D6A4F', fontSize: '14px' }}>
              {mensajeExito}
            </div>
          )}
        </div>

        {/* Sección: tabla de eventos */}
        {eventos.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '18px', color: '#1a1a1a', fontFamily: 'Fraunces, serif' }}>
                  2. Revisá y guardá los eventos
                </h2>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                  La IA encontró <strong>{eventos.length} eventos</strong>. Podés editar cualquier campo antes de guardar.
                </p>
              </div>
              <button
                onClick={guardarTodos}
                style={{
                  padding: '10px 24px',
                  background: '#E07A2F',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                💾 Guardar todos en Firestore
              </button>
            </div>

            {/* Cards de eventos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {eventos.map((ev, i) => (
                <div key={i} style={{
                  border: guardados.includes(i)
                    ? '2px solid #2D6A4F'
                    : '2px solid #e8e8e8',
                  borderRadius: '12px',
                  padding: '20px',
                  background: guardados.includes(i) ? '#F0FFF4' : 'white',
                  transition: 'all 0.3s',
                }}>

                  {/* Fila superior: título + badge guardado */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' }}>
                    <input
                      value={ev.titulo}
                      onChange={e => editarCampo(i, 'titulo', e.target.value)}
                      style={{
                        flex: 1,
                        fontSize: '17px',
                        fontWeight: 700,
                        border: 'none',
                        background: 'transparent',
                        fontFamily: 'Fraunces, serif',
                        color: '#1a1a1a',
                        outline: 'none',
                        borderBottom: '1px dashed #ccc',
                        paddingBottom: '4px',
                      }}
                    />
                    {guardados.includes(i) && (
                      <span style={{ background: '#2D6A4F', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        ✅ Guardado
                      </span>
                    )}
                  </div>

                  {/* Grid de campos */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>

                    <Campo label="📅 Fecha inicio">
                      <input type="date" value={ev.fecha_inicio}
                        onChange={e => editarCampo(i, 'fecha_inicio', e.target.value)}
                        style={inputStyle} />
                    </Campo>

                    <Campo label="📅 Fecha fin">
                      <input type="date" value={ev.fecha_fin}
                        onChange={e => editarCampo(i, 'fecha_fin', e.target.value)}
                        style={inputStyle} />
                    </Campo>

                    <Campo label="🕐 Hora">
                      <input type="time" value={ev.hora}
                        onChange={e => editarCampo(i, 'hora', e.target.value)}
                        style={inputStyle} />
                    </Campo>

                    <Campo label="🏛️ Venue">
                      <input value={ev.venue}
                        onChange={e => editarCampo(i, 'venue', e.target.value)}
                        style={inputStyle} />
                    </Campo>

                    <Campo label="📍 Dirección">
                      <input value={ev.direccion}
                        onChange={e => editarCampo(i, 'direccion', e.target.value)}
                        style={inputStyle} />
                    </Campo>

                    <Campo label="🏘️ Barrio">
                      <input value={ev.barrio}
                        onChange={e => editarCampo(i, 'barrio', e.target.value)}
                        style={inputStyle} />
                    </Campo>

                    <Campo label="💰 Costo">
                      <input value={ev.costo}
                        onChange={e => editarCampo(i, 'costo', e.target.value)}
                        style={inputStyle} />
                    </Campo>

                    <Campo label="🎭 Categoría">
                      <select value={ev.categoria}
                        onChange={e => editarCampo(i, 'categoria', e.target.value)}
                        style={inputStyle}>
                        {CATEGORIAS.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </Campo>

                    <Campo label="🆓 ¿Es gratis?">
                      <select
                        value={ev.es_gratis ? 'si' : 'no'}
                        onChange={e => editarCampo(i, 'es_gratis', e.target.value === 'si')}
                        style={{ ...inputStyle, color: ev.es_gratis ? '#2D6A4F' : '#666' }}>
                        <option value="si">✅ Sí, es gratis</option>
                        <option value="no">💵 No, tiene costo</option>
                      </select>
                    </Campo>

                  </div>

                  {/* Descripción */}
                  <Campo label="📝 Descripción">
                    <textarea
                      value={ev.descripcion}
                      onChange={e => editarCampo(i, 'descripcion', e.target.value)}
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                    />
                  </Campo>

                  {/* Botón guardar individual */}
                  {!guardados.includes(i) && (
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => guardarEvento(i)}
                        disabled={guardando.includes(i)}
                        style={{
                          padding: '8px 20px',
                          background: guardando.includes(i) ? '#999' : '#2D6A4F',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: guardando.includes(i) ? 'not-allowed' : 'pointer',
                          fontFamily: 'DM Sans, sans-serif',
                        }}
                      >
                        {guardando.includes(i) ? '⏳ Guardando...' : '💾 Guardar este evento'}
                      </button>
                    </div>
                  )}

                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ============================================================
// Componente auxiliar: Campo con label
// ============================================================
function Campo({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ============================================================
// Estilos reutilizables para inputs
// ============================================================
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1.5px solid #e0e0e0',
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: 'DM Sans, sans-serif',
  color: '#1a1a1a',
  background: '#FAFAFA',
  boxSizing: 'border-box',
  outline: 'none',
}
