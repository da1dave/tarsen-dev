import { useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import styles from './Dictado.module.css'

/*
 * Dictado por voz con el reconocimiento de voz del navegador (Web Speech API).
 * Funciona en Chrome, Edge y Safari; en Firefox y Brave no funciona y el botón del micrófono no aparece.
 * El texto dictado se agrega al campo para que el usuario lo revise antes de enviarlo.
 */

interface ResultadoVoz { isFinal: boolean; 0: { transcript: string } }
interface EventoVoz { resultIndex: number; results: ArrayLike<ResultadoVoz> }
interface Reconocedor {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: EventoVoz) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
type ClaseReconocedor = new () => Reconocedor

function claseReconocedor(): ClaseReconocedor | undefined {
  const w = window as unknown as { SpeechRecognition?: ClaseReconocedor; webkitSpeechRecognition?: ClaseReconocedor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

// Brave expone la API pero bloquea el servicio de voz de Google que la hace funcionar (falla con "network").
const esBrave = () => !!(navigator as Navigator & { brave?: unknown }).brave

export const dictadoDisponible = () => typeof window !== 'undefined' && !!claseReconocedor() && !esBrave()

/** Escucha el micrófono y entrega el texto: `parcial` mientras se habla, `agregar` cuando una frase termina. */
export function useDictado(agregar: (texto: string) => void) {
  const [escuchando, setEscuchando] = useState(false)
  const [parcial, setParcial] = useState('')
  const [error, setError] = useState('')
  const reconocedor = useRef<Reconocedor | null>(null)
  const alAgregar = useRef(agregar)
  alAgregar.current = agregar

  useEffect(() => () => reconocedor.current?.stop(), [])

  const detener = () => reconocedor.current?.stop()

  const iniciar = () => {
    const Clase = claseReconocedor()
    if (!Clase) return
    setError('')
    const r = new Clase()
    r.lang = navigator.language?.toLowerCase().startsWith('es') ? navigator.language : 'es-ES'
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
      let enCurso = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) alAgregar.current(res[0].transcript.trim())
        else enCurso += res[0].transcript
      }
      setParcial(enCurso)
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setError('Permite el uso del micrófono en tu navegador para dictar.')
      else if (e.error === 'no-speech') setError('No te escuché. Intenta de nuevo.')
      else if (e.error === 'network') setError('Tu navegador no permite el dictado por voz. Prueba en Chrome o Edge.')
      else if (e.error !== 'aborted') setError('No se pudo usar el micrófono.')
    }
    r.onend = () => { setEscuchando(false); setParcial('') }
    reconocedor.current = r
    r.start()
    setEscuchando(true)
  }

  return { escuchando, parcial, error, iniciar, detener, alternar: () => (escuchando ? detener() : iniciar()) }
}

/** Une el texto dictado al que ya había en el campo. */
export const unir = (actual: string, nuevo: string) => (actual.trim() ? `${actual.trimEnd()} ${nuevo}` : nuevo)

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  valor: string
  cambiar: (v: string) => void
}

/** Campo de texto con botón de micrófono (si el navegador lo permite). */
export function CampoDictado({ valor, cambiar, className, disabled, ...resto }: Props) {
  const valorActual = useRef(valor)
  valorActual.current = valor
  const { escuchando, parcial, error, alternar, detener } = useDictado((t) => {
    valorActual.current = unir(valorActual.current, t)
    cambiar(valorActual.current)
  })
  const [disponible] = useState(dictadoDisponible)

  useEffect(() => { if (disabled) detener() }, [disabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.contenedor}>
      <div className={`${styles.campo} ${escuchando ? styles.activo : ''}`}>
        <input
          {...resto}
          className={className}
          disabled={disabled}
          value={escuchando && parcial ? unir(valor, parcial) : valor}
          onChange={(e) => cambiar(e.target.value)}
        />
        {disponible && (
          <button
            type="button"
            className={styles.micro}
            onClick={alternar}
            disabled={disabled}
            aria-pressed={escuchando}
            aria-label={escuchando ? 'Dejar de dictar' : 'Dictar por voz'}
            title={escuchando ? 'Dejar de dictar' : 'Dictar por voz'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z" />
            </svg>
          </button>
        )}
      </div>
      {escuchando && <span className={styles.estado} role="status">Escuchando… habla con naturalidad</span>}
      {error && <span className={styles.error} role="alert">{error}</span>}
    </div>
  )
}

const ALTO_MAXIMO = 180 // px: unas 7 líneas; desde ahí aparece la barra de desplazamiento

interface PropsArea {
  valor: string
  cambiar: (v: string) => void
  /** Enter envía (Shift+Enter hace un salto de línea). */
  enviar: () => void
  className?: string
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  autoFocus?: boolean
  'aria-label'?: string
}

/** Área de texto que crece con lo que se escribe (o dicta) hasta ALTO_MAXIMO, con botón de micrófono. */
export function AreaDictado({ valor, cambiar, enviar, className, disabled, ...resto }: PropsArea) {
  const valorActual = useRef(valor)
  valorActual.current = valor
  const area = useRef<HTMLTextAreaElement>(null)
  const { escuchando, parcial, error, alternar, detener } = useDictado((t) => {
    valorActual.current = unir(valorActual.current, t)
    cambiar(valorActual.current)
  })
  const [disponible] = useState(dictadoDisponible)
  const mostrado = escuchando && parcial ? unir(valor, parcial) : valor

  useEffect(() => { if (disabled) detener() }, [disabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ajusta la altura al contenido y mantiene a la vista lo último que se escribe.
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight + 2, ALTO_MAXIMO)}px`
    el.style.overflowY = el.scrollHeight + 2 > ALTO_MAXIMO ? 'auto' : 'hidden'
    if (escuchando) el.scrollTop = el.scrollHeight
  }, [mostrado, escuchando])

  return (
    <div className={styles.contenedor}>
      <div className={`${styles.campo} ${styles.area} ${escuchando ? styles.activo : ''}`}>
        <textarea
          {...resto}
          ref={area}
          rows={1}
          className={className}
          disabled={disabled}
          value={mostrado}
          onChange={(e) => cambiar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              if (escuchando) detener()
              enviar()
            }
          }}
        />
        {disponible && (
          <button
            type="button"
            className={styles.micro}
            onClick={alternar}
            disabled={disabled}
            aria-pressed={escuchando}
            aria-label={escuchando ? 'Dejar de dictar' : 'Dictar por voz'}
            title={escuchando ? 'Dejar de dictar' : 'Dictar por voz'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z" />
            </svg>
          </button>
        )}
      </div>
      {escuchando && <span className={styles.estado} role="status">Escuchando… habla con naturalidad</span>}
      {error && <span className={styles.error} role="alert">{error}</span>}
    </div>
  )
}
