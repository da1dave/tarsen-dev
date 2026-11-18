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

/**
 * Datos para la página publicada: además de lo de prepararDatos, las fotos que el usuario no subió
 * pierden su etiqueta («→ acá va la foto… ←»), así los visitantes no ven recuadros de ejemplo.
 */
export function prepararPublicacion(d: DatosPlantilla): DatosPlantilla {
  const p = prepararDatos(d)
  const limpiar = <T extends { imagen: string; fotoEtiqueta: string }>(x: T) => (x.imagen ? x : { ...x, fotoEtiqueta: '' })
  return {
    ...p,
    slides: p.slides.map(limpiar),
    servicios: p.servicios.map(limpiar),
    ...(p.historiaImagen ? {} : { historiaFotoEtiqueta: '' }),
  }
}

/** ¿Quedan textos de ejemplo («→ acá va… ←») visibles en la página? */
export const tieneEjemplos = (d: DatosPlantilla) => {
  const p = prepararPublicacion(d)
  return JSON.stringify({ ...p, logo: '', logoFondo: '' }).includes('→ acá va')
}
