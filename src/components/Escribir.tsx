import { useEffect, useRef, useState } from 'react'
import styles from './Escribir.module.css'

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Props {
  texto: string
  ms: number // milisegundos por letra
  activo: boolean // empieza a escribir cuando pasa a true
  onFin?: () => void
  etiqueta?: 'h1' | 'h2' | 'p'
  id?: string
  className?: string
  ultimo?: boolean // el cursor se queda parpadeando al terminar y luego se apaga
}

/* Escribe el texto letra a letra. El espacio del texto completo queda reservado para que el diseño no salte. */
export default function Escribir({ texto, ms, activo, onFin, etiqueta: Tag = 'p', id, className, ultimo }: Props) {
  const [n, setN] = useState(() => (sinMovimiento() ? texto.length : 0))
  const completo = n >= texto.length
  const fin = useRef(onFin)
  useEffect(() => { fin.current = onFin })

  useEffect(() => {
    if (!activo || completo) return
    const t = window.setTimeout(() => setN((v) => v + 1), ms)
    return () => window.clearTimeout(t)
  }, [activo, completo, n, ms])

  useEffect(() => { if (activo && completo) fin.current?.() }, [activo, completo])

  const cursor = activo && (!completo || ultimo)
  return (
    <Tag id={id} className={className} aria-label={texto}>
      <span aria-hidden="true">
        {texto.slice(0, n)}
        {cursor && <span className={`${styles.cursor} ${completo ? styles.cursorFin : ''}`} />}
        <span className={styles.resto}>{texto.slice(n)}</span>
      </span>
    </Tag>
  )
}
