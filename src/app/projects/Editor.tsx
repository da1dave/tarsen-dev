import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cargarMensajes, enviarMensaje, type MensajeChat, type Pregunta } from '../../lib/ia'
import { guardarProyecto, leerProyecto, type Proyecto } from '../../lib/proyectos'
import type { DatosPlantilla } from '../../templates/tipos'
import * as ed from './edicion'
import { PLANTILLAS } from '../../templates/registro'
import FormularioIA from './FormularioIA'
import { CampoDictado } from './dictado'
import styles from './Editor.module.css'

/** Primeras preguntas, antes de que nuestra IA conozca el negocio. */
const PRIMER_FORMULARIO: Pregunta[] = [
  {
    pregunta: '¿Qué tipo de negocio tienes?',
    tipo: 'opciones',
    opciones: ['Cafetería o restaurante', 'Belleza y uñas', 'Tienda de ropa', 'Salud y bienestar', 'Servicios profesionales', 'Tienda en línea'],
  },
  {
    pregunta: '¿Cómo te contactan tus clientes?',
    tipo: 'varias',
    opciones: ['WhatsApp', 'Instagram', 'Llamada', 'Correo', 'Visitan mi local'],
  },
]

/*
 * Editor de un proyecto: chat con nuestra IA a la izquierda y la landing en vivo a la derecha.
 * La vista previa es un iframe (/vista/proyecto/:id) que recibe los datos por postMessage,
 * así cada cambio se ve al instante sin recargar.
 */
