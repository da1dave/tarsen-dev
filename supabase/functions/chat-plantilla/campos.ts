/*
 * Campos de la plantilla que nuestra IA puede cambiar, con su descripción para el modelo.
 * Textos, y además mostrar u ocultar elementos y sus fotos (valor "si" / "no"); nunca se borra contenido.
 * Fotos: solo si el usuario subió alguna; el valor es el nombre de una foto suya y se guarda su URL.
 * Los enlaces internos los maneja la app.
 * La lista se genera a partir de los datos reales del proyecto (rutas tipo "slides.0.titulo").
 */

type Datos = Record<string, unknown>

const DESCRIPCIONES: Record<string, string> = {
  nombre: 'Nombre del negocio (aparece en la barra y la portada)',
  acento: 'Color principal de la marca en formato hexadecimal, p. ej. #6c47ff',
  'slides.titulo': 'Título del destacado (máx. 6 palabras, llamativo)',
  'slides.texto': 'Frase de apoyo del destacado (máx. 20 palabras)',
  'slides.boton': 'Texto del botón del destacado (2-3 palabras)',
  serviciosIntro: 'Frase que resume lo que ofrece el negocio (máx. 25 palabras)',
  'servicios.titulo': 'Nombre del servicio o producto (máx. 6 palabras)',
  'servicios.texto': 'Descripción del servicio (máx. 25 palabras)',
  frase: 'Frase grande de la marca, título de la sección de servicios (máx. 10 palabras)',
  historiaTitulo: 'Título de la sección "Nosotros" (máx. 6 palabras)',
  historia: 'Historia del negocio: cuándo empezó, qué lo mueve y a quién atiende (máx. 60 palabras)',
  'datos.valor': 'Cifra destacada, p. ej. "10+" o "500" (solo si el usuario la dio)',
  'datos.etiqueta': 'Qué significa la cifra, p. ej. "años de experiencia"',
  direccion: 'Dirección del negocio (solo la que dé el usuario)',
  horario: 'Horario de atención (solo el que dé el usuario)',
  telefono: 'Teléfono de contacto (solo el que dé el usuario)',
  whatsapp: 'Número de WhatsApp (solo el que dé el usuario)',
  correo: 'Correo de contacto (solo el que dé el usuario)',
  'redes.red': 'Nombre de la red social, p. ej. Instagram',
  'redes.usuario': 'Usuario en esa red, p. ej. @minegocio (solo el que dé el usuario)',
  cta: 'Llamado a la acción final (máx. 10 palabras)',
  ctaBoton: 'Texto del botón de contacto (máx. 4 palabras)',
}

// Campos de visibilidad: rutas "virtuales" que la IA ve como si/no y que se guardan como banderas.
const NOMBRES: Record<string, string> = { slides: 'el destacado', servicios: 'el servicio', datos: 'la cifra', redes: 'la red social' }
const CON_FOTO = new Set(['slides', 'servicios'])

// Límite de caracteres por campo (los textos largos se recortan).
/*
 * Máximo de caracteres de cada texto, según el espacio que tiene en las plantillas.
 * Un texto más largo no se aplica: se le devuelve a la IA para que lo acorte (ver revisarTexto).
 */
const LIMITES: Record<string, number> = {
  nombre: 28,
  'slides.titulo': 38, 'slides.texto': 140, 'slides.boton': 20,
  serviciosIntro: 200, 'servicios.titulo': 40, 'servicios.texto': 200,
  frase: 70, historiaTitulo: 45, historia: 600,
  'datos.valor': 8, 'datos.etiqueta': 50,
  direccion: 120, horario: 100, telefono: 30, whatsapp: 30, correo: 60,
  'redes.red': 20, 'redes.usuario': 40,
  cta: 70, ctaBoton: 26,
}
// Plantillas donde un texto se muestra enorme y necesita ser más corto.
const LIMITES_PLANTILLA: Record<string, Record<string, number>> = {
  aurea: { 'slides.0.titulo': 26, nombre: 22 }, // portada en mayúsculas gigantes; nombre espaciado en la barra
  marea: { 'slides.titulo': 30 }, // títulos de 76 px dentro del panel de cristal
}
export function limiteTexto(campo: string, plantilla = ''): number {
  const propios = LIMITES_PLANTILLA[plantilla] ?? {}
  return propios[campo] ?? propios[generico(campo)] ?? LIMITES[generico(campo)] ?? 120
}
/** Motivo por el que un texto no cabe en su espacio, o null. */
export function revisarTexto(campo: string, valor: string, plantilla = ''): string | null {
  const max = limiteTexto(campo, plantilla)
  const largo = valor.trim().length
  return largo > max ? `tiene ${largo} caracteres y en esta plantilla caben máximo ${max}` : null
}

