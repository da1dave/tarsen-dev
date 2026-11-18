import base from '../datos/ejemplo.json'
import type { DatosPlantilla } from '../tipos'

/*
 * Ejemplo de Marea: los mismos textos de Tarsen. Los destacados no llevan foto, así se ven los
 * degradados líquidos que la plantilla genera con el color de la marca; servicios y Nosotros usan
 * las fotos CC0 de Manta (detalle en public/img/manta/CREDITOS.txt).
 */
const datos = base as DatosPlantilla
const foto = (n: string) => `/img/manta/${n}.jpg`
const SERVICIOS = ['servicio_1', 'servicio_2', 'servicio_3']

export const ejemploMarea: DatosPlantilla = {
  ...datos,
  acento: '#7b5cff',
  logo: '/img/logo_tarsen_oscuro.png', // el claro no se ve sobre el fondo pastel
  slides: datos.slides.map((s) => ({ ...s, imagen: '', fotoEtiqueta: '' })),
  servicios: datos.servicios.map((s, k) => ({ ...s, imagen: foto(SERVICIOS[k % SERVICIOS.length]) })),
  historiaImagen: foto('nosotros'),
}