export default function Editor() {
  const { id = '' } = useParams()
  const [proyecto, setProyecto] = useState<Proyecto | null | undefined>(undefined)
  const [nombre, setNombre] = useState('')
  const [guardado, setGuardado] = useState<'listo' | 'guardando' | 'error'>('listo')
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [borrador, setBorrador] = useState('')
  const [pensando, setPensando] = useState(false)
  const [modoChat, setModoChat] = useState(false)
  const [anteriores, setAnteriores] = useState(0)
  const [editando, setEditando] = useState<number | null>(null)
  const [textoEdicion, setTextoEdicion] = useState('')
  const [errorChat, setErrorChat] = useState('')
  const [edicion, setEdicion] = useState(false)
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [formulario, setFormulario] = useState<Record<string, string>>({})
  const [aviso, setAviso] = useState('')
  const marco = useRef<HTMLIFrameElement>(null)
  const lista = useRef<HTMLDivElement>(null)

  useEffect(() => {
    leerProyecto(id)
      .then((p) => { setProyecto(p); setNombre(p?.nombre ?? '') })
      .catch(() => setProyecto(null))
    cargarMensajes(id).then((m) => { setMensajes(m); setAnteriores(m.length) }).catch(() => setMensajes([]))
  }, [id])

  // Baja al último mensaje.
  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' })
  }, [mensajes, pensando])

  // Envía los datos actuales a la vista previa.
  const enviarVista = useCallback(() => {
    if (!proyecto) return
    marco.current?.contentWindow?.postMessage({ tipo: 'tarsen:datos', datos: proyecto.datos }, window.location.origin)
    marco.current?.contentWindow?.postMessage({ tipo: 'tarsen:modo', edicion }, window.location.origin)
  }, [proyecto, edicion])

  // La vista previa avisa cuando está lista para recibir datos.
  useEffect(() => {
    const oir = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== marco.current?.contentWindow) return
      if (e.data?.tipo === 'tarsen:lista') enviarVista()
      if (e.data?.tipo === 'tarsen:accion') accionar(e.data.accion, String(e.data.destino))
    }
    window.addEventListener('message', oir)
    return () => window.removeEventListener('message', oir)
  }, [enviarVista]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(enviarVista, [enviarVista])

  const cambioNombre = !!proyecto && nombre.trim() !== proyecto.nombre && !!nombre.trim()

  const guardarNombre = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!proyecto || !cambioNombre) return
    setGuardado('guardando')
    try {
      await guardarProyecto(proyecto.id, { nombre: nombre.trim() })
      setProyecto({ ...proyecto, nombre: nombre.trim() })
      setGuardado('listo')
    } catch {
      setGuardado('error')
    }
  }

  // ---------- Edición detallada (sin IA) ----------
  const guardarDatos = async (nuevos: DatosPlantilla, mensaje: string) => {
    if (!proyecto) return
    setProyecto({ ...proyecto, datos: nuevos })
    try {
      await guardarProyecto(proyecto.id, { datos: nuevos })
      setAviso(mensaje)
    } catch {
      setAviso('No se pudo guardar el cambio. Revisa tu conexión.')
    }
  }

  function accionar(accion: string, destino: string) {
    if (!proyecto) return
    const d = proyecto.datos
    const partes = ed.separar(destino)
    const nombre = partes ? `${ed.NOMBRE_LISTA[partes.lista]} ${partes.i + 1}` : 'Foto de Nosotros'
    if (accion === 'editar' && partes) {
      const item = d[partes.lista][partes.i] as unknown as Record<string, string>
      setSeleccion(destino)
      setFormulario(Object.fromEntries(ed.CAMPOS[partes.lista].map((c) => [c.clave, item[c.clave] ?? ''])))
    } else if (accion === 'duplicar' && partes) {
      if (!ed.puedeDuplicar(d, partes.lista)) { setAviso(`Llegaste al máximo de elementos de este tipo.`); return }
      guardarDatos(ed.duplicar(d, destino), `${nombre} duplicado.`)
    } else if (accion === 'quitarFoto') {
      guardarDatos(ed.cambiarFoto(d, destino, false), `Foto quitada. Puedes recuperarla en "Ocultos".`)
    } else if (accion === 'borrar' && partes) {
      if (!ed.puedeBorrar(d, partes.lista)) { setAviso('Debe quedar al menos un elemento de este tipo.'); return }
      if (!window.confirm(`¿Borrar ${nombre.toLowerCase()}? Esta acción no se puede deshacer.`)) return
      setSeleccion(null)
      guardarDatos(ed.borrar(d, destino), `${nombre} borrado.`)
    }
  }

  const guardarFormulario = (e: FormEvent) => {
    e.preventDefault()
    if (!proyecto || !seleccion) return
    guardarDatos(ed.actualizar(proyecto.datos, seleccion, formulario), 'Cambios guardados.')
    setSeleccion(null)
  }

  /** Envía un mensaje a nuestra IA. Con `editarDesde`, reemplaza ese mensaje y borra los siguientes. */
  const enviar = async (texto: string, editarDesde?: number) => {
    const mensaje = texto.trim()
    if (!proyecto || !mensaje || pensando) return
    const antes = mensajes
    const corte = editarDesde === undefined ? mensajes.length : mensajes.findIndex((m) => m.id === editarDesde)
    if (corte < 0) return
    const base = mensajes.slice(0, corte)
    setErrorChat('')
    if (editarDesde === undefined) setBorrador('')
    setEditando(null)
    setMensajes([...base, { id: `local-${Date.now()}`, rol: 'usuario', texto: mensaje }])
    setPensando(true)
    try {
      const r = await enviarMensaje(proyecto.id, mensaje, editarDesde)
      setMensajes([
        ...base,
        { id: r.ids?.usuario ?? `local-${Date.now()}`, rol: 'usuario', texto: mensaje },
        { id: r.ids?.asistente ?? `ia-${Date.now()}`, rol: 'asistente', texto: r.respuesta, cambios: r.cambios, formulario: r.formulario },
      ])
      setAnteriores((n) => Math.min(n, corte))
      setModoChat(false)
      setProyecto((p) => (p ? { ...p, datos: r.datos, mensajes_usados: p.mensajes_usados + 1 } : p))
    } catch (err) {
      setErrorChat(err instanceof Error ? err.message : 'Nuestra IA no pudo responder.')
      setMensajes(antes)
      if (editarDesde === undefined) {
        setBorrador(mensaje)
        setModoChat(true) // el texto vuelve al campo del chat para reintentar
      } else {
        setEditando(editarDesde)
        setTextoEdicion(mensaje)
      }
    } finally {
      setPensando(false)
    }
  }

  const empezarEdicion = (m: MensajeChat) => {
    if (typeof m.id !== 'number' || pensando) return
    setEditando(m.id)
    setTextoEdicion(m.texto)
  }

  if (proyecto === undefined) return <div className={styles.cargando}>Cargando proyecto…</div>
  if (proyecto === null) {
    return (
      <div className={styles.cargando}>
        <p>No encontramos este proyecto.</p>
        <Link to="/app/proyectos">← Mis proyectos</Link>
      </div>
    )
  }

  const plantilla = PLANTILLAS[proyecto.plantilla]
  // El formulario vigente es el de la última respuesta de la IA (o el inicial si aún no hay conversación).
  const ultimo = mensajes[mensajes.length - 1]
  const preguntas = mensajes.length === 0 ? PRIMER_FORMULARIO : ultimo?.rol === 'asistente' ? ultimo.formulario ?? null : null
  const conOpciones = !!preguntas?.length && !modoChat
  const sinMensajes = proyecto.mensajes_usados >= 40
  const ultimoUsuario = [...mensajes].reverse().find((m) => m.rol === 'usuario')
  const vista = `/vista/proyecto/${proyecto.id}`

  return (
    <div className={styles.editor}>
      <header className={styles.barra}>
        <Link to="/app/proyectos" className={styles.volver}>← Mis proyectos</Link>
        <form className={styles.campoNombre} onSubmit={guardarNombre}>
          <label htmlFor="nombre-proyecto">Nombre del proyecto</label>
          <div>
            <input
              id="nombre-proyecto"
              className={styles.nombre}
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setGuardado('listo') }}
              maxLength={80}
            />
            <button type="submit" className={styles.guardar} disabled={!cambioNombre || guardado === 'guardando'}>
              {guardado === 'guardando' ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
        <span className={styles.guardado} role="status">
          {guardado === 'error' ? 'No se pudo guardar' : cambioNombre ? 'Sin guardar' : ''}
        </span>
        <button
          type="button"
          className={`${styles.modo} ${edicion ? styles.modoActivo : ''}`}
          aria-pressed={edicion}
          onClick={() => { setEdicion((v) => !v); setSeleccion(null); setAviso('') }}
        >
          {edicion ? '✓ Edición detallada' : '✎ Edición detallada'}
        </button>
        <span className={styles.plantilla}>Plantilla {plantilla?.nombre ?? proyecto.plantilla}</span>
        <a className={styles.abrir} href={vista} target="_blank" rel="noreferrer">Abrir vista ↗</a>
      </header>

      <div className={styles.cuerpo}>
        {edicion ? (
          <aside className={styles.chat} aria-label="Edición detallada">
            <div className={styles.panel}>
              {seleccion && ed.separar(seleccion) ? (
                <form className={styles.formulario} onSubmit={guardarFormulario}>
                  <h2>Editar {ed.NOMBRE_LISTA[ed.separar(seleccion)!.lista].toLowerCase()} {ed.separar(seleccion)!.i + 1}</h2>
                  {ed.CAMPOS[ed.separar(seleccion)!.lista].map((c) => (
                    <label key={c.clave}>
                      {c.etiqueta}
                      {c.largo ? (
                        <textarea rows={4} value={formulario[c.clave] ?? ''} maxLength={600} onChange={(e) => setFormulario({ ...formulario, [c.clave]: e.target.value })} />
                      ) : (
                        <input value={formulario[c.clave] ?? ''} maxLength={120} onChange={(e) => setFormulario({ ...formulario, [c.clave]: e.target.value })} />
                      )}
                    </label>
                  ))}
                  <div className={styles.botones}>
                    <button type="submit" className={styles.guardar}>Guardar</button>
                    <button type="button" className={styles.secundario} onClick={() => setSeleccion(null)}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <>
                  <h2>Edición detallada</h2>
                  <p>Pasa el mouse sobre cualquier elemento de tu página y usa sus botones para <b>editar</b>, <b>duplicar</b>, <b>quitar la foto</b> o <b>borrar</b>. Los cambios se guardan solos.</p>
                  <h3>Ocultos</h3>
                  {ed.ocultos(proyecto.datos).length ? (
                    <ul className={styles.ocultos}>
                      {ed.ocultos(proyecto.datos).map((o) => (
                        <li key={o.destino + o.tipo}>
                          <span>{o.texto}</span>
                          <button type="button" onClick={() => guardarDatos(o.tipo === 'foto' ? ed.cambiarFoto(proyecto.datos, o.destino, true) : ed.mostrar(proyecto.datos, o.destino), `${o.texto} vuelve a mostrarse.`)}>Mostrar</button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className={styles.nota}>No hay elementos ocultos.</p>}
                </>
              )}
              {aviso && <p className={styles.aviso} role="status">{aviso}</p>}
            </div>
            <button type="button" className={styles.volverChat} onClick={() => { setEdicion(false); setSeleccion(null) }}>← Volver al chat con Tarsen</button>
          </aside>
        ) : (
        <aside className={styles.chat} aria-label="Chat con nuestra IA">
          <div className={styles.mensajes} ref={lista} aria-live="polite">
            <div className={styles.burbujaIA}>
              ¡Hola! Soy Tarsen. Responde mis preguntas (o escríbeme) y lleno tu página por ti.
              Mira a la derecha cómo va quedando.
              {mensajes.length === 0 && (
                <FormularioIA key="inicio" preguntas={PRIMER_FORMULARIO} activo={!pensando} deshabilitado={sinMensajes} enviar={(t) => enviar(t)} chatear={() => setModoChat(true)} />
              )}
            </div>
            {anteriores > 0 && (
              <p className={styles.separador}>Conversación guardada · {anteriores === 1 ? '1 mensaje' : `${anteriores} mensajes`}</p>
            )}
            {mensajes.map((m) => m.rol === 'usuario' ? (
              editando === m.id ? (
                <form
                  key={m.id}
                  className={styles.edicionMensaje}
                  onSubmit={(e) => { e.preventDefault(); enviar(textoEdicion, m.id as number) }}
                >
                  <textarea
                    value={textoEdicion}
                    onChange={(e) => setTextoEdicion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(textoEdicion, m.id as number) }
                      if (e.key === 'Escape') setEditando(null)
                    }}
                    rows={Math.min(6, Math.max(2, textoEdicion.split('\n').length))}
                    maxLength={1000}
                    aria-label="Editar mensaje"
                    autoFocus
                  />
                  {m !== ultimoUsuario && <p>Al enviarlo, Tarsen responderá de nuevo y se borrarán los mensajes que siguen.</p>}
                  <div>
                    <button type="button" className={styles.secundario} onClick={() => setEditando(null)}>Cancelar</button>
                    <button type="submit" className={styles.guardar} disabled={!textoEdicion.trim() || textoEdicion.trim() === m.texto}>Enviar</button>
                  </div>
                </form>
              ) : (
                <div key={m.id} className={styles.filaYo}>
                  {typeof m.id === 'number' && !pensando && (
                    <button type="button" className={styles.editarMensaje} onClick={() => empezarEdicion(m)} aria-label="Editar mensaje" title="Editar mensaje">
                      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25Zm15.71-9.04a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 2-1.66Z" /></svg>
                    </button>
                  )}
                  <div className={styles.burbujaYo}>{m.texto}</div>
                </div>
              )
            ) : (
              <div key={m.id} className={styles.burbujaIA}>
                {m.texto}
                {!!m.cambios?.length && (
                  <span className={styles.cambios}>✓ {m.cambios.length === 1 ? '1 cambio' : `${m.cambios.length} cambios`} en tu página</span>
                )}
                {!!m.formulario?.length && (
                  <FormularioIA
                    key={m.id}
                    preguntas={m.formulario}
                    activo={m === ultimo && !pensando && editando === null}
                    deshabilitado={sinMensajes}
                    enviar={(t) => enviar(t)}
                    chatear={() => setModoChat(true)}
                  />
                )}
              </div>
            ))}
            {pensando && <div className={`${styles.burbujaIA} ${styles.escribiendo}`} aria-label="Tarsen está escribiendo"><i /><i /><i /></div>}
          </div>
          {errorChat && <p className={styles.errorChat} role="alert">{errorChat}</p>}
          {conOpciones ? (
            <div className={styles.pista}>
              <span>Elige una opción arriba</span>
              <button type="button" onClick={() => setModoChat(true)} disabled={pensando}>o escribe un mensaje</button>
            </div>
          ) : (
            <form className={styles.entrada} onSubmit={(e) => { e.preventDefault(); enviar(borrador) }}>
              {!!preguntas?.length && (
                <button type="button" className={styles.volverOpciones} onClick={() => setModoChat(false)} disabled={pensando}>
                  ← Volver a las opciones
                </button>
              )}
              <div className={styles.fila}>
                <CampoDictado
                  valor={borrador}
                  cambiar={setBorrador}
                  placeholder="Escribe o dicta tu mensaje a Tarsen…"
                  aria-label="Mensaje para Tarsen"
                  maxLength={1000}
                  disabled={pensando}
                  autoFocus={modoChat}
                />
                <button type="submit" disabled={pensando || !borrador.trim()}>Enviar</button>
              </div>
            </form>
          )}
          <p className={styles.restantes}>{Math.max(0, 40 - proyecto.mensajes_usados)} mensajes disponibles en este proyecto</p>
        </aside>
        )}
        <iframe ref={marco} src={vista} title={`Vista previa de ${proyecto.nombre}`} className={styles.vista} />
      </div>
    </div>
  )
}
