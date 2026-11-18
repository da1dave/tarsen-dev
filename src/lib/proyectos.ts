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
  mensajes_usados: number
  creado: string
  actualizado: string
}

const CAMPOS = 'id, plantilla, nombre, datos, estado, mensajes_usados, creado, actualizado'

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
