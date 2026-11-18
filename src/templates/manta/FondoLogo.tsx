import { useEffect, useRef } from 'react'
import styles from './PlantillaManta.module.css'

/*
 * Fondo claro con el logo del negocio como elemento gráfico: tres copias grandes y suaves a distintas
 * profundidades que se desplazan con el cursor (parallax), como la escena de fondo de unseen.co.
 *  - Con `imagen` (p. ej. el logo metálico): la imagen en blanco y negro y muy apagada.
 *  - Solo con `logo`: su silueta en gris tenue.
 * Sin ninguno, quedan solo las luces suaves.
 */
export default function FondoLogo({ logo, imagen }: { logo?: string; imagen?: string }) {
  const capa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const mover = (e: PointerEvent) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        capa.current?.style.setProperty('--cx', (e.clientX / window.innerWidth - 0.5).toFixed(3))
        capa.current?.style.setProperty('--cy', (e.clientY / window.innerHeight - 0.5).toFixed(3))
      })
    }
    window.addEventListener('pointermove', mover)
    return () => { window.removeEventListener('pointermove', mover); cancelAnimationFrame(raf) }
  }, [])

  const estilo = imagen
    ? { backgroundImage: `url(${imagen})` }
    : logo ? { maskImage: `url(${logo})`, WebkitMaskImage: `url(${logo})` } : undefined
  const clase = imagen ? styles.foto : styles.silueta
  return (
    <div ref={capa} className={styles.fondo} aria-hidden="true">
      <div className={`${styles.luz} ${styles.luz1}`} />
      <div className={`${styles.luz} ${styles.luz2}`} />
      {estilo && (
        <>
          <div className={`${clase} ${styles.s1}`} style={estilo} />
          <div className={`${clase} ${styles.s2}`} style={estilo} />
          <div className={`${clase} ${styles.s3}`} style={estilo} />
        </>
      )}
    </div>
  )
}
