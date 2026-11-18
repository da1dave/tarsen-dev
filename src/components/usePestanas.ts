import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'

export interface Pestana<T extends string = string> {
  id: T
  texto: string
  to: string // '/#id' o '#id'
}

/** La pestaña que indica el hash (#id); si no coincide con ninguna, la primera. */
export function pestanaDesdeHash<T extends string>(hash: string, ids: readonly T[]): T {
  const id = hash.replace('#', '')
  return (ids as readonly string[]).includes(id) ? (id as T) : ids[0]
}

/*
 * Pestañas por hash con transición fluida (View Transitions API, estilos en src/styles/tokens.css).
 * El navegador captura la vista vieja y la nueva ya renderizadas y las funde con desplazamiento.
 * Solo anima cuando el cambio viene de un clic (los enlaces pasan state.transicion);
 * carga directa, atrás/adelante o "reducir movimiento" cambian al instante.
 * Devuelve la pestaña activa (para la barra) y la que debe mostrarse (para el contenido).
 */
export function usePestanas<T extends string>(ids: readonly T[]) {
  const { hash, state } = useLocation()
  const navegar = useNavigate()
  const activa = pestanaDesdeHash(hash, ids)
  const [mostrada, setMostrada] = useState(activa)
  const actual = useRef(activa)

  useEffect(() => {
    const de = actual.current
    if (activa === de) return
    actual.current = activa

    const cambiar = () => {
      flushSync(() => setMostrada(activa))
      window.scrollTo(0, 0)
    }
    const pedida = (state as { transicion?: boolean } | null)?.transicion === true
    const quieta = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!pedida || quieta || !document.startViewTransition) {
      cambiar()
      return
    }

    const raiz = document.documentElement
    raiz.dataset.dir = ids.indexOf(activa) > ids.indexOf(de) ? 'adelante' : 'atras'
    document.startViewTransition(cambiar).finished.finally(() => {
      delete raiz.dataset.dir
      // Borra la marca para que el botón atrás no repita la animación.
      navegar({ hash: window.location.hash }, { replace: true, state: null })
    })
  }, [activa, state, navegar, ids])

  return { activa, mostrada }
}
