import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { Txt, esWeb, hueco } from '../compartido/Secciones'
import { editable } from '../editable'
import type { DatosPlantilla } from '../tipos'
import LienzoMarea, { type Escena } from './LienzoMarea'
import styles from './PlantillaMarea.module.css'

/*
 * Plantilla Marea: luminosa y líquida. La portada son "capítulos" a pantalla completa (uno por destacado):
 * al hacer scroll, la escena siguiente entra como agua que sube (LienzoMarea, WebGL). Cada escena es la
 * foto del destacado o, si no tiene, un degradado líquido con colores derivados del color de la marca.
 * Después vienen Servicios, Nosotros y Contacto sobre fondo claro, con bordes de ola y fotos que se
 * llenan como un vaso de agua al aparecer.
 */

const FUENTE = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&display=swap'
const quieto = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const dos = (n: number) => String(n).padStart(2, '0')

// ---------- Colores: tres tonos pastel por escena, girando alrededor del color de la marca ----------
function aHsl(hex: string): [number, number, number] {
  const n = parseInt(/^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : '6c47ff', 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}
function aHex(h: number, s: number, l: number) {
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
const colores = (acento: string, k: number): [string, string, string] => {
  const [h] = aHsl(acento)
  const base = h + k * 38
  return [aHex(base % 360, 0.78, 0.66), aHex((base + 55) % 360, 0.85, 0.8), aHex((base + 300) % 360, 0.7, 0.9)]
}

// ---------- Piezas ----------
/* Foto que se llena como un vaso de agua al entrar en pantalla. */
function Llenado({ src, etiqueta, className = '' }: { src: string; etiqueta: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [lleno, setLleno] = useState(quieto)
  useEffect(() => {
    const el = ref.current
    if (!el || lleno) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setLleno(true); obs.disconnect() } }, { threshold: 0.2 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [lleno])
  if (!src && !etiqueta) return null // foto quitada
  return (
    <div ref={ref} className={`${styles.llenado} ${lleno ? styles.lleno : ''} ${className}`}>
      {src ? <img src={src} alt="" loading="lazy" /> : <div className={styles.vacia} role="img" aria-label={etiqueta}><span>{etiqueta}</span></div>}
    </div>
  )
}

/* Borde superior de una sección: una ola que se mueve despacio. */
function Ola({ invertida = false }: { invertida?: boolean }) {
  return (
    <svg className={`${styles.ola} ${invertida ? styles.olaInvertida : ''}`} viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
      <path className={styles.olaFondo} d="M0 70 C 240 20, 480 110, 720 64 S 1200 20, 1440 66 L1440 120 L0 120 Z" />
      <path className={styles.olaFrente} d="M0 86 C 260 40, 520 120, 760 80 S 1220 48, 1440 84 L1440 120 L0 120 Z" />
    </svg>
  )
}

function Whatsapp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.6 20.4l1.3-4.1a8.4 8.4 0 1 1 3.1 3z" />
      <path d="M9.2 8.6c.2 2.9 2.5 5.3 5.4 5.6l1.3-1.3-1.8-1-1 .8a4.5 4.5 0 0 1-2-2l.8-1-1-1.8z" />
    </svg>
  )
}

export default function PlantillaMarea({ datos: d }: { datos: DatosPlantilla }) {
  const raiz = useRef<HTMLDivElement>(null)
  const capitulos = useRef<HTMLElement>(null)
  const lenis = useRef<Lenis | null>(null)
  const progreso = useRef(0)
  const [activo, setActivo] = useState(0)
  const [conFondo, setConFondo] = useState(false)
  const [sinMovimiento] = useState(quieto)

  const slides = d.slides
  const n = Math.max(slides.length, 1)
  const escenas: Escena[] = useMemo(
    () => slides.map((s, k) => ({ imagen: s.imagen, colores: colores(d.acento, k) })),
    [slides, d.acento],
  )

  useEffect(() => {
    if (document.getElementById('fuente-marea')) return
    const link = Object.assign(document.createElement('link'), { id: 'fuente-marea', rel: 'stylesheet', href: FUENTE })
    document.head.appendChild(link)
  }, [])

  // Scroll suave; el progreso de los capítulos alimenta al lienzo y decide qué texto se ve.
  useEffect(() => {
    const alScroll = (y: number) => {
      setConFondo(y > 30)
      const el = capitulos.current
      if (!el) return
      const p = Math.max(0, (y - el.offsetTop) / window.innerHeight)
      progreso.current = p
      const i = Math.floor(p)
      const local = p - i
      setActivo(Math.min(local > 0.6 ? i + 1 : i, n - 1))
    }
    if (sinMovimiento) {
      const nativo = () => alScroll(window.scrollY)
      nativo()
      window.addEventListener('scroll', nativo, { passive: true })
      return () => window.removeEventListener('scroll', nativo)
    }
    const l = new Lenis({ lerp: 0.085, smoothWheel: true })
    lenis.current = l
    l.on('scroll', ({ scroll }: { scroll: number }) => alScroll(scroll))
    alScroll(window.scrollY)
    let raf = 0
    const cuadro = (t: number) => { l.raf(t); raf = requestAnimationFrame(cuadro) }
    raf = requestAnimationFrame(cuadro)
    return () => { cancelAnimationFrame(raf); l.destroy(); lenis.current = null }
  }, [n, sinMovimiento])

  const irA = (destino: number | HTMLElement) => {
    if (lenis.current) lenis.current.scrollTo(destino, { duration: 1.6 })
    else window.scrollTo({ top: typeof destino === 'number' ? destino : destino.offsetTop })
  }
  const irACapitulo = (k: number) => {
    const el = capitulos.current
    if (el) irA(el.offsetTop + k * window.innerHeight + 2)
  }
  const enlace = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    const id = href.replace('#', '')
    if (id === 'inicio' || !id) { e.preventDefault(); irACapitulo(0); return }
    const el = document.getElementById(id)
    if (!el) return
    e.preventDefault()
    irA(el)
    history.replaceState(null, '', `#${id}`)
  }

  const wa = esWeb(d.waHref) ? d.waHref : '#contacto'
  const externo = esWeb(wa) ? { target: '_blank', rel: 'noreferrer' } : {}
  const etiqueta = (t: ReactNode) => <p className={styles.etiqueta}>{t}</p>

  return (
    <div ref={raiz} className={styles.raiz} style={{ '--acento': d.acento } as CSSProperties}>
      <header className={`${styles.nav} ${conFondo ? styles.navFondo : ''}`}>
        <a href="#inicio" className={styles.marca} onClick={(e) => enlace(e, '#inicio')}>
          {d.logo ? <img src={d.logo} alt="" /> : null}
          <span className={hueco(d.nombre)}>{d.nombre}</span>
        </a>
        <nav aria-label="Secciones" className={styles.enlaces}>
          <a href="#servicios" onClick={(e) => enlace(e, '#servicios')}>Servicios</a>
          <a href="#nosotros" onClick={(e) => enlace(e, '#nosotros')}>Nosotros</a>
          <a href="#contacto" onClick={(e) => enlace(e, '#contacto')}>Contacto</a>
        </nav>
        <a className={styles.pildora} href={wa} {...externo}><Whatsapp /> <span>Escríbenos</span></a>
      </header>

      <main>
        {/* Capítulos: uno por destacado; la escena siguiente entra como agua */}
        <section id="inicio" ref={capitulos} className={styles.capitulos} style={{ height: `${n * 100}svh` }} aria-label="Destacados">
          <div className={styles.escenario}>
            <LienzoMarea escenas={escenas} progreso={progreso} quieto={sinMovimiento} className={styles.lienzo} />
            {slides.map((s, k) => (
              <article
                key={k}
                className={`${styles.capitulo} ${k === activo ? styles.capituloActivo : ''}`}
                aria-hidden={k !== activo}
                {...editable('slides', s, k)}
              >
                {(s.imagen || s.fotoEtiqueta) && <span role="img" aria-label="Foto de este destacado" className={styles.marcaFoto} />}
                <div className={styles.cristal}>
                  <p className={styles.numero}>{dos(k + 1)} <span>/ {dos(n)}</span></p>
                  {k === 0 ? <h1 className={styles.titulo}><Txt t={s.titulo} /></h1> : <h2 className={styles.titulo}><Txt t={s.titulo} /></h2>}
                  <p className={styles.bajada}><Txt t={s.texto} /></p>
                  <a className={styles.boton} href={s.href} onClick={(e) => enlace(e, s.href)} tabIndex={k === activo ? 0 : -1}>
                    <Txt t={s.boton} /> <span aria-hidden="true">→</span>
                  </a>
                  {!s.imagen && s.fotoEtiqueta && <p className={styles.etiquetaFoto}>{s.fotoEtiqueta}</p>}
                </div>
              </article>
            ))}
            {n > 1 && (
              <nav className={styles.indice} aria-label="Ir a un destacado">
                {slides.map((_, k) => (
                  <button key={k} type="button" onClick={() => irACapitulo(k)} aria-current={k === activo ? 'true' : undefined} aria-label={`Destacado ${k + 1}`}>
                    <span>{dos(k + 1)}</span>
                  </button>
                ))}
              </nav>
            )}
            <p className={`${styles.desliza} ${activo > 0 ? styles.oculto : ''}`} aria-hidden="true">Desliza <span>↓</span></p>
          </div>
        </section>

        {/* Servicios */}
        <section id="servicios" className={styles.seccion} aria-labelledby="m-serv">
          <Ola />
          <div className={styles.contenido}>
            <header className={styles.cabecera}>
              {etiqueta('Servicios')}
              <h2 id="m-serv" className={styles.h2}><Txt t={d.frase} /></h2>
              <p className={styles.parrafo}><Txt t={d.serviciosIntro} /></p>
            </header>
            <div className={styles.servicios}>
              {d.servicios.map((s, k) => (
                <article key={k} className={styles.servicio} {...editable('servicios', s, k)}>
                  <Llenado src={s.imagen} etiqueta={s.fotoEtiqueta} />
                  <span className={styles.servNumero}>{dos(k + 1)}</span>
                  <h3 className={styles.h3}><Txt t={s.titulo} /></h3>
                  <p className={styles.parrafoChico}><Txt t={s.texto} /></p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Nosotros */}
        <section id="nosotros" className={`${styles.seccion} ${styles.nosotros}`} aria-labelledby="m-hist">
          <div className={`${styles.contenido} ${styles.historia} ${d.historiaImagen || d.historiaFotoEtiqueta ? '' : styles.unaColumna}`}>
            <div data-editable="historiaFoto"><Llenado src={d.historiaImagen} etiqueta={d.historiaFotoEtiqueta} className={styles.fotoHistoria} /></div>
            <div>
              {etiqueta('Nosotros')}
              <h2 id="m-hist" className={styles.h2}><Txt t={d.historiaTitulo} /></h2>
              <p className={styles.parrafo}><Txt t={d.historia} /></p>
              {d.datos.length > 0 && (
                <div className={styles.cifras}>
                  {d.datos.map((x, k) => (
                    <div key={k} className={styles.cifra} {...editable('datos', x, k)}>
                      <strong><Txt t={x.valor} /></strong>
                      <span><Txt t={x.etiqueta} /></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Contacto */}
        <section id="contacto" className={styles.contacto} aria-labelledby="m-cont">
          <Ola invertida />
          <div className={styles.manchas} aria-hidden="true"><i /><i /><i /></div>
          <div className={styles.contenido}>
            <header className={styles.cabecera}>
              {etiqueta('Contacto')}
              <h2 id="m-cont" className={styles.h2Grande}><Txt t={d.cta} /></h2>
              <a className={styles.botonGrande} href={wa} {...externo}><Whatsapp /> <Txt t={d.ctaBoton} /></a>
            </header>
            <div className={styles.datosContacto}>
              <div>
                <h3>Dónde estamos</h3>
                <p><Txt t={d.direccion} /></p>
                <p><Txt t={d.horario} /></p>
              </div>
              <div>
                <h3>Escríbenos o llámanos</h3>
                <p><Txt t={d.telefono} /></p>
                <p><Txt t={d.whatsapp} /></p>
                <p><Txt t={d.correo} /></p>
              </div>
              {d.redes.length > 0 && (
                <div>
                  <h3>Redes</h3>
                  {d.redes.map((r, k) => <p key={k} {...editable('redes', r, k)}>{r.red} · <Txt t={r.usuario} /></p>)}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.pie}>
        <span className={hueco(d.nombre)}>{d.nombre}</span>
        <span>© {new Date().getFullYear()} · Hecho con Tarsen Dev</span>
      </footer>
    </div>
  )
}