const generico = (ruta: string) => ruta.replace(/\.\d+\./, '.')

// Campos de foto: el valor que da la IA es el nombre de una foto subida por el usuario.
const FOTO = 'el nombre de una de las fotos subidas, o "ninguna" para quitar la foto de ahí'
export const esCampoFoto = (ruta: string) => /^(slides|servicios)\.\d+\.imagen$/.test(ruta) || ruta === 'historiaImagen' || ruta === 'logo'

/** Rutas editables presentes en los datos del proyecto, con su descripción. Con `conFotos`, también las de fotos. */
export function camposEditables(datos: Datos, conFotos = false, plantilla = ''): { ruta: string; descripcion: string }[] {
  const conLimite = (ruta: string, descripcion: string) =>
    ruta === 'acento' ? descripcion : `${descripcion} — máx. ${limiteTexto(ruta, plantilla)} caracteres`
  const lista: { ruta: string; descripcion: string }[] = []
  if (conFotos) {
    lista.push({ ruta: 'logo', descripcion: `Logo del negocio en la barra (${FOTO}; solo si es un logo)` })
    if ('historiaImagen' in datos) lista.push({ ruta: 'historiaImagen', descripcion: `Foto de la sección Nosotros (${FOTO})` })
  }
  for (const [clave, valor] of Object.entries(datos)) {
    if (Array.isArray(valor)) {
      valor.forEach((item, i) => {
        for (const sub of Object.keys(item as object)) {
          const descripcion = DESCRIPCIONES[`${clave}.${sub}`]
          if (descripcion) lista.push({ ruta: `${clave}.${i}.${sub}`, descripcion: conLimite(`${clave}.${i}.${sub}`, `${descripcion} (n.º ${i + 1})`) })
        }
        if (NOMBRES[clave]) {
          const estado = (item as { oculto?: boolean }).oculto ? 'ahora oculto' : 'ahora visible'
          lista.push({ ruta: `${clave}.${i}.mostrar`, descripcion: `"si" para mostrar o "no" para ocultar ${NOMBRES[clave]} n.º ${i + 1} (${estado})` })
        }
        if (CON_FOTO.has(clave) && conFotos) {
          lista.push({ ruta: `${clave}.${i}.imagen`, descripcion: `Foto de ${NOMBRES[clave]} n.º ${i + 1} (${FOTO})` })
        }
        if (CON_FOTO.has(clave)) {
          const estado = (item as { sinFoto?: boolean }).sinFoto ? 'ahora sin foto' : 'ahora con foto'
          lista.push({ ruta: `${clave}.${i}.mostrarFoto`, descripcion: `"si" para mostrar o "no" para quitar la foto de ${NOMBRES[clave]} n.º ${i + 1} (${estado})` })
        }
      })
    } else if (DESCRIPCIONES[clave]) {
      lista.push({ ruta: clave, descripcion: conLimite(clave, DESCRIPCIONES[clave]) })
    }
  }
  if ('historiaImagen' in datos) {
    const estado = datos.historiaSinFoto ? 'ahora sin foto' : 'ahora con foto'
    lista.push({ ruta: 'historiaMostrarFoto', descripcion: `"si" para mostrar o "no" para quitar la foto de la sección Nosotros (${estado})` })
  }
  return lista
}

/** Valor actual de una ruta. */
export function leer(datos: Datos, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), datos)
}

