import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import Avatar from '../../components/Avatar'
import { borrarFoto, subirAvatar } from '../../lib/fotos'
import { listarProyectos, type Proyecto } from '../../lib/proyectos'
import pagina from '../shared/Pagina.module.css'
import styles from './Perfil.module.css'

const LIMITE_POR_PROYECTO = 40
const fecha = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' })

/* Panel del usuario: foto y nombre, resumen de uso, contraseña, plan y cierre de sesión. */
export default function Perfil() {
  const { usuario, actualizarPerfil, cambiarClave, salir } = useAuth()
  const navegar = useNavigate()
  const selector = useRef<HTMLInputElement>(null)
  const [proyectos, setProyectos] = useState<Proyecto[] | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [avisoFoto, setAvisoFoto] = useState('')
  const [nombre, setNombre] = useState(usuario?.nombre ?? '')
  const [avisoNombre, setAvisoNombre] = useState('')
  const [clave, setClave] = useState('')
  const [repetir, setRepetir] = useState('')
  const [avisoClave, setAvisoClave] = useState<{ ok: boolean; texto: string } | null>(null)
  const [guardando, setGuardando] = useState<'' | 'nombre' | 'clave'>('')

  useEffect(() => { listarProyectos().then(setProyectos).catch(() => setProyectos([])) }, [])
  useEffect(() => { if (usuario) setNombre(usuario.nombre) }, [usuario?.nombre]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!usuario) return null

  const cambiarFoto = async (archivo: File) => {
    setSubiendo(true)
    setAvisoFoto('')
    try {
      const anterior = usuario.avatar
      const foto = await subirAvatar(archivo)
      const error = await actualizarPerfil({ avatar: foto.url })
      if (error) throw new Error(error)
      if (anterior) borrarFoto(anterior)
      setAvisoFoto('Foto actualizada.')
    } catch (e) {
      setAvisoFoto(e instanceof Error ? e.message : 'No pudimos cambiar tu foto.')
    } finally {
      setSubiendo(false)
    }
  }

  const quitarFoto = async () => {
    const anterior = usuario.avatar
    const error = await actualizarPerfil({ avatar: '' })
    if (error) { setAvisoFoto(error); return }
    borrarFoto(anterior)
    setAvisoFoto('Quitaste tu foto.')
  }

  const guardarNombre = async (e: FormEvent) => {
    e.preventDefault()
    const limpio = nombre.trim()
    if (!limpio || limpio === usuario.nombre) return
    setGuardando('nombre')
    const error = await actualizarPerfil({ nombre: limpio.slice(0, 60) })
    setAvisoNombre(error ?? 'Nombre guardado.')
    setGuardando('')
  }

  const guardarClave = async (e: FormEvent) => {
    e.preventDefault()
    if (clave.length < 8) { setAvisoClave({ ok: false, texto: 'Usa mínimo 8 caracteres.' }); return }
    if (clave !== repetir) { setAvisoClave({ ok: false, texto: 'Las contraseñas no coinciden.' }); return }
    setGuardando('clave')
    const error = await cambiarClave(clave)
    setGuardando('')
    if (error) { setAvisoClave({ ok: false, texto: error }); return }
    setClave('')
    setRepetir('')
    setAvisoClave({ ok: true, texto: 'Contraseña cambiada.' })
  }

  const publicados = proyectos?.filter((p) => p.estado === 'publicado').length ?? 0
  const mensajes = proyectos?.reduce((t, p) => t + p.mensajes_usados, 0) ?? 0
  const cifra = (n: number) => (proyectos ? n : '…')

  return (
    <div className={pagina.pagina}>
      <h1 className={pagina.titulo}>Tu perfil</h1>

      {/* Foto y nombre */}
      <section className={`${styles.tarjeta} ${styles.cabecera}`} aria-label="Foto de perfil">
        <button type="button" className={styles.foto} onClick={() => selector.current?.click()} disabled={subiendo} aria-label="Cambiar foto de perfil">
          <Avatar nombre={usuario.nombre} src={usuario.avatar} tam={104} />
          <span className={styles.fotoCapa}>{subiendo ? 'Subiendo…' : 'Cambiar'}</span>
        </button>
        <input
          ref={selector}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => { const a = e.target.files?.[0]; e.target.value = ''; if (a) cambiarFoto(a) }}
        />
        <div className={styles.quien}>
          <h2>{usuario.nombre}</h2>
          <p>{usuario.correo}</p>
          {usuario.creado && <p className={styles.suave}>En Tarsen desde el {fecha.format(new Date(usuario.creado))}</p>}
          <div className={styles.botones}>
            <button type="button" className={styles.secundario} onClick={() => selector.current?.click()} disabled={subiendo}>
              {usuario.avatar ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {usuario.avatar && <button type="button" className={styles.texto} onClick={quitarFoto} disabled={subiendo}>Quitar foto</button>}
          </div>
          {avisoFoto && <p className={styles.aviso} role="status">{avisoFoto}</p>}
        </div>
      </section>

      {/* Resumen */}
      <section aria-label="Tu actividad" className={styles.cifras}>
        <div className={styles.tarjeta}><strong>{cifra(proyectos?.length ?? 0)}</strong><span>Proyectos</span></div>
        <div className={styles.tarjeta}><strong>{cifra(publicados)}</strong><span>Páginas publicadas</span></div>
        <div className={styles.tarjeta}><strong>{cifra(mensajes)}</strong><span>Mensajes con nuestra IA</span></div>
      </section>

      <div className={styles.columnas}>
        {/* Datos */}
        <form className={styles.tarjeta} onSubmit={guardarNombre}>
          <h2>Tus datos</h2>
          <label className={styles.campo}>
            Nombre
            <input value={nombre} onChange={(e) => { setNombre(e.target.value); setAvisoNombre('') }} maxLength={60} autoComplete="name" />
          </label>
          <label className={styles.campo}>
            Correo
            <input value={usuario.correo} readOnly aria-describedby="nota-correo" />
            <small id="nota-correo">Es el correo con el que inicias sesión.</small>
          </label>
          <div className={styles.pieForm}>
            {avisoNombre && <p className={styles.aviso} role="status">{avisoNombre}</p>}
            <button type="submit" className={styles.principal} disabled={guardando === 'nombre' || !nombre.trim() || nombre.trim() === usuario.nombre}>
              {guardando === 'nombre' ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>

        {/* Contraseña */}
        <form className={styles.tarjeta} onSubmit={guardarClave}>
          <h2>Contraseña</h2>
          <label className={styles.campo}>
            Nueva contraseña
            <input type="password" value={clave} onChange={(e) => { setClave(e.target.value); setAvisoClave(null) }} autoComplete="new-password" minLength={8} />
          </label>
          <label className={styles.campo}>
            Repite la contraseña
            <input type="password" value={repetir} onChange={(e) => { setRepetir(e.target.value); setAvisoClave(null) }} autoComplete="new-password" />
          </label>
          <div className={styles.pieForm}>
            {avisoClave && <p className={avisoClave.ok ? styles.aviso : styles.error} role="status">{avisoClave.texto}</p>}
            <button type="submit" className={styles.principal} disabled={guardando === 'clave' || !clave || !repetir}>
              {guardando === 'clave' ? 'Cambiando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>

      {/* Plan */}
      <section className={`${styles.tarjeta} ${styles.plan}`} aria-labelledby="h-plan">
        <div>
          <span className={styles.etiqueta}>Tu plan</span>
          <h2 id="h-plan">Gratis</h2>
          <p className={styles.suave}>
            Proyectos ilimitados, {LIMITE_POR_PROYECTO} mensajes con nuestra IA por proyecto y publicación en una dirección de Tarsen.
            Pronto: planes con más mensajes y dominio propio.
          </p>
        </div>
      </section>

      <div>
        <button type="button" className={styles.salir} onClick={async () => { await salir(); navegar('/') }}>Cerrar sesión</button>
      </div>
    </div>
  )
}
