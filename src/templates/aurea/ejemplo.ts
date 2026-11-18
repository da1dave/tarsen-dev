import base from '../datos/ejemplo.json'
import type { DatosPlantilla } from '../tipos'

/*
 * Ejemplo de Áurea: los mismos textos de Tarsen, con fotos cálidas y doradas.
 * Fotos CC0 (dominio público) de Wikimedia Commons, originalmente publicadas en Unsplash.
 * Detalle de cada una en public/img/aurea/CREDITOS.txt
 */
const foto = (n: string) => `/img/aurea/${n}.jpg`
const DESTACADOS = ['fondo', 'destacado_2', 'destacado_3', 'destacado_4'] // la primera es el fondo de la portada
const SERVICIOS = ['servicio_1', 'servicio_2', 'servicio_3']

const datos = base as DatosPlantilla

export const ejemploAurea: DatosPlantilla = {
  ...datos,
  slides: datos.slides.map((s, k) => ({ ...s, imagen: foto(DESTACADOS[k % DESTACADOS.length]) })),
  servicios: datos.servicios.map((s, k) => ({ ...s, imagen: foto(SERVICIOS[k % SERVICIOS.length]) })),
  historiaImagen: foto('nosotros'),
}
