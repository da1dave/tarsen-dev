import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { supabaseConfigurado } from '../lib/supabase'
import Navbar from '../components/Navbar/Navbar'
import styles from './Auth.module.css'

export default function Registro() {
  const { registrarse } = useAuth()
  const navegar = useNavigate()
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmar, setConfirmar] = useState('')

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const nombre = String(f.get('nombre')).trim()
    const correo = String(f.get('correo')).trim()
    const clave = String(f.get('clave'))
    if (!nombre || !correo) { setError('Completa tu nombre y tu correo.'); return }
    if (clave.length < 8) { setError('La contraseña debe tener mínimo 8 caracteres.'); return }
    if (clave !== String(f.get('clave2'))) { setError('Las contraseñas no coinciden.'); return }
    setEnviando(true)
    setError('')
    const r = await registrarse(nombre, correo, clave)
    setEnviando(false)
    if (r.error) { setError(r.error); return }
    if (r.confirmar) { setConfirmar(correo); return }
    navegar('/app')
  }

  return (
    <>
      <Navbar activa="inicio" />
      <main className={styles.pagina}>
        <form className={styles.tarjeta} onSubmit={enviar} noValidate>
          <h1 className="titular">crear cuenta</h1>
          <p className={styles.sub}>Regístrate para ver las plantillas base.</p>
          <label className={styles.campo}>Nombre<input name="nombre" autoComplete="name" required /></label>
          <label className={styles.campo}>Correo<input name="correo" type="email" autoComplete="email" required /></label>
          <label className={styles.campo}>Contraseña<input name="clave" type="password" autoComplete="new-password" required /></label>
          <label className={styles.campo}>Repite la contraseña<input name="clave2" type="password" autoComplete="new-password" required /></label>
          {!supabaseConfigurado && <p className={styles.error} role="alert">Falta conectar Supabase: crea el archivo .env.local (ver .env.example).</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          {confirmar && <p className={styles.sub} role="status">Te enviamos un enlace a {confirmar}. Ábrelo para confirmar tu cuenta y luego inicia sesión.</p>}
          <button className={styles.btn} type="submit" disabled={enviando}>{enviando ? 'Creando…' : 'Crear cuenta'}</button>
          <p className={styles.alt}>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
        </form>
      </main>
    </>
  )
}
