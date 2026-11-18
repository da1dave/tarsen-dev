import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Txt, esEtiqueta, esWeb, hueco } from '../compartido/Secciones'
import type { DatosPlantilla } from '../tipos'
import TextoNiebla from './TextoNiebla'
import { editable } from '../editable'
import styles from './PlantillaAurea.module.css'

/*
 * Plantilla Áurea: landing elegante para negocios que quieren verse exclusivos (p. ej. un restaurante),
 * inspirada en symphonyofvines.unseen.co. Una sola página con scroll suave (Lenis), tonos dorados,
 * tipografía serif y textos que aparecen desde el desenfoque (TextoNiebla). La portada usa la imagen
 * del primer destacado como fondo, con parallax al hacer scroll y al mover el cursor.
 */

const FONDO_PREDETERMINADO = '/img/aurea/fondo.jpg'
const FUENTE = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap'
const SECCIONES = [
  { id: 'inicio', texto: 'Inicio' },
  { id: 'servicios', texto: 'Servicios' },
  { id: 'nosotros', texto: 'Nosotros' },
  { id: 'contacto', texto: 'Contacto' },
]
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']

const quieto = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* Imagen que aparece desde el desenfoque al entrar en pantalla; recuadro de etiqueta si está vacía. */
function Foto({ src, etiqueta, className = '' }: { src: string; etiqueta: string; className?: string }) {
  if (!src && !etiqueta) return null // foto quitada
  return <FotoVisible src={src} etiqueta={etiqueta} className={className} />
}

function FotoVisible({ src, etiqueta, className = '' }: { src: string; etiqueta: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(quieto)
  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [visible])
  return (
    <div ref={ref} className={`${styles.foto} ${visible ? styles.fotoVisible : ''} ${className}`}>
      {src ? <img src={src} alt="" loading="lazy" /> : (
        <div className={styles.vacia}><span className={styles.hueco}>{etiqueta}</span></div>
      )}
    </div>
  )
}

function Whatsapp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.6 20.4l1.3-4.1a8.4 8.4 0 1 1 3.1 3z" />
      <path d="M9.2 8.6c.2 2.9 2.5 5.3 5.4 5.6l1.3-1.3-1.8-1-1 .8a4.5 4.5 0 0 1-2-2l.8-1-1-1.8z" />
    </svg>
  )
}

/* Título de portada: la primera palabra en cursiva y el resto en mayúsculas, como "The / SYMPHONY OF VINES". */
function TituloPortada({ texto }: { texto: string }) {
  const palabras = texto.split(' ')
  if (esEtiqueta(texto) || palabras.length < 2) {
    return <TextoNiebla como="h1" id="a-titulo" texto={texto} className={styles.tituloResto} />
  }
  return (
    <h1 id="a-titulo" className={styles.titulo} aria-label={texto}>
      <TextoNiebla como="span" texto={palabras[0]} className={styles.tituloCursiva} />
      <TextoNiebla como="span" texto={palabras.slice(1).join(' ')} className={styles.tituloResto} retraso={250} />
    </h1>
  )
}

