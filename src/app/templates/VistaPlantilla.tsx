import { Suspense } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { PLANTILLAS } from '../../templates/registro'
import etiquetas from '../../templates/datos/etiquetas.json'
import ejemplo from '../../templates/datos/ejemplo.json'
import type { DatosPlantilla } from '../../templates/tipos'
import { prepararDatos } from '../../templates/visibilidad'

/*
 * Una plantilla a pantalla completa, como se vería publicada.
 * La app la muestra dentro de un iframe (PlantillaVista) para que su barra fija,
 * sus pestañas y sus transiciones funcionen igual que en un sitio real.
 */
export default function VistaPlantilla() {
  const { id = '', modo } = useParams()
  const plantilla = PLANTILLAS[id]
  if (!plantilla) return <Navigate to="/app/plantillas" replace />
  const { Componente } = plantilla
  const datosEjemplo = plantilla.ejemplo ?? (ejemplo as DatosPlantilla)
  return (
    <Suspense fallback={<div style={{ minHeight: '100svh', background: '#0b0b0e' }} />}>
      <Componente datos={prepararDatos(modo === 'ejemplo' ? datosEjemplo : (etiquetas as DatosPlantilla))} />
    </Suspense>
  )
}
