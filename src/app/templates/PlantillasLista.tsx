import { CATALOGO } from '../../templates/catalogo'
import TarjetaPlantilla from './TarjetaPlantilla'
import styles from '../shared/Pagina.module.css'

export default function PlantillasLista() {
  return (
    <div className={styles.pagina}>
      <header>
        <h1 className={styles.titulo}>Plantillas</h1>
        <p className={styles.vacio} style={{ marginTop: 8 }}>Cada una se ve con etiquetas «→ acá va… ←» que nuestra IA reemplazará con los datos de tu negocio.</p>
      </header>
      <div className={styles.rejilla}>
        {CATALOGO.map((p) => <TarjetaPlantilla key={p.id} p={p} />)}
      </div>
    </div>
  )
}
