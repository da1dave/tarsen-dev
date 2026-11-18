import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthError, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/*
 * Sesión real con Supabase Auth (correo y contraseña).
 * La sesión se guarda en el navegador y se renueva sola; `cargando` es true mientras se lee al iniciar.
 */
export interface Usuario {
  id: string
  nombre: string
  correo: string
  /** URL de la foto de perfil ('' = sin foto: se muestra la inicial) */
  avatar: string
  creado: string
}

interface AuthValor {
  usuario: Usuario | null
  cargando: boolean
  iniciarSesion: (correo: string, clave: string) => Promise<string | null> // devuelve el error o null
  registrarse: (nombre: string, correo: string, clave: string) => Promise<{ error: string | null; confirmar: boolean }>
  salir: () => Promise<void>
  /** Cambia el nombre y/o la foto (se guardan en los metadatos del usuario). Devuelve el error o null. */
  actualizarPerfil: (cambios: { nombre?: string; avatar?: string }) => Promise<string | null>
  cambiarClave: (nueva: string) => Promise<string | null>
}

const Ctx = createContext<AuthValor | null>(null)

const aUsuario = (u: User | null | undefined): Usuario | null =>
  u ? {
    id: u.id,
    correo: u.email ?? '',
    nombre: (u.user_metadata?.nombre as string | undefined) || (u.email ?? '').split('@')[0],
    avatar: (u.user_metadata?.avatar as string | undefined) ?? '',
    creado: u.created_at,
  } : null

// Mensajes de error de Supabase en español.
function traducir(e: AuthError): string {
  switch (e.code) {
    case 'invalid_credentials': return 'Correo o contraseña incorrectos.'
    case 'email_not_confirmed': return 'Confirma tu correo antes de entrar (revisa tu bandeja de entrada).'
    case 'user_already_exists':
    case 'email_exists': return 'Ya existe una cuenta con ese correo. Inicia sesión.'
    case 'same_password': return 'La nueva contraseña debe ser distinta de la actual.'
    case 'reauthentication_needed': return 'Por seguridad, cierra sesión, vuelve a entrar e intenta de nuevo.'
    case 'weak_password': return 'La contraseña es muy débil. Usa mínimo 8 caracteres con letras y números.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.'
    default: return 'No pudimos completar la operación. Intenta de nuevo.'
  }
}

const SIN_CONFIGURAR = 'Falta conectar Supabase (archivo .env.local).'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setUsuario(aUsuario(data.session?.user))
      setCargando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => setUsuario(aUsuario(sesion?.user)))
    return () => data.subscription.unsubscribe()
  }, [])

  const iniciarSesion: AuthValor['iniciarSesion'] = async (correo, clave) => {
    if (!supabase) return SIN_CONFIGURAR
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password: clave })
    return error ? traducir(error) : null
  }

  const registrarse: AuthValor['registrarse'] = async (nombre, correo, clave) => {
    if (!supabase) return { error: SIN_CONFIGURAR, confirmar: false }
    const { data, error } = await supabase.auth.signUp({ email: correo, password: clave, options: { data: { nombre } } })
    if (error) return { error: traducir(error), confirmar: false }
    // Si el proyecto pide confirmar el correo, no hay sesión hasta que el usuario haga clic en el enlace.
    return { error: null, confirmar: !data.session }
  }

  const salir = async () => {
    await supabase?.auth.signOut()
    setUsuario(null)
  }

  const actualizarPerfil: AuthValor['actualizarPerfil'] = async (cambios) => {
    if (!supabase) return SIN_CONFIGURAR
    const { data, error } = await supabase.auth.updateUser({ data: cambios })
    if (error) return traducir(error)
    setUsuario(aUsuario(data.user))
    return null
  }

  const cambiarClave: AuthValor['cambiarClave'] = async (nueva) => {
    if (!supabase) return SIN_CONFIGURAR
    const { error } = await supabase.auth.updateUser({ password: nueva })
    return error ? traducir(error) : null
  }

  return <Ctx.Provider value={{ usuario, cargando, iniciarSesion, registrarse, salir, actualizarPerfil, cambiarClave }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValor {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return v
}
