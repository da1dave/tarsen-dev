import base from '../datos/ejemplo.json'
import type { DatosPlantilla } from '../tipos'

/*
 * Ejemplo de Marea: los mismos textos de Tarsen. El primer destacado lleva el logo de Tarsen y los
 * demás no llevan foto, así se ven los degradados líquidos que la plantilla genera con el color de
 * la marca. Servicios y Nosotros usan las fotos CC0 de Manta (detalle en public/img/manta/CREDITOS.txt).
 */
const datos = base as DatosPlantilla
const foto = (n: string) => `/img/manta/${n}.jpg`
const SERVICIOS = ['servicio_1', 'servicio_2', 'servicio_3']

export const ejemploMarea: DatosPlantilla = {
  ...datos,
  acento: '#7b5cff',
  logo: '/img/logo_tarsen_oscuro.png', // el claro no se ve sobre el fondo pastel
  // El primero lleva el logo de Tarsen (PNG con transparencia): flota y ondula sobre el líquido.
  slides: datos.slides.map((s, k) => ({ ...s, imagen: k === 0 ? '/img/logo_tarsen_metalico.png' : '', fotoEtiqueta: '' })),
  servicios: datos.servicios.map((s, k) => ({ ...s, imagen: foto(SERVICIOS[k % SERVICIOS.length]) })),
  historiaImagen: foto('nosotros'),
}
