import { useState } from 'react'
import { Link } from 'react-router-dom'
import Escribir from '../../components/Escribir'
import Icono, { type NombreIcono } from '../../components/Iconos'
import { WHATSAPP } from '../Hero/slides'
import styles from './Services.module.css'

const PASOS = [
  { titulo: 'Elige el diseño de tu web', texto: 'Diseños ya probados y animados. Ves cómo funcionan antes de decidir.', img: '/img/celular.png', fondo: '/img/espacio_3.jpg', alt: 'Celular con una landing de ejemplo' },
  { titulo: 'Nuestra IA potencia tu página', texto: 'Nos cuentas de tu negocio, subes tu logo y fotos, y nuestra IA llena textos, servicios y contacto.', img: '/img/logo_tarsen_oscuro.png', fondo: '/img/espacio_1.jpg', alt: 'Mascota de Tarsen Dev' },
  { titulo: 'Revisa y publica', texto: 'Ajustas lo que quieras, apruebas y la ponemos en línea con tu dominio.', img: '/img/planeta_anillos.png', fondo: '/img/espacio_2.jpg', alt: 'Planeta con anillos' },
]

const INCLUYE: { icono: NombreIcono; titulo: string; texto: string; puntos: string[]; aparte?: boolean }[] = [
  { icono: 'diseno', titulo: 'Diseño con plantillas', texto: 'Landing pages modernas, rápidas y listas para tu marca.', puntos: ['Animaciones incluidas', 'Se adapta a celular, tablet y computador', 'Botón directo a WhatsApp'] },
  { icono: 'ia', titulo: 'Contenido con nuestra IA', texto: 'Textos claros para tu negocio, escritos a partir de lo que nos cuentas.', puntos: ['Descripción de tus servicios', 'Llamados a la acción', 'Cambios cuando los pidas'] },
  { icono: 'equipo', titulo: 'Asesoría personalizada', texto: 'Una sesión con nuestro equipo de diseño y desarrollo para llevar tu página más allá de la plantilla.', puntos: ['Revisión de marca y contenido', 'Ajustes de diseño a medida'], aparte: true },
  { icono: 'nube', titulo: 'Despliegue', texto: 'Ponemos tu página en línea y la conectamos a tu dominio.', puntos: ['Subdominio de Tarsen incluido', 'Conexión de dominio propio', 'Conexión segura (HTTPS)'] },
  { icono: 'llave', titulo: 'Mantenimiento', texto: 'Tu página sigue funcionando y al día mientras tengas tu plan.', puntos: ['Actualizaciones de contenido', 'Monitoreo y respaldos', 'Soporte por WhatsApp'] },
]

export default function Services() {
  const [tituloListo, setTituloListo] = useState(false)
  return (
    <section className={`tema-panel resplandor ${styles.sec}`} aria-labelledby="h-servicios">
      <div className={styles.contenido}>
      <header className={styles.cab}>
        <p className={styles.kicker}>Qué hacemos</p>
        <Escribir etiqueta="h2" id="h-servicios" className={styles.titulo} texto="Tu página lista, sin que tengas que programar." ms={40} activo onFin={() => setTituloListo(true)} />
        <Escribir className={styles.sub} texto="Eliges una plantilla, nuestra IA la llena con la información de tu negocio y nosotros la ponemos en línea." ms={20} activo={tituloListo} ultimo />
      </header>

      <div>
        <h3 className={styles.h3}>Cómo funciona</h3>
        <ol className={styles.pasos}>
          {PASOS.map((p, k) => (
            <li className={styles.paso} key={p.titulo}>
              <div className={styles.foto} style={{ backgroundImage: `url(${p.fondo})` }}>
                <img src={p.img} alt={p.alt} />
              </div>
              <span className={styles.num}>Paso 0{k + 1}</span>
              <h4>{p.titulo}</h4>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className={styles.h3}>Qué incluye</h3>
        <div className={styles.incluye}>
          {INCLUYE.map((s) => (
            <article className={styles.servicio} key={s.titulo}>
              <span className={styles.ico}><Icono n={s.icono} /></span>
              {s.aparte && <span className={styles.etiqueta}>Se cotiza aparte</span>}
              <h4>{s.titulo}</h4>
              <p>{s.texto}</p>
              <ul className={styles.puntos}>
                {s.puntos.map((t) => <li key={t}><Icono n="check" />{t}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>

      <div className={styles.cierre}>
        <div>
          <h3>¿Listo para lanzar tu negocio?</h3>
          <p>Prueba las plantillas gratis y publica cuando estés listo.</p>
        </div>
        <div className={styles.acciones}>
          <Link to="/registro" className={styles.btn}>Empezar gratis</Link>
          <a href={WHATSAPP} target="_blank" rel="noreferrer" className={styles.btnSec}>Escríbenos</a>
        </div>
      </div>
      </div>
    </section>
  )
}
