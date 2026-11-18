import { useState, type FormEvent } from 'react'
import type { Pregunta } from '../../lib/ia'
import { CampoDictado } from './dictado'
import styles from './FormularioIA.module.css'

/*
 * Formulario que propone nuestra IA dentro de su burbuja del chat: opciones pensadas para el
 * negocio del usuario. Las respuestas se envían como texto ("Pregunta respuesta").
 * Si hay una sola pregunta de elegir una opción, basta un clic para responder.
 * Los formularios de mensajes anteriores se ven deshabilitados.
 */

const OTRO = 'Otro'

interface Respuesta { elegidas: string[]; otro: string; texto: string }
const vacia = (): Respuesta => ({ elegidas: [], otro: '', texto: '' })

function textoRespuesta(p: Pregunta, r: Respuesta) {
  if (p.tipo === 'texto') return r.texto.trim()
  const elegidas = r.elegidas.filter((e) => e !== OTRO)
  if (r.elegidas.includes(OTRO) && r.otro.trim()) elegidas.push(r.otro.trim())
  return elegidas.join(', ')
}

interface Props {
  preguntas: Pregunta[]
  /** Solo el formulario del último mensaje se puede responder. */
  activo: boolean
  deshabilitado?: boolean
  enviar: (mensaje: string) => void
  chatear: () => void
}

export default function FormularioIA({ preguntas, activo, deshabilitado = false, enviar, chatear }: Props) {
  const [respuestas, setRespuestas] = useState<Respuesta[]>(() => preguntas.map(vacia))
  const bloqueado = !activo || deshabilitado
  const unClic = preguntas.length === 1 && preguntas[0].tipo === 'opciones'

  const cambiar = (i: number, r: Partial<Respuesta>) =>
    setRespuestas((todas) => todas.map((x, k) => (k === i ? { ...x, ...r } : x)))

  const elegir = (i: number, p: Pregunta, opcion: string) => {
    const actuales = respuestas[i].elegidas
    if (p.tipo === 'opciones') {
      // Una sola pregunta de elegir una: el clic responde de inmediato (salvo "Otro…").
      if (unClic && opcion !== OTRO) { enviar(`${p.pregunta} ${opcion}`); return }
      cambiar(i, { elegidas: actuales[0] === opcion ? [] : [opcion] })
    } else {
      cambiar(i, { elegidas: actuales.includes(opcion) ? actuales.filter((e) => e !== opcion) : [...actuales, opcion] })
    }
  }

  const lineas = preguntas
    .map((p, i) => ({ p, texto: textoRespuesta(p, respuestas[i]) }))
    .filter((l) => l.texto)
    .map((l) => `${l.p.pregunta} ${l.texto}`)

  const listo = (e: FormEvent) => {
    e.preventDefault()
    if (!lineas.length || bloqueado) return
    enviar(lineas.join('\n'))
  }

  // En un solo clic, el botón de enviar solo hace falta si eligió "Otro…".
  const verEnviar = !unClic || respuestas[0].elegidas.includes(OTRO)

  return (
    <form className={`${styles.formulario} ${activo ? '' : styles.pasado}`} onSubmit={listo} aria-label={activo ? 'Responde a Tarsen' : undefined}>
      {preguntas.map((p, i) => (
        <fieldset key={i} className={styles.pregunta} disabled={bloqueado}>
          <legend>
            {p.pregunta}
            {p.tipo === 'varias' && activo && <span className={styles.ayuda}>Puedes elegir varias</span>}
          </legend>
          {p.tipo === 'texto' ? (
            activo && (
              <CampoDictado
                className={styles.texto}
                valor={respuestas[i].texto}
                cambiar={(v) => cambiar(i, { texto: v })}
                placeholder="Escribe o dicta tu respuesta"
                maxLength={300}
                disabled={bloqueado}
              />
            )
          ) : (
            <>
              <div className={styles.opciones} role={p.tipo === 'opciones' ? 'radiogroup' : 'group'}>
                {[...p.opciones, ...(activo ? [OTRO] : [])].map((o) => {
                  const activa = respuestas[i].elegidas.includes(o)
                  return (
                    <button
                      key={o}
                      type="button"
                      role={p.tipo === 'opciones' ? 'radio' : 'checkbox'}
                      aria-checked={activa}
                      className={`${styles.opcion} ${activa ? styles.activa : ''}`}
                      onClick={() => elegir(i, p, o)}
                    >
                      {p.tipo === 'varias' && <span className={styles.marca} aria-hidden="true">{activa ? '✓' : ''}</span>}
                      <span>{o === OTRO ? 'Otro…' : o}</span>
                    </button>
                  )
                })}
              </div>
              {activo && respuestas[i].elegidas.includes(OTRO) && (
                <CampoDictado
                  className={styles.texto}
                  valor={respuestas[i].otro}
                  cambiar={(v) => cambiar(i, { otro: v })}
                  placeholder="Cuéntame cuál"
                  maxLength={200}
                  disabled={bloqueado}
                  autoFocus
                />
              )}
            </>
          )}
        </fieldset>
      ))}
      {activo && (
        <div className={styles.acciones}>
          {verEnviar && (
            <button type="submit" className={styles.enviar} disabled={!lineas.length || bloqueado}>
              Enviar respuesta{lineas.length > 1 ? 's' : ''}
            </button>
          )}
          <button type="button" className={styles.chatear} onClick={chatear} disabled={bloqueado}>
            Prefiero chatear sobre esto
          </button>
        </div>
      )}
    </form>
  )
}
