// ============================================================
// app/lib/getEventos.ts
// Función que consume la API de Córdoba Cultura y devuelve
// los eventos del mes en curso, filtrados por Córdoba capital.
// ============================================================

// --- TIPOS ---
// Definimos la forma exacta de los datos que nos interesa guardar.
// Todo lo demás que devuelve la API lo ignoramos.

export type Evento = {
  id: number
  titulo: string
  descripcion: string
  imagen: string | null       // puede no tener imagen
  fecha_inicio: string        // formato: "2026-03-13 20:00:00"
  fecha_fin: string
  es_gratis: boolean
  costo: string               // texto libre, ej: "$500" o ""
  venue_nombre: string
  venue_direccion: string
  venue_ciudad: string
  categorias: string[]        // slugs, ej: ["cine", "gratis"]
  url_evento: string          // link a cultura.cba.gov.ar
}

// --- FUNCIÓN PRINCIPAL ---

export async function getEventos(): Promise<Evento[]> {

  // Calculamos el rango de fechas: desde hoy hasta fin del mes
  const hoy = new Date()
  const finDeMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0) // día 0 del mes siguiente = último día del mes actual

  // Formateamos las fechas como las espera la API: "YYYY-MM-DD"
  const fechaInicio = formatearFecha(hoy)
  const fechaFin = formatearFecha(finDeMes)

  // Construimos la URL con los parámetros
  // per_page=100 para traer suficientes eventos en una sola llamada
  const url = `https://cultura.cba.gov.ar/wp-json/tribe/events/v1/events?per_page=100&start_date=${fechaInicio}&end_date=${fechaFin}&status=publish`

  try {
    const respuesta = await fetch(url, {
      // Next.js cache: revalidamos cada 3 horas
      // Así no llamamos a la API en cada visita, pero los datos se mantienen frescos
      next: { revalidate: 10800 }
    })

    if (!respuesta.ok) {
      console.error('Error al llamar a la API de Córdoba Cultura:', respuesta.status)
      return []
    }

    const datos = await respuesta.json()

    // La API devuelve los eventos dentro de un array llamado "events"
    const eventosRaw = datos.events ?? []

    // Filtramos y transformamos los datos
    const eventosFiltrados: Evento[] = eventosRaw

      // FILTRO 1: Solo eventos de Córdoba capital
      // Los venues de Córdoba capital tienen city === "Córdoba"
      // Los del interior tienen otra ciudad (Río Cuarto, Villa María, etc.)
      .filter((e: any) => e.venue?.city === 'Córdoba')

      // TRANSFORMACIÓN: Convertimos el objeto crudo de la API
      // en nuestro tipo Evento, limpio y predecible
      .map((e: any): Evento => ({
        id: e.id,
        titulo: e.title,
        descripcion: limpiarHTML(e.description ?? ''),
        imagen: e.image?.sizes?.medium?.url ?? e.image?.url ?? null,
        fecha_inicio: e.start_date,
        fecha_fin: e.end_date,

        // Para saber si es gratis miramos las categorías, NO el campo cost
        // (confirmado en el testeo: cost viene vacío aunque el evento sea gratis)
        es_gratis: e.categories?.some((cat: any) => cat.slug === 'gratis') ?? false,

        costo: e.cost ?? '',
        venue_nombre: e.venue?.venue ?? '',
        venue_direccion: e.venue?.address ?? '',
        venue_ciudad: e.venue?.city ?? '',
        categorias: e.categories?.map((cat: any) => cat.slug) ?? [],
        url_evento: e.url ?? '',
      }))

    return eventosFiltrados

  } catch (error) {
    // Si la API falla (red, timeout, etc.) devolvemos array vacío
    // El componente que llama a esta función debe manejar el caso de lista vacía
    console.error('Error inesperado en getEventos:', error)
    return []
  }
}

// --- HELPERS ---

// Convierte un Date a "YYYY-MM-DD"
function formatearFecha(fecha: Date): string {
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

// Elimina las etiquetas HTML que vienen en la descripción
// Ej: "<p>Texto <strong>acá</strong></p>" → "Texto acá"
function limpiarHTML(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}
