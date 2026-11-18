import { useState, type CSSProperties, type ReactNode } from 'react'
import Escribir from '../../components/Escribir'
import Icono from '../../components/Iconos'
import BarraSitio from '../../components/Navbar/BarraSitio'
import barra from '../../components/Navbar/Navbar.module.css'
import { usePestanas, type Pestana } from '../../components/usePestanas'
import type { DatosPlantilla } from '../tipos'
import { conFoto } from '../visibilidad'
import { editable } from '../editable'
import styles from './Secciones.module.css'

/*
 * Piezas comunes de las plantillas: pestañas, barra, secciones Servicios / Nosotros / Contacto y pie.
 * Cada plantilla solo define su portada (pestaña Inicio) y, si quiere, un fondo propio.
 */

export const FONDOS = ['/img/espacio_1.jpg', '/img/espacio_2.jpg', '/img/espacio_3.jpg', '/img/espacio_4.jpg']

const IDS = ['inicio', 'servicios', 'nosotros', 'contacto'] as const
type IdSeccion = (typeof IDS)[number]
const PESTANAS: Pestana<IdSeccion>[] = [
  { id: 'inicio', texto: 'Inicio', to: '#inicio' },
  { id: 'servicios', texto: 'Servicios', to: '#servicios' },
  { id: 'nosotros', texto: 'Nosotros', to: '#nosotros' },
  { id: 'contacto', texto: 'Contacto', to: '#contacto' },
]

// Los textos que empiezan con «→» son etiquetas de la plantilla sin llenar.
export const esEtiqueta = (t: string) => t.trim().startsWith('→')
export const hueco = (t: string) => (esEtiqueta(t) ? styles.hueco : '')
export const Txt = ({ t }: { t: string }) => <span className={hueco(t) || undefined}>{t}</span>
export const esWeb = (url: string) => /^https?:\/\//.test(url)

export function Foto({ src, etiqueta, className }: { src: string; etiqueta: string; className?: string }) {
  return src ? (
    <img className={className} src={src} alt="" />
  ) : (
    <div className={styles.vacia} role="img" aria-label={etiqueta}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" />
      </svg>
      <span>{etiqueta}</span>
    </div>
  )
}

export function Boton({ d, className }: { d: DatosPlantilla; className: string }) {
  return esWeb(d.waHref)
    ? <a className={className} href={d.waHref} target="_blank" rel="noreferrer">{d.ctaBoton}</a>
    : <a className={className} href={d.waHref}>{d.ctaBoton}</a>
}

interface PropsSeccion { d: DatosPlantilla; fondo?: string; enPagina?: boolean; fotoLlena?: boolean }

export function Servicios({ d, fondo = 'resplandor', enPagina }: PropsSeccion) {
  const [tituloListo, setTituloListo] = useState(false)
  return (
    <section id="servicios" className={`${fondo} ${styles.sec} ${enPagina ? styles.enPagina : ''}`} aria-labelledby="o-serv">
      <div className={styles.contenido} style={{ viewTransitionName: 'orbita-servicios' }}>
        <header className={styles.cab}>
          <p className={styles.kicker}>Servicios</p>
          <Escribir etiqueta="h2" id="o-serv" className={`${styles.titulo} ${hueco(d.frase)}`} texto={d.frase} ms={40} activo onFin={() => setTituloListo(true)} />
          <Escribir className={`${styles.sub} ${hueco(d.serviciosIntro)}`} texto={d.serviciosIntro} ms={20} activo={tituloListo} ultimo />
        </header>
        <ol className={styles.servicios}>
          {d.servicios.map((s, k) => (
            <li key={k} className={styles.tarjeta} {...editable('servicios', s, k)}>
              {conFoto(s.imagen, s.fotoEtiqueta) && (
                <div className={styles.foto} style={{ backgroundImage: `url(${FONDOS[(k + 2) % 4]})` }}>
                  <Foto src={s.imagen} etiqueta={s.fotoEtiqueta} />
                </div>
              )}
              <span className={styles.num}>0{k + 1}</span>
              <h3><Txt t={s.titulo} /></h3>
              <p><Txt t={s.texto} /></p>
            </li>
          ))}
        </ol>
        <div className={styles.cierre}>
          <h3><Txt t={d.cta} /></h3>
          <Boton d={d} className={styles.btn} />
        </div>
      </div>
    </section>
  )
}

