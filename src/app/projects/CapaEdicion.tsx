import { useEffect, useRef, useState } from 'react'
import styles from './CapaEdicion.module.css'

/*
 * Capa de la edición detallada, dentro de la vista previa (iframe).
 * Al pasar el mouse sobre un elemento con data-editable lo resalta y muestra una barra con
 * Editar / Duplicar / Quitar foto / Borrar. Las acciones se envían al editor (postMessage),
 * que es quien cambia y guarda los datos. Mientras está activa, los enlaces de la página no navegan.
 */
export type Accion = 'editar' | 'duplicar' | 'quitarFoto' | 'borrar'

interface Objetivo { destino: string; rect: DOMRect; conFoto: boolean }

const buscar = (el: EventTarget | null) => (el instanceof Element ? el.closest<HTMLElement>('[data-editable]') : null)
// ¿Tiene recuadro de foto? (imagen o etiqueta de foto vacía)
const tieneFoto = (el: HTMLElement) => !!el.querySelector('img, [role="img"]') || el.dataset.editable === 'historiaFoto'

export default function CapaEdicion({ alAccion }: { alAccion: (accion: Accion, destino: string) => void }) {
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null)
  const actual = useRef<HTMLElement | null>(null)
  const barra = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const medir = () => {
      const el = actual.current
      setObjetivo(el && el.isConnected ? { destino: el.dataset.editable!, rect: el.getBoundingClientRect(), conFoto: tieneFoto(el) } : null)
    }
    const mover = (e: PointerEvent) => {
      if (barra.current?.contains(e.target as Node)) return // sobre la barra: se mantiene el elemento
      const el = buscar(e.target)
      if (el !== actual.current) { actual.current = el; medir() }
    }
    // En modo edición, los clics sobre la página no navegan ni abren enlaces.
    const clic = (e: MouseEvent) => {
      if (barra.current?.contains(e.target as Node)) return
      if ((e.target as Element).closest?.('a, button')) { e.preventDefault(); e.stopPropagation() }
    }
    let raf = 0
    const reubicar = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; medir() }) }
    document.addEventListener('pointermove', mover)
    document.addEventListener('click', clic, true)
    window.addEventListener('scroll', reubicar, { passive: true })
    window.addEventListener('resize', reubicar)
    return () => {
      document.removeEventListener('pointermove', mover)
      document.removeEventListener('click', clic, true)
      window.removeEventListener('scroll', reubicar)
      window.removeEventListener('resize', reubicar)
      cancelAnimationFrame(raf)
    }
  }, [])

  if (!objetivo) return <div className={styles.aviso}>Edición detallada: pasa el mouse sobre un elemento</div>
  const { rect, destino, conFoto } = objetivo
  const soloFoto = destino === 'historiaFoto'
  // La barra va arriba a la derecha del elemento, sin salirse de la pantalla.
  const top = Math.min(Math.max(rect.top + 8, 8), window.innerHeight - 52)
  const right = Math.max(window.innerWidth - rect.right + 8, 8)

  return (
    <>
      <div className={styles.marco} style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />
      <div ref={barra} className={styles.barra} style={{ top, right }}>
        {!soloFoto && <button type="button" onClick={() => alAccion('editar', destino)}>✎ Editar</button>}
        {!soloFoto && <button type="button" onClick={() => alAccion('duplicar', destino)}>⧉ Duplicar</button>}
        {conFoto && <button type="button" onClick={() => alAccion('quitarFoto', destino)}>◫ Quitar foto</button>}
        {!soloFoto && <button type="button" className={styles.peligro} onClick={() => alAccion('borrar', destino)}>✕ Borrar</button>}
      </div>
    </>
  )
}
