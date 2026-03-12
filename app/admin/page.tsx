'use client'

// ============================================================
// app/admin/page.tsx
// Panel de administración de VuelteandoCBA.
// Flujo: pegás la URL → el proxy fetchea el contenido →
// copiás el texto → lo procesás con IA externamente →
// pegás el JSON → revisás y guardás en Firestore.
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

// --- Password de admin desde variable de entorno ---
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ''

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [autenticado, setAutenticado] = useState(false)
  const [errorAuth, setErrorAuth] = useState('')

  const [url, setUrl] = useState('')
  const [fetcheando, setFetcheando] = useState(false)
  const [textoAgenda, setTextoAgenda] = useState('')
  const [errorFetch, setErrorFetch] = useState('')

  const [jsonInput, setJsonInput] = useState('')
  const [eventos, setEventos] = useState<Evento[]>([])
  const [errorJson, setErrorJson] = useState('')

  const [guardando, setGuardando] = useState<number[]>([])
  const [guardados, setGuardados] = useState<number[]>([])
  const [mensajeExito, setMensajeExito] = useState('')

  // ============================================================
  // AUTENTICACIÓN simple con password
  // ============================================================
  function handleLogin() {
    if (password === ADMIN_PASSWORD) {
      setAutenticado(true)
      setErrorAuth('')
    } else {
      setErrorAuth('Password incorrecta')
    }
  }

  // ============================================================
  // PASO 1: Fetchear el contenido de la URL via proxy propio
  // ============================================================
  async function handleFetchear() {
    if (!url.trim()) return
    setFetcheando(true)
    setErrorFetch('')
    setTextoAgenda('')

    try {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error('No se pudo acceder a la URL')
      const html = await res.text()

      // Extraer texto limpio del HTML
      let texto = html
      texto = texto.replace(/<script[\s\S]*?<\/script>/gi, '')
      texto = texto.replace(/<style[\s\S]*?<\/style>/gi, '')

      // Intentar extraer solo el contenido del post de WordPress
      const matchContenido = texto.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*entry-meta/i)
      if (matchContenido) texto = matchContenido[1]

      texto = texto.replace(/<[^>]+>/g, ' ')
      texto = texto.replace(/&nbsp;/g, ' ')
      texto = texto.replace(/&amp;/g, '&')
      texto = texto.replace(/&lt;/g, '<')
      texto = texto.replace(/&gt;/g, '>')
      texto = texto.replace(/\s{3,}/g, '\n\n')
      texto = texto.trim()

      if (texto.length < 100) throw new Error('No se pudo extraer contenido de la página')
      setTextoAgenda(texto)
    } catch (e: any) {
      setErrorFetch(e.message || 'Error inesperado')
    } finally {
      setFetcheando(false)
    }
  }

  // ============================================================
  // PASO 2: Parsear el JSON pegado por el usuario
  // ============================================================
  function handleParsearJSON() {
    setErrorJson('')
    try {
      const clean = jsonInput.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      if (!Array.isArray(parsed)) throw new Error('El JSON debe ser un array de eventos')
      setEventos(parsed)
    } catch (e: any) {
      setErrorJson('JSON inválido: ' + e.message)
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
      setErrorJson(`Error al guardar: ${e.message}`)
    } finally {
      setGuardando(prev => prev.filter(i => i !== index))
    }
  }

  // ============================================================
  // Guardar todos los eventos de una vez
  // ============================================================
  async function guardarTodos() {
    const pendientes = eventos.map((_, i) => i).filter(i => !guardados.includes(i))
    for (const i of pendientes) await guardarEvento(i)
  }

  // ============================================================
  // PANTALLA DE LOGIN
  // ============================================================
  if (!autenticado) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FAF7F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          width: '360px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🛠️</div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', margin: '0 0 8px', color: '#1a1a1a' }}>
            Panel de Admin
          </h1>
          <p style={{ color: '#888', fontSize: '14px', margin: '0 0 28px' }}>
            VuelteandoCBA
          </p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e0e0e0',
              borderRadius: '10px',
              fontSize: '15px',
              fontFamily: 'DM Sans, sans-serif',
              boxSizing: 'border-box',
              marginBottom: '12px',
              outline: 'none',
            }}
          />
          {errorAuth && (
            <p style={{ color: '#c0392b', fontSize: '13px', margin: '0 0 12px' }}>{errorAuth}</p>
          )}
          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '12px',
              background: '#2D6A4F',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Entrar
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // PANTALLA PRINCIPAL DEL ADMIN
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
            Cargá eventos desde la agenda de Córdoba Cultura
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        {/* PASO 1: Fetchear URL */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '28px', marginBottom: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
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
              onKeyDown={e => e.key === 'Enter' && handleFetchear()}
              placeholder="https://cultura.cba.gov.ar/agenda-cultural-..."
              style={{
                flex: 1, padding: '12px 16px', borderRadius: '10px',
                border: '2px solid #e0e0e0', fontSize: '15px', outline: 'none',
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
            <button
              onClick={handleFetchear}
              disabled={fetcheando || !url.trim()}
              style={{
                padding: '12px 28px', background: fetcheando ? '#999' : '#2D6A4F',
                color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px',
                fontWeight: 600, cursor: fetcheando ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
              }}
            >
              {fetcheando ? '⏳ Cargando...' : '🔍 Obtener texto'}
            </button>
          </div>
          {errorFetch && (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: '#FFF0F0', borderRadius: '8px', color: '#c0392b', fontSize: '14px' }}>
              ❌ {errorFetch}
            </div>
          )}
          {textoAgenda && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <p style={{ margin: 0, color: '#2D6A4F', fontSize: '14px', fontWeight: 600 }}>
                  ✅ Texto extraído ({textoAgenda.length} caracteres) — copialo y procesalo con IA
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(textoAgenda)}
                  style={{
                    padding: '6px 16px', background: '#D8F3DC', color: '#2D6A4F',
                    border: 'none', borderRadius: '8px', fontSize: '13px',
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  📋 Copiar texto
                </button>
              </div>
              <textarea
                value={textoAgenda}
                readOnly
                rows={6}
                style={{
                  width: '100%', padding: '12px', border: '1.5px solid #e0e0e0',
                  borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace',
                  background: '#FAFAFA', boxSizing: 'border-box', resize: 'vertical',
                  color: '#444',
                }}
              />
            </div>
          )}
        </div>

        {/* PASO 2: Pegar JSON */}
        {textoAgenda && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', marginBottom: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '18px', color: '#1a1a1a', fontFamily: 'Fraunces, serif' }}>
              2. Pegá el JSON generado por la IA
            </h2>
            <p style={{ margin: '0 0 20px', color: '#666', fontSize: '14px' }}>
              Procesá el texto con Claude u otra IA y pegá el JSON resultante acá.
            </p>
            <textarea
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              rows={8}
              placeholder={'[\n  {\n    "titulo": "Nombre del evento",\n    "fecha_inicio": "2026-03-09",\n    ...\n  }\n]'}
              style={{
                width: '100%', padding: '12px', border: '2px solid #e0e0e0',
                borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace',
                boxSizing: 'border-box', resize: 'vertical', outline: 'none',
              }}
            />
            {errorJson && (
              <div style={{ marginTop: '12px', padding: '12px 16px', background: '#FFF0F0', borderRadius: '8px', color: '#c0392b', fontSize: '14px' }}>
                ❌ {errorJson}
              </div>
            )}
            <button
              onClick={handleParsearJSON}
              disabled={!jsonInput.trim()}
              style={{
                marginTop: '12px', padding: '12px 28px', background: '#2D6A4F',
                color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px',
                fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}
            >
              ✅ Cargar eventos
            </button>
          </div>
        )}

        {/* PASO 3: Revisar y guardar */}
        {eventos.length > 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '18px', color: '#1a1a1a', fontFamily: 'Fraunces, serif' }}>
                  3. Revisá y guardá los eventos
                </h2>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                  <strong>{eventos.length} eventos</strong> listos — podés editar cualquier campo antes de guardar.
                </p>
              </div>
              <button
                onClick={guardarTodos}
                style={{
                  padding: '10px 24px', background: '#E07A2F', color: 'white',
                  border: 'none', borderRadius: '10px', fontSize: '14px',
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                }}
              >
                💾 Guardar todos en Firestore
              </button>
            </div>

            {mensajeExito && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#D8F3DC', borderRadius: '8px', color: '#2D6A4F', fontSize: '14px' }}>
                {mensajeExito}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {eventos.map((ev, i) => (
                <div key={i} style={{
                  border: guardados.includes(i) ? '2px solid #2D6A4F' : '2px solid #e8e8e8',
                  borderRadius: '12px', padding: '20px',
                  background: guardados.includes(i) ? '#F0FFF4' : 'white',
                  transition: 'all 0.3s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' }}>
                    <input
                      value={ev.titulo}
                      onChange={e => editarCampo(i, 'titulo', e.target.value)}
                      style={{
                        flex: 1, fontSize: '17px', fontWeight: 700, border: 'none',
                        background: 'transparent', fontFamily: 'Fraunces, serif',
                        color: '#1a1a1a', outline: 'none',
                        borderBottom: '1px dashed #ccc', paddingBottom: '4px',
                      }}
                    />
                    {guardados.includes(i) && (
                      <span style={{ background: '#2D6A4F', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        ✅ Guardado
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                    <Campo label="📅 Fecha inicio">
                      <input type="date" value={ev.fecha_inicio} onChange={e => editarCampo(i, 'fecha_inicio', e.target.value)} style={inputStyle} />
                    </Campo>
                    <Campo label="📅 Fecha fin">
                      <input type="date" value={ev.fecha_fin} onChange={e => editarCampo(i, 'fecha_fin', e.target.value)} style={inputStyle} />
                    </Campo>
                    <Campo label="🕐 Hora">
                      <input type="time" value={ev.hora} onChange={e => editarCampo(i, 'hora', e.target.value)} style={inputStyle} />
                    </Campo>
                    <Campo label="🏛️ Venue">
                      <input value={ev.venue} onChange={e => editarCampo(i, 'venue', e.target.value)} style={inputStyle} />
                    </Campo>
                    <Campo label="📍 Dirección">
                      <input value={ev.direccion} onChange={e => editarCampo(i, 'direccion', e.target.value)} style={inputStyle} />
                    </Campo>
                    <Campo label="🏘️ Barrio">
                      <input value={ev.barrio} onChange={e => editarCampo(i, 'barrio', e.target.value)} style={inputStyle} />
                    </Campo>
                    <Campo label="💰 Costo">
                      <input value={ev.costo} onChange={e => editarCampo(i, 'costo', e.target.value)} style={inputStyle} />
                    </Campo>
                    <Campo label="🎭 Categoría">
                      <select value={ev.categoria} onChange={e => editarCampo(i, 'categoria', e.target.value)} style={inputStyle}>
                        {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </Campo>
                    <Campo label="🆓 ¿Es gratis?">
                      <select
                        value={ev.es_gratis ? 'si' : 'no'}
                        onChange={e => editarCampo(i, 'es_gratis', e.target.value === 'si')}
                        style={{ ...inputStyle, color: ev.es_gratis ? '#2D6A4F' : '#666' }}
                      >
                        <option value="si">✅ Sí, es gratis</option>
                        <option value="no">💵 No, tiene costo</option>
                      </select>
                    </Campo>
                  </div>

                  <Campo label="📝 Descripción">
                    <textarea
                      value={ev.descripcion}
                      onChange={e => editarCampo(i, 'descripcion', e.target.value)}
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                    />
                  </Campo>

                  {!guardados.includes(i) && (
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => guardarEvento(i)}
                        disabled={guardando.includes(i)}
                        style={{
                          padding: '8px 20px', background: guardando.includes(i) ? '#999' : '#2D6A4F',
                          color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px',
                          fontWeight: 600, cursor: guardando.includes(i) ? 'not-allowed' : 'pointer',
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

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1.5px solid #e0e0e0',
  borderRadius: '8px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
  color: '#1a1a1a', background: '#FAFAFA', boxSizing: 'border-box', outline: 'none',
}
