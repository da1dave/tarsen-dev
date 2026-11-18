import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import Escribir from '../../components/Escribir'
import { Contacto, Nosotros, Pie, Txt, esWeb, hueco } from '../compartido/Secciones'
import type { DatosPlantilla } from '../tipos'
import FondoLogo from './FondoLogo'
import LienzoManta from './LienzoManta'
import { editable } from '../editable'
import styles from './PlantillaManta.module.css'

/*
 * Plantilla Manta (estilo unseen.co): una sola página clara y limpia.
 * Todo el contenido (tarjetas con su título, encabezados, Nosotros y Contacto) tiene efecto tela (WebGL):
 * cada elemento con data-bloque se dobla. La barra y los botones llevan con scroll suave a cada parte.
 */

const SECCIONES = [
  { id: 'inicio', texto: 'Inicio' },
  { id: 'servicios', texto: 'Servicios' },
  { id: 'nosotros', texto: 'Nosotros' },
  { id: 'contacto', texto: 'Contacto' },
]

function irA(e: MouseEvent<HTMLAnchorElement>, id: string) {
  const destino = document.getElementById(id)
  if (!destino) return
  e.preventDefault()
  const quieta = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  destino.scrollIntoView({ behavior: quieta ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
}

const anclaDe = (href: string) => href.replace('#', '') || 'inicio'

/* Recuadro de foto sin llenar (plantilla con etiquetas). */
function FotoVacia({ etiqueta }: { etiqueta: string }) {
  return (
    <div className={styles.vacia}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" />
      </svg>
      <span>{etiqueta}</span>
    </div>
  )
}

function Foto({ src, etiqueta }: { src: string; etiqueta: string }) {
  if (!src && !etiqueta) return null // foto quitada
  return <div className={styles.imagen}>{src ? <img src={src} alt="" /> : <FotoVacia etiqueta={etiqueta} />}</div>
}

function Whatsapp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.6 20.4l1.3-4.1a8.4 8.4 0 1 1 3.1 3z" />
      <path d="M9.2 8.6c.2 2.9 2.5 5.3 5.4 5.6l1.3-1.3-1.8-1-1 .8a4.5 4.5 0 0 1-2-2l.8-1-1-1.8z" />
    </svg>
  )
}

export default function PlantillaManta({ datos: d }: { datos: DatosPlantilla }) {
  const principal = useRef<HTMLElement>(null)
  const [activa, setActiva] = useState('inicio')

  // Marca en la barra la sección que se está viendo.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => entradas.forEach((en) => { if (en.isIntersecting) setActiva(en.target.id) }),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    SECCIONES.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])

  const wa = esWeb(d.waHref) ? d.waHref : '#contacto'

  return (
    <div className={styles.raiz} style={{ '--acento': d.acento } as CSSProperties}>
      <FondoLogo logo={d.logo || undefined} imagen={d.logoFondo} />
      <LienzoManta raiz={principal} version={d} />

      <header className={styles.nav}>
        <a href="#inicio" className={styles.marca} onClick={(e) => irA(e, 'inicio')}>
          {d.logo && <img src={d.logo} alt="" />}
          <span className={hueco(d.nombre)}>{d.nombre}</span>
        </a>
        <nav aria-label="Secciones" className={styles.enlaces}>
          {SECCIONES.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={(e) => irA(e, s.id)} aria-current={activa === s.id ? 'true' : undefined}>{s.texto}</a>
          ))}
        </nav>
        <a className={styles.redondo} href={wa} target={esWeb(wa) ? '_blank' : undefined} rel="noreferrer" aria-label="Escríbenos por WhatsApp">
          <Whatsapp />
        </a>
      </header>

      <main ref={principal} className={styles.principal}>
        {/* Portada y destacados */}
        <section id="inicio" className={styles.portada} aria-labelledby="m-titulo">
          <Escribir etiqueta="h1" id="m-titulo" className={`${styles.titulo} ${hueco(d.nombre)}`} texto={d.nombre} ms={55} activo ultimo />
          <div className={styles.rejilla}>
            {d.slides.map((s, k) => (
              <a key={k} data-bloque {...editable('slides', s, k)} href={s.href} className={styles.tarjeta} onClick={(e) => irA(e, anclaDe(s.href))}>
                <div className={styles.fila}>
                  <div>
                    <strong><Txt t={s.titulo} /></strong>
                    <span><Txt t={s.texto} /></span>
                  </div>
                  <span className={styles.flecha} aria-hidden="true">↘</span>
                </div>
                <Foto src={s.imagen} etiqueta={s.fotoEtiqueta} />
              </a>
            ))}
          </div>
        </section>

        {/* Servicios, también con efecto tela */}
        <section id="servicios" className={styles.bloque} aria-labelledby="m-serv">
          <header data-bloque className={styles.cab}>
            <p className={styles.kicker}>Servicios</p>
            <h2 id="m-serv" className={`${styles.h2} ${hueco(d.frase)}`}>{d.frase}</h2>
            <p className={`${styles.sub} ${hueco(d.serviciosIntro)}`}>{d.serviciosIntro}</p>
          </header>
          <div className={`${styles.rejilla} ${styles.tres}`}>
            {d.servicios.map((s, k) => (
              <article key={k} data-bloque {...editable('servicios', s, k)} className={styles.tarjeta}>
                <div className={styles.fila}>
                  <div>
                    <strong><span className={styles.num}>0{k + 1}</span> <Txt t={s.titulo} /></strong>
                    <span><Txt t={s.texto} /></span>
                  </div>
                </div>
                <Foto src={s.imagen} etiqueta={s.fotoEtiqueta} />
              </article>
            ))}
          </div>
          <div data-bloque className={styles.cierre}>
            <h3><Txt t={d.cta} /></h3>
            <a className={styles.btn} href={wa} target={esWeb(wa) ? '_blank' : undefined} rel="noreferrer">{d.ctaBoton}</a>
          </div>
        </section>

        <Nosotros d={d} fondo="" enPagina fotoLlena />
        <Contacto d={d} fondo="" enPagina />
        <Pie d={d} />
      </main>
    </div>
  )
}
