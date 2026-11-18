import { FunctionsHttpError } from '@supabase/supabase-js'
import type { DatosPlantilla } from '../templates/tipos'
import { db } from './supabase'

/* Chat con nuestra IA: los mensajes los guarda y procesa la función chat-plantilla de Supabase. */
/** Pregunta del formulario que propone nuestra IA en cada turno. */
export interface Pregunta {
  pregunta: string
  /** 'opciones': elige una · 'varias': elige varias · 'texto': respuesta escrita */
  tipo: 'opciones' | 'varias' | 'texto'
  opciones: string[]
}

export interface MensajeChat {
  id: string | number
  rol: 'usuario' | 'asistente'
  texto: string
  cambios?: { campo: string; valor: string }[]
  formulario?: Pregunta[] | null
}

export interface RespuestaIA {
  respuesta: string
  datos: DatosPlantilla
  cambios: { campo: string; valor: string }[]
  formulario?: Pregunta[] | null
  /** ids con que quedaron guardados el mensaje del usuario y la respuesta */
  ids?: { usuario: number | null; asistente: number | null }
  restantes: number
}

export async function cargarMensajes(proyectoId: string): Promise<MensajeChat[]> {
  const { data, error } = await db()
    // Solo las partes que se muestran (el contenido también guarda una copia de la página, datosAntes).
    .from('mensajes').select('id, rol, texto:contenido->>texto, cambios:contenido->cambios, formulario:contenido->formulario')
    .eq('proyecto_id', proyectoId).order('id', { ascending: true })
  if (error) throw error
  return (data ?? []).map((m) => ({
    id: m.id, rol: m.rol, texto: m.texto ?? '',
    cambios: (m.cambios ?? undefined) as MensajeChat['cambios'], formulario: (m.formulario ?? null) as Pregunta[] | null,
  }))
}

/**
 * Envía un mensaje; si falla, lanza un Error con un texto listo para mostrar.
 * Con `editarDesde` reemplaza ese mensaje del usuario (y borra los siguientes).
 */
export async function enviarMensaje(proyectoId: string, mensaje: string, editarDesde?: number): Promise<RespuestaIA> {
  const { data, error } = await db().functions.invoke<RespuestaIA>('chat-plantilla', { body: { proyectoId, mensaje, editarDesde } })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const cuerpo = await error.context.json().catch(() => null)
      throw new Error(cuerpo?.error ?? 'Nuestra IA no pudo responder. Intenta de nuevo.')
    }
    throw new Error('No pudimos conectar con nuestra IA. Revisa tu conexión.')
  }
  return data!
}