/**
 * Aplica los cambios propuestos por la IA sobre una copia de los datos.
 * Descarta rutas no permitidas y valores inválidos; devuelve qué se aplicó.
 */
/**
 * `fotos`: nombre → URL de las fotos del proyecto.
 * `revisarFoto`: devuelve el motivo si esa foto se vería mal en ese campo (p. ej. muy pequeña para un fondo).
 */
export function aplicarCambios(
  datos: Datos,
  cambios: { campo: unknown; valor: unknown }[],
  fotos: Record<string, string> = {},
  revisarFoto: (campo: string, nombre: string) => string | null = () => null,
  plantilla = '',
) {
  const copia = structuredClone(datos)
  const permitidas = new Set(camposEditables(datos, Object.keys(fotos).length > 0, plantilla).map((c) => c.ruta))
  const aplicados: { campo: string; valor: string }[] = []
  const rechazos: { campo: string; foto: string; motivo: string }[] = []

  for (const { campo, valor } of cambios) {
    if (typeof campo !== 'string' || typeof valor !== 'string' || !permitidas.has(campo)) continue

    // Visibilidad: "si" / "no" → banderas oculto / sinFoto (el contenido se conserva).
    if (campo.endsWith('.mostrar') || campo.endsWith('.mostrarFoto') || campo === 'historiaMostrarFoto') {
      const r = valor.trim().toLowerCase()
      if (!['si', 'sí', 'no'].includes(r)) continue
      const mostrar = r !== 'no'
      if (campo === 'historiaMostrarFoto') {
        copia.historiaSinFoto = !mostrar
      } else {
        const [lista, i, tipo] = campo.split('.')
        const item = (copia[lista] as Record<string, unknown>[])[Number(i)]
        item[tipo === 'mostrar' ? 'oculto' : 'sinFoto'] = !mostrar
      }
      aplicados.push({ campo, valor: mostrar ? 'si' : 'no' })
      continue
    }

    // Fotos: solo se aceptan fotos subidas por el usuario a este proyecto; se guarda su URL y se muestra.
    // "ninguna" quita la foto de ese lugar (así se puede mover una foto a otro campo).
    if (esCampoFoto(campo)) {
      const nombre = valor.trim()
      const quitar = /^(ninguna|ninguno|quitar|vac[ií]o)$/i.test(nombre)
      const url = quitar ? '' : fotos[nombre]
      if (url === undefined) continue
      if (!quitar) {
        const motivo = revisarFoto(campo, nombre)
        if (motivo) { rechazos.push({ campo, foto: nombre, motivo }); continue }
      }
      if (campo === 'historiaImagen') { copia.historiaImagen = url; if (url) copia.historiaSinFoto = false }
      else if (campo === 'logo') copia.logo = url
      else {
        const [lista, i] = campo.split('.')
        const item = (copia[lista] as Record<string, unknown>[])[Number(i)]
        item.imagen = url
        if (url) item.sinFoto = false
      }
      aplicados.push({ campo, valor: quitar ? 'ninguna' : nombre })
      continue
    }

    let v = valor.trim()
    if (!v) continue
    // Un texto que no cabe en su espacio no se aplica (rompería el diseño); la IA ya fue avisada para acortarlo.
    if (campo !== 'acento' && revisarTexto(campo, v, plantilla)) { console.warn('Texto muy largo, no se aplicó', campo, v.length); continue }
    if (campo === 'acento' && !/^#[0-9a-fA-F]{6}$/.test(v)) continue
    if (campo === 'acento') v = v.toLowerCase()

    const partes = campo.split('.')
    const ultimo = partes.pop()!
    const destino = partes.reduce<Record<string, unknown>>((o, k) => o[k] as Record<string, unknown>, copia)
    destino[ultimo] = v
    aplicados.push({ campo, valor: v })

    // Con un número de WhatsApp válido, el botón de contacto abre el chat de WhatsApp.
    if (campo === 'whatsapp') {
      const digitos = v.replace(/\D/g, '')
      if (digitos.length >= 10) copia.waHref = `https://wa.me/${digitos}`
    }
  }
  return { datos: copia, aplicados, rechazos }
}
