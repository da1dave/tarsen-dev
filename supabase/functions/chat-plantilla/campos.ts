/*
 * Campos de la plantilla que nuestra IA puede cambiar, con su descripción para el modelo.
 * Textos, y además mostrar u ocultar elementos y sus fotos (valor "si" / "no"); nunca se borra contenido.
 * Las imágenes, los enlaces internos y el logo los maneja la app.
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
const MAXIMO: Record<string, number> = { historia: 600, 'servicios.texto': 220, serviciosIntro: 220, 'slides.texto': 180 }

const generico = (ruta: string) => ruta.replace(/\.\d+\./, '.')

/** Rutas editables presentes en los datos del proyecto, con su descripción. */
export function camposEditables(datos: Datos): { ruta: string; descripcion: string }[] {
  const lista: { ruta: string; descripcion: string }[] = []
  for (const [clave, valor] of Object.entries(datos)) {
    if (Array.isArray(valor)) {
      valor.forEach((item, i) => {
        for (const sub of Object.keys(item as object)) {
          const descripcion = DESCRIPCIONES[`${clave}.${sub}`]
          if (descripcion) lista.push({ ruta: `${clave}.${i}.${sub}`, descripcion: `${descripcion} (n.º ${i + 1})` })
        }
        if (NOMBRES[clave]) {
          const estado = (item as { oculto?: boolean }).oculto ? 'ahora oculto' : 'ahora visible'
          lista.push({ ruta: `${clave}.${i}.mostrar`, descripcion: `"si" para mostrar o "no" para ocultar ${NOMBRES[clave]} n.º ${i + 1} (${estado})` })
        }
        if (CON_FOTO.has(clave)) {
          const estado = (item as { sinFoto?: boolean }).sinFoto ? 'ahora sin foto' : 'ahora con foto'
          lista.push({ ruta: `${clave}.${i}.mostrarFoto`, descripcion: `"si" para mostrar o "no" para quitar la foto de ${NOMBRES[clave]} n.º ${i + 1} (${estado})` })
        }
      })
    } else if (DESCRIPCIONES[clave]) {
      lista.push({ ruta: clave, descripcion: DESCRIPCIONES[clave] })
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
export function aplicarCambios(datos: Datos, cambios: { campo: unknown; valor: unknown }[]) {
  const copia = structuredClone(datos)
  const permitidas = new Set(camposEditables(datos).map((c) => c.ruta))
  const aplicados: { campo: string; valor: string }[] = []

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

    let v = valor.trim().slice(0, MAXIMO[generico(campo)] ?? 120)
    if (!v) continue
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
  return { datos: copia, aplicados }
}