export default function PlantillaAurea({ datos: d }: { datos: DatosPlantilla }) {
  const raiz = useRef<HTMLDivElement>(null)
  const lenis = useRef<Lenis | null>(null)
  const [conFondo, setConFondo] = useState(false)
  const [activa, setActiva] = useState('inicio')

  // Tipografía serif solo para esta plantilla.
  useEffect(() => {
    if (document.getElementById('fuente-aurea')) return
    const link = Object.assign(document.createElement('link'), { id: 'fuente-aurea', rel: 'stylesheet', href: FUENTE })
    document.head.appendChild(link)
  }, [])

  // Scroll suave y parallax de la portada (scroll y cursor), escritos como variables CSS.
  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const alScroll = (y: number) => {
      el.style.setProperty('--sy', String(y))
      setConFondo(y > 40)
    }
    const mover = (e: PointerEvent) => {
      el.style.setProperty('--mx', (e.clientX / window.innerWidth - 0.5).toFixed(3))
      el.style.setProperty('--my', (e.clientY / window.innerHeight - 0.5).toFixed(3))
    }
    if (quieto()) {
      const nativo = () => alScroll(window.scrollY)
      window.addEventListener('scroll', nativo, { passive: true })
      return () => window.removeEventListener('scroll', nativo)
    }
    const l = new Lenis({ lerp: 0.08, smoothWheel: true })
    lenis.current = l
    l.on('scroll', ({ scroll }: { scroll: number }) => alScroll(scroll))
    let raf = 0
    const cuadro = (t: number) => { l.raf(t); raf = requestAnimationFrame(cuadro) }
    raf = requestAnimationFrame(cuadro)
    window.addEventListener('pointermove', mover)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', mover)
      l.destroy()
      lenis.current = null
    }
  }, [])

  // Marca en la barra la sección que se está viendo.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => entradas.forEach((en) => { if (en.isIntersecting) setActiva(en.target.id) }),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    SECCIONES.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])

  const irA = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    const id = href.replace('#', '') || 'inicio'
    const destino = document.getElementById(id)
    if (!destino) return
    e.preventDefault()
    if (lenis.current) lenis.current.scrollTo(destino, { offset: id === 'inicio' ? 0 : -40, duration: 1.8 })
    else destino.scrollIntoView({ block: 'start' })
    history.replaceState(null, '', `#${id}`)
  }

  const wa = esWeb(d.waHref) ? d.waHref : '#contacto'
  const externo = esWeb(wa) ? { target: '_blank', rel: 'noreferrer' } : {}
  const [portada, ...destacados] = d.slides
  const fondo = portada?.imagen || FONDO_PREDETERMINADO
  const kicker = (t: ReactNode) => <p className={styles.kicker}>{t}</p>

  return (
    <div ref={raiz} className={styles.raiz}>
      <header className={`${styles.nav} ${conFondo ? styles.navFondo : ''}`}>
        <a className={styles.circulo} href={wa} {...externo} aria-label="Escríbenos por WhatsApp"><Whatsapp /></a>
        <a href="#inicio" className={`${styles.marca} ${hueco(d.nombre)}`} onClick={(e) => irA(e, '#inicio')}>{d.nombre}</a>
        <nav aria-label="Secciones" className={styles.enlaces}>
          {SECCIONES.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={(e) => irA(e, s.id)} aria-current={activa === s.id ? 'true' : undefined}>{s.texto}</a>
          ))}
        </nav>
      </header>

      <main>
        {/* Portada */}
        <section id="inicio" className={styles.portada} aria-labelledby="a-titulo">
          <div className={styles.portadaFondo} style={{ backgroundImage: `url(${fondo})` }} aria-hidden="true" />
          <div className={styles.portadaVelo} aria-hidden="true" />
          <div className={styles.portadaTexto} {...(portada ? editable('slides', portada, 0) : {})}>
            {portada && <TituloPortada texto={portada.titulo} />}
            {portada && <TextoNiebla texto={portada.texto} por="palabra" className={styles.portadaSub} retraso={900} />}
            {portada && <a className={styles.boton} href={portada.href} onClick={(e) => irA(e, portada.href)}>{portada.boton}</a>}
          </div>
        </section>

        {/* Destacados, en filas alternadas */}
        <section className={styles.destacados} aria-label="Destacados">
          {destacados.map((s, k) => (
            <article key={k} {...editable('slides', s, k + 1)} className={`${styles.fila} ${k % 2 ? styles.invertida : ''} ${s.imagen || s.fotoEtiqueta ? '' : styles.unaColumna}`}>
              <Foto src={s.imagen} etiqueta={s.fotoEtiqueta} />
              <div className={styles.filaTexto}>
                {kicker(ROMANOS[k])}
                <TextoNiebla como="h2" texto={s.titulo} className={styles.h2} />
                <TextoNiebla texto={s.texto} por="palabra" className={styles.parrafo} retraso={300} />
                <a className={styles.enlace} href={s.href} onClick={(e) => irA(e, s.href)}><Txt t={s.boton} /> <span aria-hidden="true">→</span></a>
              </div>
            </article>
          ))}
        </section>

        {/* Servicios */}
        <section id="servicios" className={styles.seccion} aria-labelledby="a-serv">
          <header className={styles.cabCentrada}>
            {kicker('Servicios')}
            <TextoNiebla como="h2" id="a-serv" texto={d.frase} className={styles.h2Grande} />
            <TextoNiebla texto={d.serviciosIntro} por="palabra" className={styles.parrafo} retraso={400} />
          </header>
          <div className={styles.servicios}>
            {d.servicios.map((s, k) => (
              <article key={k} className={styles.servicio} {...editable('servicios', s, k)}>
                <Foto src={s.imagen} etiqueta={s.fotoEtiqueta} className={styles.fotoAlta} />
                <span className={styles.romano}>{ROMANOS[k]}</span>
                <TextoNiebla como="h3" texto={s.titulo} className={styles.h3} />
                <TextoNiebla texto={s.texto} por="palabra" className={styles.parrafoChico} retraso={200} />
              </article>
            ))}
          </div>
        </section>

        {/* Nosotros */}
        <section id="nosotros" className={`${styles.seccion} ${styles.nosotros} ${d.historiaImagen || d.historiaFotoEtiqueta ? '' : styles.unaColumna}`} aria-labelledby="a-hist">
          <div data-editable="historiaFoto"><Foto src={d.historiaImagen} etiqueta={d.historiaFotoEtiqueta} className={styles.fotoNosotros} /></div>
          <div>
            {kicker('Nosotros')}
            <TextoNiebla como="h2" id="a-hist" texto={d.historiaTitulo} className={styles.h2} />
            <TextoNiebla texto={d.historia} por="palabra" className={styles.parrafo} retraso={300} />
            <div className={styles.datos}>
              {d.datos.map((x, k) => (
                <div key={k} className={styles.dato} {...editable('datos', x, k)}>
                  <TextoNiebla como="span" texto={x.valor} className={styles.datoValor} retraso={k * 150} />
                  <span className={styles.datoEtiqueta}><Txt t={x.etiqueta} /></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contacto */}
        <section id="contacto" className={styles.seccion} aria-labelledby="a-cont">
          <header className={styles.cabCentrada}>
            {kicker('Contacto')}
            <TextoNiebla como="h2" id="a-cont" texto={d.cta} className={styles.h2Grande} />
          </header>
          <div className={styles.contacto}>
            <div>
              <h3 className={styles.contactoTitulo}>Dónde estamos</h3>
              <p><Txt t={d.direccion} /></p>
              <p><Txt t={d.horario} /></p>
            </div>
            <div>
              <h3 className={styles.contactoTitulo}>Escríbenos o llámanos</h3>
              <p><Txt t={d.telefono} /></p>
              <p><Txt t={d.whatsapp} /></p>
              <p><Txt t={d.correo} /></p>
            </div>
            <div>
              <h3 className={styles.contactoTitulo}>Redes</h3>
              {d.redes.map((r, k) => <p key={k} {...editable('redes', r, k)}>{r.red} · <Txt t={r.usuario} /></p>)}
            </div>
          </div>
          <div className={styles.centro}>
            <a className={styles.boton} href={wa} {...externo}><Txt t={d.ctaBoton} /></a>
          </div>
        </section>
      </main>

      <footer className={styles.pie}>
        <span className={`${styles.pieMarca} ${hueco(d.nombre)}`}>{d.nombre}</span>
        <span>© {new Date().getFullYear()} · Hecho con Tarsen Dev</span>
      </footer>
    </div>
  )
}
