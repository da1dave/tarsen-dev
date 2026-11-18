import { WHATSAPP } from '../Hero/slides'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={`tema-panel ${styles.pie}`} aria-label="Contacto">
      <div className={styles.col}>
        <h2>Teléfono / WhatsApp</h2>
        <a href="tel:+573000000000">+57 300 000 0000</a>
        <a href={WHATSAPP} target="_blank" rel="noreferrer">Escríbenos por WhatsApp</a>
      </div>
      <div className={styles.col}>
        <h2>Correo</h2>
        <a href="mailto:hola@tarsen.example">hola@tarsen.example</a>
      </div>
      <div className={styles.col}>
        <h2>Redes</h2>
        <span>Instagram · @tarsen.dev</span>
        <span>TikTok · @tarsen.dev</span>
      </div>
      <div className={`${styles.col} ${styles.accion}`}>
        <a className={styles.btn} href={WHATSAPP} target="_blank" rel="noreferrer">Contáctanos</a>
        <small>Datos de ejemplo. © 2026 Tarsen Dev · Innovadores UL</small>
      </div>
    </footer>
  )
}
