import base from '../datos/ejemplo.json'
import type { DatosPlantilla } from '../tipos'

/*
 * Ejemplo de Manta: los mismos textos de Tarsen, con fotos sobrias en vez de figuras sobre nebulosas.
 * Fotos CC0 (dominio público) de Wikimedia Commons, originalmente publicadas en Unsplash.
 * Detalle de cada una en public/img/manta/CREDITOS.txt
 */
const DESTACADOS = ['destacado_1', 'destacado_2', 'destacado_3', 'destacado_4']
const SERVICIOS = ['servicio_1', 'servicio_2', 'servicio_3']
const foto = (n: string) => `/img/manta/${n}.jpg`

const datos = base as DatosPlantilla

export const ejemploManta: DatosPlantilla = {
  ...datos,
  slides: datos.slides.map((s, k) => ({ ...s, imagen: foto(DESTACADOS[k % DESTACADOS.length]) })),
  servicios: datos.servicios.map((s, k) => ({ ...s, imagen: foto(SERVICIOS[k % SERVICIOS.length]) })),
  historiaImagen: foto('nosotros'),
  logoFondo: '/img/logo_tarsen_metalico.png',
}