export function Nosotros({ d, fondo = 'resplandor', enPagina, fotoLlena }: PropsSeccion) {
  return (
    <section id="nosotros" className={`${fondo} ${styles.sec} ${styles.centrada} ${enPagina ? styles.enPagina : ''}`} aria-labelledby="o-hist">
      <div className={`${styles.historia} ${conFoto(d.historiaImagen, d.historiaFotoEtiqueta) ? '' : styles.unaColumna}`} style={{ viewTransitionName: 'orbita-nosotros' }}>
        {conFoto(d.historiaImagen, d.historiaFotoEtiqueta) && (
          <div data-bloque data-editable="historiaFoto" className={`${styles.foto} ${styles.fotoGrande} ${fotoLlena ? styles.fotoLlena : ''}`} style={fotoLlena ? undefined : { backgroundImage: `url(${FONDOS[0]})` }}>
            <Foto src={d.historiaImagen} etiqueta={d.historiaFotoEtiqueta} />
          </div>
        )}
        <div data-bloque>
          <p className={styles.kicker}>Nosotros</p>
          <h2 className={styles.titulo} id="o-hist"><Txt t={d.historiaTitulo} /></h2>
          <p className={styles.txt}><Txt t={d.historia} /></p>
          <div className={styles.datos}>
            {d.datos.map((x, k) => (
              <div key={k} className={styles.dato} {...editable('datos', x, k)}>
                <b><Txt t={x.valor} /></b>
                <span><Txt t={x.etiqueta} /></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function Contacto({ d, fondo = 'resplandor', enPagina }: PropsSeccion) {
  const bloques: { icono: 'ubicacion' | 'telefono' | 'redes'; titulo: string; lineas: ReactNode[] }[] = [
    { icono: 'ubicacion', titulo: 'Dónde estamos', lineas: [<Txt t={d.direccion} />, <Txt t={d.horario} />] },
    { icono: 'telefono', titulo: 'Escríbenos o llámanos', lineas: [<Txt t={d.telefono} />, <Txt t={d.whatsapp} />, <Txt t={d.correo} />] },
    { icono: 'redes', titulo: 'Redes', lineas: d.redes.map((r, k) => <span {...editable('redes', r, k)}><b>{r.red}</b> · <Txt t={r.usuario} /></span>) },
  ]
  return (
    <section id="contacto" className={`${fondo} ${styles.sec} ${enPagina ? styles.enPagina : ''}`} aria-labelledby="o-cont">
      <div className={styles.contenido} style={{ viewTransitionName: 'orbita-contacto' }}>
        <header data-bloque className={styles.cab}>
          <p className={styles.kicker}>Contacto</p>
          <h2 className={styles.titulo} id="o-cont"><Txt t={d.cta} /></h2>
        </header>
        <div className={styles.contacto}>
          {bloques.map((b) => (
            <article data-bloque key={b.titulo} className={styles.bloque}>
              <span className={styles.ico}><Icono n={b.icono} /></span>
              <h3>{b.titulo}</h3>
              {b.lineas.map((l, k) => <p key={k}>{l}</p>)}
            </article>
          ))}
        </div>
        <div data-bloque className={styles.accion}><Boton d={d} className={styles.btn} /></div>
      </div>
    </section>
  )
}

export function Pie({ d }: { d: DatosPlantilla }) {
  return (
    <footer className={styles.pie}>
      <span><Txt t={d.nombre} /></span>
      <span>© {new Date().getFullYear()} · Hecho con Tarsen Dev</span>
    </footer>
  )
}

interface SitioProps {
  d: DatosPlantilla
  portada: ReactNode // contenido de la pestaña Inicio
  fondoSecciones?: string // clase de fondo de Servicios/Nosotros/Contacto ('' = transparente)
  capaFondo?: ReactNode // fondo fijo detrás de todo el sitio
  className?: string
}

/* Esqueleto de un sitio de plantilla: tema, color del negocio, barra con pestañas y transiciones. */
export function SitioPlantilla({ d, portada, fondoSecciones = 'resplandor', capaFondo, className = '' }: SitioProps) {
  const { activa, mostrada } = usePestanas(IDS)
  return (
    <div className={`tema-panel ${styles.raiz} ${className}`} style={{ '--acento': d.acento } as CSSProperties}>
      {capaFondo}
      <BarraSitio
        inicio="#inicio"
        logo={d.logo || undefined}
        nombre={d.nombre}
        pestanas={PESTANAS}
        activa={activa}
        accion={esWeb(d.waHref) ? <a className={barra.btn} href={d.waHref} target="_blank" rel="noreferrer">Escríbenos</a> : <a className={barra.btn} href="#contacto">Escríbenos</a>}
      />
      <main className={styles.principal}>
        {mostrada === 'inicio' && portada}
        {mostrada === 'servicios' && <><Servicios d={d} fondo={fondoSecciones} /><Pie d={d} /></>}
        {mostrada === 'nosotros' && <><Nosotros d={d} fondo={fondoSecciones} /><Pie d={d} /></>}
        {mostrada === 'contacto' && <><Contacto d={d} fondo={fondoSecciones} /><Pie d={d} /></>}
      </main>
    </div>
  )
}
