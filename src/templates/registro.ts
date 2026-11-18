import { lazy, type ComponentType } from 'react'
import { ejemploAurea } from './aurea/ejemplo'
import { ejemploManta } from './manta/ejemplo'
import { ejemploMarea } from './marea/ejemplo'
import type { DatosPlantilla } from './tipos'

/*
 * Plantillas disponibles. Se cargan bajo demanda: three.js (Manta) solo se descarga
 * cuando alguien abre esa plantilla, no en la landing ni en la app.
 * `ejemplo` permite que una plantilla muestre su propio ejemplo (mismos textos, otras imágenes).
 */
interface Plantilla {
  nombre: string
  Componente: ComponentType<{ datos: DatosPlantilla }>
  ejemplo?: DatosPlantilla
}

export const PLANTILLAS: Record<string, Plantilla> = {
  orbita: { nombre: 'Órbita', Componente: lazy(() => import('./orbita/PlantillaOrbita')) },
  manta: { nombre: 'Manta', Componente: lazy(() => import('./manta/PlantillaManta')), ejemplo: ejemploManta },
  aurea: { nombre: 'Áurea', Componente: lazy(() => import('./aurea/PlantillaAurea')), ejemplo: ejemploAurea },
  marea: { nombre: 'Marea', Componente: lazy(() => import('./marea/PlantillaMarea')), ejemplo: ejemploMarea },
}
