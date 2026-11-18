import { Link } from 'react-router-dom'
import styles from './Pagina.module.css'

export default function Pronto({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>{titulo}</h1>
      <div className={styles.sinProyectos}>
        <p>{texto}</p>
        <Link to="/app/plantillas" className={styles.btn}>Ver plantillas</Link>
      </div>
    </div>
  )
}
