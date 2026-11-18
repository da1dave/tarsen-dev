import { Link } from 'react-router-dom'
import type { PlantillaCatalogo } from '../../templates/catalogo'
import styles from './TarjetaPlantilla.module.css'

export default function TarjetaPlantilla({ p }: { p: PlantillaCatalogo }) {
  const cuerpo = (
    <>
      <div className={styles.foto} style={{ backgroundImage: `url(${p.fondo})` }}>
        {p.imagen && <img src={p.imagen} alt="" />}
        {!p.disponible && <span className={styles.etiqueta}>Próximamente</span>}
      </div>
      <div className={styles.info}>
        <strong>{p.nombre}</strong>
        <span>{p.categoria}</span>
        {p.disponible && <span className={styles.cta}>Usar plantilla →</span>}
      </div>
    </>
  )
  return p.disponible ? (
    <Link to={`/app/plantillas/${p.id}`} className={styles.tarjeta}>{cuerpo}</Link>
  ) : (
    <div className={`${styles.tarjeta} ${styles.apagada}`} aria-disabled="true">{cuerpo}</div>
  )
}
