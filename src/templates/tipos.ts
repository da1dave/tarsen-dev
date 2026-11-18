/*
 * Visibilidad (la cambian nuestra IA o la edición detallada; nunca se borra el contenido):
 *  - oculto: el elemento no se muestra en la página.
 *  - sinFoto: se muestra sin su recuadro de imagen.
 *  - _i: posición original en la lista (lo agrega prepararDatos para que la edición detallada sepa qué elemento es).
 */
interface Visibilidad { oculto?: boolean; _i?: number }
export interface Servicio extends Visibilidad { titulo: string; texto: string; imagen: string; fotoEtiqueta: string; sinFoto?: boolean }
export interface Dato extends Visibilidad { valor: string; etiqueta: string }
export interface Red extends Visibilidad { red: string; usuario: string }
export interface Destacado extends Visibilidad { titulo: string; texto: string; boton: string; href: string; imagen: string; fotoEtiqueta: string; sinFoto?: boolean }

/** Contrato del JSON que nuestra IA llena: textos y rutas de imágenes. Lo comparten todas las plantillas. */
export interface DatosPlantilla {
  nombre: string
  logo: string // logo del negocio para la barra (vacío = solo el nombre)
  logoFondo?: string // versión del logo para decorar el fondo (opcional; si falta se usa la silueta de `logo`)
  acento: string
  slides: Destacado[]
  serviciosIntro: string
  servicios: Servicio[]
  frase: string
  historiaTitulo: string
  historia: string
  historiaImagen: string
  historiaFotoEtiqueta: string
  historiaSinFoto?: boolean
  datos: Dato[]
  direccion: string
  horario: string
  telefono: string
  whatsapp: string
  correo: string
  redes: Red[]
  cta: string
  ctaBoton: string
  waHref: string
}
