import etiquetas from '../templates/datos/etiquetas.json'
import type { DatosPlantilla } from '../templates/tipos'
import { db } from './supabase'

/* Proyectos del usuario: una plantilla + los datos de su negocio. RLS asegura que solo vea los suyos. */
export interface Proyecto {
  id: string
  plantilla: string
  nombre: string
  datos: DatosPlantilla
  estado: 'borrador' | 'publicado'
  /** dirección pública: /s/<slug> (se conserva al despublicar) */
  slug: string | null
  publicado_en: string | null
  mensajes_usados: number
  creado: string
  actualizado: string
}

const CAMPOS = 'id, plantilla, nombre, datos, estado, slug, publicado_en, mensajes_usados, creado, actualizado'

/** Crea un proyecto nuevo con la plantilla elegida, lleno con las etiquetas «→ acá va… ←». */
export async function crearProyecto(plantilla: string, nombre = 'Mi proyecto') {
  const { data, error } = await db()
    .from('proyectos')
    .insert({ plantilla, nombre, datos: etiquetas })
    .select(CAMPOS)
    .single()
  if (error) throw error
  return data as Proyecto
}

export async function listarProyectos() {
  const { data, error } = await db().from('proyectos').select(CAMPOS).order('actualizado', { ascending: false })
  if (error) throw error
  return data as Proyecto[]
}

export async function leerProyecto(id: string) {
  const { data, error } = await db().from('proyectos').select(CAMPOS).eq('id', id).maybeSingle()
  if (error) throw error
  return data as Proyecto | null
}

export async function guardarProyecto(id: string, cambios: { nombre?: string; datos?: DatosPlantilla }) {
  const { error } = await db().from('proyectos').update(cambios).eq('id', id)
  if (error) throw error
}

export async function borrarProyecto(id: string) {
  const { error } = await db().from('proyectos').delete().eq('id', id)
  if (error) throw error
}

// ---------- Publicación ----------

/** Dirección pública de una página publicada. */
export const urlPublica = (slug: string) => `${window.location.origin}/s/${slug}`

/** Convierte un nombre en una dirección válida: "Café Luna" → "cafe-luna". */
export function aSlug(texto: string) {
  return texto
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40).replace(/-+$/, '')
}

/** ¿Hay cambios guardados después de la última publicación? */
export const cambiosSinPublicar = (p: Proyecto) =>
  p.estado === 'publicado' && !!p.publicado_en && new Date(p.actualizado).getTime() > new Date(p.publicado_en).getTime() + 1000

/** Publica (o actualiza) la página con los datos actuales. Lanza un Error con un texto listo para mostrar. */
export async function publicarProyecto(id: string, slug: string): Promise<string> {
  const { data, error } = await db().rpc('publicar_proyecto', { p_id: id, p_slug: slug })
  if (error) {
    if (error.code === '23505') throw new Error('Esa dirección ya está ocupada. Prueba con otra.')
    if (error.code === '22023') throw new Error('Usa de 3 a 40 letras sin tildes, números o guiones (por ejemplo: cafe-luna).')
    throw new Error('No pudimos publicar tu página. Intenta de nuevo.')
  }
  return data as string
}

export async function despublicarProyecto(id: string) {
  const { error } = await db().rpc('despublicar_proyecto', { p_id: id })
  if (error) throw new Error('No pudimos despublicar tu página. Intenta de nuevo.')
}

export interface PaginaPublica { plantilla: string; nombre: string; datos: DatosPlantilla }

/** Página publicada, para cualquier visitante (no necesita sesión). */
export async function leerPaginaPublica(slug: string): Promise<PaginaPublica | null> {
  const { data, error } = await db().rpc('pagina_publica', { p_slug: slug })
  if (error) throw error
  return (data as PaginaPublica | null) ?? null
}
