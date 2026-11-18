import styles from './About.module.css'

const DATOS = [
  { valor: '3', etiqueta: 'plantillas: 1 lista y 2 en camino' },
  { valor: '3', etiqueta: 'personas en el equipo' },
  { valor: '100%', etiqueta: 'pensado para negocios pequeños' },
]

export default function About() {
  return (
    <section className={`tema-panel resplandor ${styles.sec}`} aria-labelledby="h-historia">
      <div className={styles.grid}>
        <div className={styles.foto} style={{ backgroundImage: 'url(/img/espacio_1.jpg)' }}>
          <img src="/img/logo_tarsen_oscuro.png" alt="Mascota de Tarsen Dev flotando en el espacio" />
        </div>
        <div>
          <p className={styles.kicker}>Quiénes somos</p>
          <h2 className={styles.titulo} id="h-historia">Hecho por Innovadores UL</h2>
          <p className={styles.txt}>
            Somos tres estudiantes de la Universidad Libre. Tarsen Dev nace para que los negocios pequeños
            tengan su propia página sin pagar un desarrollo a la medida.
          </p>
          <div className={styles.datos}>
            {DATOS.map((d) => (
              <div className={styles.dato} key={d.etiqueta}>
                <div className={styles.valor}>{d.valor}</div>
                <div className={styles.etiqueta}>{d.etiqueta}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
