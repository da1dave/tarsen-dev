import type { DatosPlantilla } from './tipos'

/*
 * Prepara los datos de un proyecto para dibujarlos: quita los elementos ocultos y vacía las fotos
 * marcadas como "sin foto" (imagen y etiqueta en blanco: las plantillas no dibujan el recuadro).
 * Cada elemento conserva su posición original en `_i`.
 * Se aplica en un solo lugar (VistaPlantilla / VistaProyecto), así todas las plantillas lo respetan.
 */
export function prepararDatos(d: DatosPlantilla): DatosPlantilla {
  const visibles = <T extends { oculto?: boolean }>(lista: T[]) =>
    lista.map((x, i) => ({ ...x, _i: i })).filter((x) => !x.oculto)
  const sinFoto = <T extends { sinFoto?: boolean; imagen: string; fotoEtiqueta: string }>(x: T) =>
    x.sinFoto ? { ...x, imagen: '', fotoEtiqueta: '' } : x
  return {
    ...d,
    slides: visibles(d.slides).map(sinFoto),
    servicios: visibles(d.servicios).map(sinFoto),
    datos: visibles(d.datos),
    redes: visibles(d.redes),
    ...(d.historiaSinFoto ? { historiaImagen: '', historiaFotoEtiqueta: '' } : {}),
  }
}

/** ¿Hay que dibujar el recuadro de foto? (no si no hay imagen ni etiqueta) */
export const conFoto = (imagen: string, etiqueta: string) => Boolean(imagen || etiqueta)
