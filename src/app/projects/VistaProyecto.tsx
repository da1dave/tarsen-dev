import { Suspense, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { leerProyecto, type Proyecto } from '../../lib/proyectos'
import { PLANTILLAS } from '../../templates/registro'
import type { DatosPlantilla } from '../../templates/tipos'
import { prepararDatos } from '../../templates/visibilidad'
import CapaEdicion, { type Accion } from './CapaEdicion'

const fondo = <div style={{ minHeight: '100svh', background: '#0b0b0e' }} />

/*
 * Un proyecto del usuario a pantalla completa. Carga sus datos de Supabase y, si está dentro
 * del editor, recibe los cambios por postMessage para mostrarlos al instante.
 */
export default function VistaProyecto() {
  const { pid = '' } = useParams()
  const [proyecto, setProyecto] = useState<Proyecto | null | undefined>(undefined)
  const [datos, setDatos] = useState<DatosPlantilla | null>(null)
  const [edicion, setEdicion] = useState(false)

  useEffect(() => {
    leerProyecto(pid).then((p) => { setProyecto(p); if (p) setDatos((d) => d ?? p.datos) }).catch(() => setProyecto(null))
  }, [pid])

  useEffect(() => {
    if (window.parent === window) return
    const oir = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return
      if (e.data?.tipo === 'tarsen:datos' && e.data.datos) setDatos(e.data.datos as DatosPlantilla)
      if (e.data?.tipo === 'tarsen:modo') setEdicion(!!e.data.edicion)
    }
    window.addEventListener('message', oir)
    window.parent.postMessage({ tipo: 'tarsen:lista' }, window.location.origin)
    return () => window.removeEventListener('message', oir)
  }, [])

  if (proyecto === null) return <Navigate to="/app/proyectos" replace />
  const plantilla = proyecto ? PLANTILLAS[proyecto.plantilla] : undefined
  if (!proyecto || !datos || !plantilla) return fondo
  const { Componente } = plantilla
  return (
    <Suspense fallback={fondo}>
      <Componente datos={prepararDatos(datos)} />
      {edicion && (
        <CapaEdicion alAccion={(accion: Accion, destino: string) => window.parent.postMessage({ tipo: 'tarsen:accion', accion, destino }, window.location.origin)} />
      )}
    </Suspense>
  )
}
