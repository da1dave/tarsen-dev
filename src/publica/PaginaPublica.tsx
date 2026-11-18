import { Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { leerPaginaPublica, type PaginaPublica as Pagina } from '../lib/proyectos'
import { PLANTILLAS } from '../templates/registro'
import { prepararPublicacion } from '../templates/visibilidad'

const fondo = <div style={{ minHeight: '100svh', background: '#0b0b0e' }} aria-busy="true" />

/*
 * Página publicada de un cliente: /s/<slug>. La ve cualquier visitante, sin sesión.
 * Solo recibe la copia publicada (función pagina_publica de la base de datos).
 */
export default function PaginaPublica() {
  const { slug = '' } = useParams()
  const [pagina, setPagina] = useState<Pagina | null | undefined>(undefined)

  useEffect(() => {
    leerPaginaPublica(slug).then(setPagina).catch(() => setPagina(null))
  }, [slug])

  useEffect(() => {
    if (!pagina) return
    const antes = document.title
    document.title = pagina.datos.nombre?.includes('→') ? pagina.nombre : pagina.datos.nombre
    return () => { document.title = antes }
  }, [pagina])

  if (pagina === undefined) return fondo
  const plantilla = pagina ? PLANTILLAS[pagina.plantilla] : undefined
  if (!pagina || !plantilla) {
    return (
      <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24, background: '#0b0b0e', color: '#fff', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div>
          <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>Esta página no existe</h1>
          <p style={{ color: '#b9b9c6', margin: '0 0 20px' }}>Puede que la dirección esté mal escrita o que la página ya no esté publicada.</p>
          <Link to="/" style={{ color: '#a594ff', fontWeight: 600 }}>Crea tu página con Tarsen</Link>
        </div>
      </main>
    )
  }
  const { Componente } = plantilla
  return (
    <Suspense fallback={fondo}>
      <Componente datos={prepararPublicacion(pagina.datos)} />
    </Suspense>
  )
}
