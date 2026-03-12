// ============================================================
// app/api/proxy/route.ts
// Proxy server-side para fetchear páginas externas.
// Corre en el servidor de Vercel, no en el navegador,
// por eso puede simular headers de navegador real y evitar
// los bloqueos CORS que afectan a los proxies externos.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Leer la URL a fetchear desde el parámetro ?url=
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get('url')

  if (!targetUrl) {
    return NextResponse.json({ error: 'Falta el parámetro url' }, { status: 400 })
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        // Simulamos un navegador Firefox real para evitar bloqueos
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9',
        'Cache-Control': 'no-cache',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `El servidor remoto respondió con ${response.status}` },
        { status: response.status }
      )
    }

    const html = await response.text()

    // Devolver el HTML con headers que permiten que el navegador lo reciba
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: `Error al fetchear la URL: ${error.message}` },
      { status: 500 }
    )
  }
}
