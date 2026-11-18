import { createElement, Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import { hueco } from '../compartido/Secciones'
import styles from './PlantillaAurea.module.css'

/*
 * Texto "niebla" (inspirado en symphonyofvines.unseen.co):
 *  - Aparece cuando entra en pantalla: cada letra (o palabra) sale de un desenfoque hacia la nitidez,
 *    con un ritmo escalonado e irregular, como tinta que se asienta.
 *  - Al pasar el cursor, las letras cercanas se desenfocan y atenúan, y vuelven al alejarse.
 * El texto completo queda en aria-label; las piezas animadas se ocultan a los lectores de pantalla.
 */

interface Props {
  texto: string
  como?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  por?: 'letra' | 'palabra' // palabras para párrafos (menos piezas, mismo efecto)
  className?: string
  id?: string
  retraso?: number // ms antes de empezar
}

// Azar estable por posición: el ritmo es irregular pero igual en cada visita.
const azar = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

const quieto = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function TextoNiebla({ texto, como = 'p', por = 'letra', className = '', id, retraso = 0 }: Props) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(quieto)

  // Aparece la primera vez que entra en pantalla.
  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.2 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [visible])

  // Desenfoque alrededor del cursor.
  useEffect(() => {
    const el = ref.current
    if (!el || quieto()) return
    const piezas = Array.from(el.querySelectorAll<HTMLElement>('[data-pieza]'))
    let raf = 0
    let x = 0
    let y = 0
    const aplicar = () => {
      raf = 0
      const radio = parseFloat(getComputedStyle(el).fontSize) * 1.8
      for (const p of piezas) {
        const r = p.getBoundingClientRect()
        const f = Math.max(0, 1 - Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) / radio)
        p.style.setProperty('--b', `${(f * f * 9).toFixed(2)}px`)
        p.style.setProperty('--o', (1 - f * 0.5).toFixed(2))
      }
    }
    const mover = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return // en pantallas táctiles no hay cursor que siga
      x = e.clientX
      y = e.clientY
      if (!raf) raf = requestAnimationFrame(aplicar)
    }
    const salir = () => {
      cancelAnimationFrame(raf)
      raf = 0
      for (const p of piezas) { p.style.setProperty('--b', '0px'); p.style.setProperty('--o', '1') }
    }
    el.addEventListener('pointermove', mover)
    el.addEventListener('pointerleave', salir)
    return () => { el.removeEventListener('pointermove', mover); el.removeEventListener('pointerleave', salir); cancelAnimationFrame(raf) }
  }, [texto, por])

  const paso = por === 'letra' ? 26 : 70
  const vaiven = por === 'letra' ? 160 : 220
  let i = 0
  const pieza = (contenido: string, k: number) => {
    const n = i++
    return (
      <span key={k} data-pieza className={styles.pieza} style={{ '--d': `${retraso + n * paso + azar(n) * vaiven}ms` } as CSSProperties}>
        {contenido}
      </span>
    )
  }
  const palabras = texto.split(' ')

  return createElement(
    como,
    { ref, id, className: `${styles.niebla} ${visible ? styles.visible : ''} ${hueco(texto)} ${className}`, 'aria-label': texto },
    <span aria-hidden="true">
      {palabras.map((w, k) => (
        <Fragment key={k}>
          <span className={styles.palabra}>{por === 'letra' ? Array.from(w).map(pieza) : pieza(w, 0)}</span>
          {k < palabras.length - 1 && ' '}
        </Fragment>
      ))}
    </span>,
  )
}
