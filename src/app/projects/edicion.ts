import type { DatosPlantilla } from '../../templates/tipos'

/*
 * Operaciones de la edición detallada (sin IA). Cada una devuelve una copia nueva de los datos.
 * Un destino es "<lista>.<índice>" (p. ej. "servicios.2") o "historiaFoto".
 */
export type Lista = 'slides' | 'servicios' | 'datos' | 'redes'

export const NOMBRE_LISTA: Record<Lista, string> = { slides: 'Destacado', servicios: 'Servicio', datos: 'Cifra', redes: 'Red social' }
const MAXIMO: Record<Lista, number> = { slides: 8, servicios: 8, datos: 6, redes: 6 }
const MINIMO: Record<Lista, number> = { slides: 1, servicios: 0, datos: 0, redes: 0 }

/** Campos de texto que se editan a mano en cada tipo de elemento. */
export const CAMPOS: Record<Lista, { clave: string; etiqueta: string; largo?: boolean }[]> = {
  slides: [{ clave: 'titulo', etiqueta: 'Título' }, { clave: 'texto', etiqueta: 'Texto', largo: true }, { clave: 'boton', etiqueta: 'Texto del botón' }],
  servicios: [{ clave: 'titulo', etiqueta: 'Nombre del servicio' }, { clave: 'texto', etiqueta: 'Descripción', largo: true }],
  datos: [{ clave: 'valor', etiqueta: 'Cifra' }, { clave: 'etiqueta', etiqueta: 'Qué significa' }],
  redes: [{ clave: 'red', etiqueta: 'Red social' }, { clave: 'usuario', etiqueta: 'Usuario' }],
}

export function separar(destino: string): { lista: Lista; i: number } | null {
  const [lista, i] = destino.split('.')
  return lista in NOMBRE_LISTA && Number.isInteger(Number(i)) ? { lista: lista as Lista, i: Number(i) } : null
}

const copiar = (d: DatosPlantilla) => structuredClone(d)
const items = (d: DatosPlantilla, lista: Lista) => d[lista] as unknown as Record<string, unknown>[]

export const puedeDuplicar = (d: DatosPlantilla, lista: Lista) => d[lista].length < MAXIMO[lista]
export const puedeBorrar = (d: DatosPlantilla, lista: Lista) => d[lista].length > MINIMO[lista]

export function duplicar(d: DatosPlantilla, destino: string) {
  const s = separar(destino)
  if (!s || !puedeDuplicar(d, s.lista)) return d
  const c = copiar(d)
  const lista = items(c, s.lista)
  lista.splice(s.i + 1, 0, { ...structuredClone(lista[s.i]), oculto: false })
  return c
}

export function borrar(d: DatosPlantilla, destino: string) {
  const s = separar(destino)
  if (!s || !puedeBorrar(d, s.lista)) return d
  const c = copiar(d)
  items(c, s.lista).splice(s.i, 1)
  return c
}

export function cambiarFoto(d: DatosPlantilla, destino: string, mostrar: boolean) {
  const c = copiar(d)
  if (destino === 'historiaFoto') { c.historiaSinFoto = !mostrar; return c }
  const s = separar(destino)
  if (!s || (s.lista !== 'slides' && s.lista !== 'servicios')) return d
  items(c, s.lista)[s.i].sinFoto = !mostrar
  return c
}

export function mostrar(d: DatosPlantilla, destino: string) {
  const s = separar(destino)
  if (!s) return d
  const c = copiar(d)
  items(c, s.lista)[s.i].oculto = false
  return c
}

export function actualizar(d: DatosPlantilla, destino: string, valores: Record<string, string>) {
  const s = separar(destino)
  if (!s) return d
  const c = copiar(d)
  Object.assign(items(c, s.lista)[s.i], valores)
  return c
}

/** Elementos ocultos y fotos quitadas, para poder recuperarlos. */
export function ocultos(d: DatosPlantilla) {
  const lista: { destino: string; texto: string; tipo: 'elemento' | 'foto' }[] = []
  for (const l of Object.keys(NOMBRE_LISTA) as Lista[]) {
    items(d, l).forEach((x, i) => {
      if (x.oculto) lista.push({ destino: `${l}.${i}`, texto: `${NOMBRE_LISTA[l]} ${i + 1}`, tipo: 'elemento' })
      else if (x.sinFoto) lista.push({ destino: `${l}.${i}`, texto: `Foto de ${NOMBRE_LISTA[l].toLowerCase()} ${i + 1}`, tipo: 'foto' })
    })
  }
  if (d.historiaSinFoto) lista.push({ destino: 'historiaFoto', texto: 'Foto de Nosotros', tipo: 'foto' })
  return lista
}
