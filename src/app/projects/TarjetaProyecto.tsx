import { Link } from 'react-router-dom'
import { CATALOGO } from '../../templates/catalogo'
import { PLANTILLAS } from '../../templates/registro'
import { urlPublica, type Proyecto } from '../../lib/proyectos'
import styles from './Proyectos.module.css'

const relativa = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

/** "hace 5 minutos", "ayer", "hace 3 días"… */
export function haceCuanto(fecha: string) {
  const seg = (new Date(fecha).getTime() - Date.now()) / 1000
  const pasos: [Intl.RelativeTimeFormatUnit, number][] = [['second', 60], ['minute', 60], ['hour', 24], ['day', 30], ['month', 12], ['year', Infinity]]
  let v = seg
  for (const [unidad, tope] of pasos) {
    if (Math.abs(v) < tope) return relativa.format(Math.round(v), unidad)
    v /= tope
  }
  return ''
}

export default function TarjetaProyecto({ p, onBorrar }: { p: Proyecto; onBorrar?: (p: Proyecto) => void }) {
  const fondo = CATALOGO.find((c) => c.id === p.plantilla)?.fondo
  return (
    <article className={styles.tarjeta}>
      <Link to={`/app/proyectos/${p.id}`} className={styles.enlace}>
        <div className={styles.miniatura} style={fondo ? { backgroundImage: `url(${fondo})` } : undefined}>
          <span className={`${styles.estado} ${p.estado === 'publicado' ? styles.publicado : ''}`}>
            {p.estado === 'publicado' ? 'Publicado' : 'Borrador'}
          </span>
        </div>
        <div className={styles.info}>
          <strong>{p.nombre}</strong>
          <span>Plantilla {PLANTILLAS[p.plantilla]?.nombre ?? p.plantilla} · editado {haceCuanto(p.actualizado)}</span>
        </div>
      </Link>
      {p.estado === 'publicado' && p.slug && (
        <a className={styles.verPagina} href={urlPublica(p.slug)} target="_blank" rel="noreferrer">Ver página publicada ↗</a>
      )}
      {onBorrar && (
        <button type="button" className={styles.borrar} onClick={() => onBorrar(p)} aria-label={`Borrar ${p.nombre}`}>Borrar</button>
      )}
    </article>
  )
}
