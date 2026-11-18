import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import styles from './Carrusel.module.css'

export interface Diapositiva {
  titulo: string
  texto: string
  boton: string
  href: string // '#seccion' cambia de pestaña en el mismo sitio; '/ruta' navega dentro de la app
  externo?: boolean
  img: string // vacío = recuadro con etiquetaFoto (modo "con etiquetas" de las plantillas)
  etiquetaFoto?: string
  editable?: string // valor de data-editable para la edición detallada
  alt: string
  figura: 'logo' | 'anillos' | 'celular' | 'roca' | 'foto'
  fondo: string
}

interface Props {
  slides: Diapositiva[]
  titulo: string // título del sitio para lectores de pantalla
  whatsapp?: string // muestra el botón flotante de WhatsApp
}

// Los textos que empiezan con «→» son etiquetas de una plantilla sin llenar.
const esEtiqueta = (t: string) => t.trim().startsWith('→')

const BLOQUEO_MS = 1000
const UMBRAL_TOQUE = 40
const AUTO_MS = 7000 // tiempo que dura cada diapositiva: la figura crece despacio y luego avanza sola

const Flecha = ({ abajo }: { abajo?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={abajo ? 'M6 9l6 6 6-6' : 'M6 15l6-6 6 6'} />
  </svg>
)

/* Carrusel de portada: cambia con rueda, toque, teclado o flechas; la figura crece despacio y avanza sola. */
export default function Carrusel({ slides, titulo, whatsapp }: Props) {
  const [i, setI] = useState(0)
  const raiz = useRef<HTMLElement>(null)
  const bloqueado = useRef(false)
  const inicioY = useRef<number | null>(null)
  const raf = useRef(0)
  const total = slides.length

  const actual = useRef(0)

  const ir = useCallback((n: number) => {
    if (n < 0 || n >= total || bloqueado.current) return
    bloqueado.current = true
    actual.current = n
    setI(n)
    window.setTimeout(() => { bloqueado.current = false }, BLOQUEO_MS)
  }, [total])

  // Rueda, toque y teclado: cambian de diapositiva sin mover la página.
  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const rueda = (e: WheelEvent) => {
      e.preventDefault()
      if (Math.abs(e.deltaY) < 8) return
      ir(actual.current + (e.deltaY > 0 ? 1 : -1))
    }
    const inicio = (e: TouchEvent) => { inicioY.current = e.touches[0].clientY }
    const mueve = (e: TouchEvent) => { if (inicioY.current !== null) e.preventDefault() }
    const fin = (e: TouchEvent) => {
      if (inicioY.current === null) return
      const dy = inicioY.current - e.changedTouches[0].clientY
      inicioY.current = null
      if (Math.abs(dy) > UMBRAL_TOQUE) ir(actual.current + (dy > 0 ? 1 : -1))
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); ir(actual.current + 1) }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); ir(actual.current - 1) }
    }
    el.addEventListener('wheel', rueda, { passive: false })
    el.addEventListener('touchstart', inicio, { passive: true })
    el.addEventListener('touchmove', mueve, { passive: false })
    el.addEventListener('touchend', fin)
    window.addEventListener('keydown', tecla)
    return () => {
      el.removeEventListener('wheel', rueda)
      el.removeEventListener('touchstart', inicio)
      el.removeEventListener('touchmove', mueve)
      el.removeEventListener('touchend', fin)
      window.removeEventListener('keydown', tecla)
    }
  }, [ir])

  // Avance automático: tras AUTO_MS pasa a la siguiente. Al navegar a mano, `i` cambia y el reloj reinicia.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || i >= total - 1) return
    const t = window.setTimeout(() => ir(actual.current + 1), AUTO_MS)
    return () => window.clearTimeout(t)
  }, [i, ir, total])

  // Parallax con el mouse: solo escribe variables CSS, sin re-renderizar.
  const mover = (e: React.MouseEvent<HTMLElement>) => {
    const el = raiz.current
    if (!el || raf.current) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      el.style.setProperty('--mx', x.toFixed(3))
      el.style.setProperty('--my', y.toFixed(3))
    })
  }
  const salir = () => {
    raiz.current?.style.setProperty('--mx', '0')
    raiz.current?.style.setProperty('--my', '0')
  }

  return (
    <section
      ref={raiz}
      className={styles.heroe}
      style={{ '--dur': `${AUTO_MS}ms` } as CSSProperties}
      aria-roledescription="carrusel"
      aria-label={titulo}
      onMouseMove={mover}
      onMouseLeave={salir}
    >
      <h1 className="solo-lectores">{titulo}</h1>

      {slides.map((s, k) => {
        const activa = k === i
        return (
          <div
            key={k}
            className={`${styles.slide} ${activa ? styles.on : ''}`}
            style={{ '--o': k - i } as CSSProperties}
            data-editable={s.editable}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${k + 1} de ${total}`}
            aria-hidden={!activa}
          >
            <div className={`${styles.capa} ${styles.fondo}`} style={{ backgroundImage: `url(${s.fondo})` }} />
            <div className={`${styles.capa} ${styles.brillo}`} aria-hidden="true">
              <span className={`${styles.humo} ${styles.h1}`} />
              <span className={`${styles.humo} ${styles.h2}`} />
              <span className={`${styles.humo} ${styles.h3}`} />
            </div>
            <div className={`${styles.capa} ${styles.imagen}`}>
              <div className={`${styles.figura} ${styles[s.figura]}`}>
                {s.img ? (
                  <img src={s.img} alt={s.alt} draggable={false} />
                ) : s.etiquetaFoto && (
                  <div className={styles.vacia} role="img" aria-label={s.etiquetaFoto || s.alt}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" />
                    </svg>
                    <span>{s.etiquetaFoto}</span>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.velo} aria-hidden="true" />

            <h2 className={`titular ${styles.titular} ${s.titulo.length > 24 ? styles.largo : ''} ${esEtiqueta(s.titulo) ? styles.hueco : ''}`} aria-label={s.titulo}>
              {activa
                ? s.titulo.split(' ').map((p, j) => (
                    <span className={styles.pal} key={`${k}-${j}`} aria-hidden="true">
                      <span className={styles.palIn} style={{ animationDelay: `${160 + j * 80}ms` }}>{p}</span>
                    </span>
                  ))
                : s.titulo}
            </h2>

            <div className={styles.apoyo}>
              <p className={`${styles.caja} ${esEtiqueta(s.texto) ? styles.hueco : ''}`}>{s.texto}</p>
              {s.externo ? (
                <a className={styles.mas} href={s.href} tabIndex={activa ? 0 : -1} target="_blank" rel="noreferrer">
                  {s.boton}<Flecha2 />
                </a>
              ) : (
                <Link className={styles.mas} to={s.href.startsWith('#') ? { hash: s.href } : s.href} state={{ transicion: true }} tabIndex={activa ? 0 : -1}>
                  {s.boton}<Flecha2 />
                </Link>
              )}
            </div>
          </div>
        )
      })}

      {whatsapp && (
      <a className={styles.wa} href={whatsapp} target="_blank" rel="noreferrer" aria-label="Escríbenos por WhatsApp">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3.6 20.4l1.3-4.1a8.4 8.4 0 1 1 3.1 3z" />
          <path d="M9.2 8.6c.2 2.9 2.5 5.3 5.4 5.6l1.3-1.3-1.8-1-1 .8a4.5 4.5 0 0 1-2-2l.8-1-1-1.8z" />
        </svg>
      </a>
      )}

      <div className={styles.controles}>
        <span className={styles.contador} aria-live="polite"><b>{String(i + 1).padStart(2, '0')}</b> / {String(total).padStart(2, '0')}</span>
        <button type="button" className={styles.flecha} aria-label="Diapositiva anterior" disabled={i === 0} onClick={() => ir(actual.current - 1)}><Flecha /></button>
        <span className={styles.sep} aria-hidden="true" />
        <button type="button" className={styles.flecha} aria-label="Diapositiva siguiente" disabled={i === total - 1} onClick={() => ir(actual.current + 1)}><Flecha abajo /></button>
      </div>

      <div className={styles.barra} aria-hidden="true">
        <span style={{ width: `${((i + 1) / total) * 100}%` }} />
      </div>
      <svg className={styles.grano} aria-hidden="true">
        <filter id="ruido"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" /></filter>
        <rect width="100%" height="100%" filter="url(#ruido)" />
      </svg>
    </section>
  )
}

function Flecha2() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17L17 7" /><path d="M8 7h9v9" />
    </svg>
  )
}
