import { FunctionsHttpError } from '@supabase/supabase-js'
import type { DatosPlantilla } from '../templates/tipos'
import type { Foto } from './fotos'
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
  /** fotos que el usuario adjuntó */
  fotos?: Foto[]
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

/*
 * Mensajes viejos donde nuestra IA escribió el formulario como texto ("[Formulario mostrado]\n- ¿…? (a / b)"):
 * se quita del texto y se muestra como formulario. (La función chat-plantilla ya lo corrige al responder.)
 */
const MARCA_FORMULARIO = /\n?\s*\[\s*formulario(?: mostrado)?\s*\]\s*/i
function separarFormularioEscrito(texto: string): { texto: string; formulario: Pregunta[] | null } {
  const corte = texto.search(MARCA_FORMULARIO)
  if (corte < 0) return { texto, formulario: null }
  const preguntas = texto.slice(corte).replace(MARCA_FORMULARIO, '').split('\n')
    .map((l) => l.trim().match(/^[-•*]\s*(.+?)(?:\s*\(([^)]*)\))?\s*$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .slice(0, 3)
    .map((m): Pregunta => {
      const opciones = (m[2] ?? '').split('/').map((o) => o.trim()).filter(Boolean).slice(0, 8)
      return { pregunta: m[1].slice(0, 140), tipo: opciones.length ? 'opciones' : 'texto', opciones }
    })
  return { texto: texto.slice(0, corte).trim(), formulario: preguntas.length ? preguntas : null }
}

export async function cargarMensajes(proyectoId: string): Promise<MensajeChat[]> {
  const { data, error } = await db()
    // Solo las partes que se muestran (el contenido también guarda una copia de la página, datosAntes).
    .from('mensajes').select('id, rol, texto:contenido->>texto, cambios:contenido->cambios, formulario:contenido->formulario, fotos:contenido->fotos')
    .eq('proyecto_id', proyectoId).order('id', { ascending: true })
  if (error) throw error
  return (data ?? []).map((m) => {
    const escrito = m.rol === 'asistente' ? separarFormularioEscrito(m.texto ?? '') : { texto: m.texto ?? '', formulario: null }
    return {
      id: m.id, rol: m.rol, texto: escrito.texto,
      cambios: (m.cambios ?? undefined) as MensajeChat['cambios'],
      formulario: (m.formulario as Pregunta[] | null) ?? escrito.formulario,
      fotos: (m.fotos ?? undefined) as Foto[] | undefined,
    }
  })
}

/**
 * Envía un mensaje; si falla, lanza un Error con un texto listo para mostrar.
 * Con `editarDesde` reemplaza ese mensaje del usuario (y borra los siguientes; conserva sus fotos).
 * `fotos`: nombres de las fotos recién subidas que van con el mensaje.
 */
export async function enviarMensaje(proyectoId: string, mensaje: string, editarDesde?: number, fotos?: string[]): Promise<RespuestaIA> {
  const { data, error } = await db().functions.invoke<RespuestaIA>('chat-plantilla', { body: { proyectoId, mensaje, editarDesde, fotos } })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const cuerpo = await error.context.json().catch(() => null)
      throw new Error(cuerpo?.error ?? 'Nuestra IA no pudo responder. Intenta de nuevo.')
    }
    throw new Error('No pudimos conectar con nuestra IA. Revisa tu conexión.')
  }
  return data!
}
