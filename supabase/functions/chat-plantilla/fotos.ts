/*
 * Tamaño y transparencia de las fotos del usuario, para que nuestra IA las ponga donde se vean bien
 * (una foto pequeña o un logo no sirven de fondo a pantalla completa).
 * Las fotos nuevas traen el dato en el nombre ("…-1600x1067.webp", "…-512x512-t.webp" = con transparencia).
 * Para las anteriores se leen los primeros bytes del archivo (WebP, JPG o PNG).
 */
export interface InfoFoto { ancho: number; alto: number; transparente: boolean }

export function infoDelNombre(nombre: string): InfoFoto | null {
  const m = nombre.match(/-(\d{1,5})x(\d{1,5})(-t)?\.[a-z]+$/i)
  return m ? { ancho: Number(m[1]), alto: Number(m[2]), transparente: !!m[3] } : null
}

const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8)
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)
const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1]
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0
const texto = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n))

/** Lee ancho, alto y si tiene canal de transparencia a partir de la cabecera del archivo. */
export function infoDeBytes(b: Uint8Array): InfoFoto | null {
  if (b.length < 30) return null
  // WebP
  if (texto(b, 0, 4) === 'RIFF' && texto(b, 8, 4) === 'WEBP') {
    const tipo = texto(b, 12, 4)
    if (tipo === 'VP8X') return { ancho: u24le(b, 24) + 1, alto: u24le(b, 27) + 1, transparente: (b[20] & 0x10) !== 0 }
    if (tipo === 'VP8L') {
      const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)
      return { ancho: (v & 0x3fff) + 1, alto: ((v >> 14) & 0x3fff) + 1, transparente: ((v >> 28) & 1) === 1 }
    }
    if (tipo === 'VP8 ') return { ancho: u16le(b, 26) & 0x3fff, alto: u16le(b, 28) & 0x3fff, transparente: false }
    return null
  }
  // PNG (tipo de color 4 o 6 = con alfa)
  if (b[0] === 0x89 && texto(b, 1, 3) === 'PNG') {
    return { ancho: u32be(b, 16), alto: u32be(b, 20), transparente: b[25] === 4 || b[25] === 6 }
  }
  // JPG: se buscan los marcadores SOF
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue }
      const marca = b[i + 1]
      if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) {
        return { ancho: u16be(b, i + 7), alto: u16be(b, i + 5), transparente: false }
      }
      i += 2 + u16be(b, i + 2)
    }
  }
  return null
}

/** Datos de una foto: del nombre si los trae; si no, de la cabecera del archivo (solo los primeros 64 KB). */
export async function infoFoto(nombre: string, url: string): Promise<InfoFoto | null> {
  const delNombre = infoDelNombre(nombre)
  if (delNombre) return delNombre
  try {
    const r = await fetch(url, { headers: { Range: 'bytes=0-65535' }, signal: AbortSignal.timeout(4000) })
    if (!r.ok) return null
    return infoDeBytes(new Uint8Array(await r.arrayBuffer()))
  } catch {
    return null
  }
}

/** "1600×1067 px, horizontal" · "512×512 px, con transparencia (parece un logo)" */
export function describir(info: InfoFoto | null) {
  if (!info) return 'tamaño desconocido'
  const forma = info.ancho > info.alto * 1.15 ? 'horizontal' : info.alto > info.ancho * 1.15 ? 'vertical' : 'cuadrada'
  const tam = Math.max(info.ancho, info.alto) < 800 ? ', pequeña' : ''
  return `${info.ancho}×${info.alto} px, ${forma}${tam}${info.transparente ? ', con transparencia (parece un logo o recorte)' : ''}`
}

/*
 * Dónde se ve cada foto según la plantilla. `grande`: ese espacio ocupa la pantalla completa.
 * `nota`: lo que se le explica a nuestra IA.
 */
export const ESPACIOS: Record<string, { grande: (campo: string) => boolean; logosFlotan?: boolean; nota: string }> = {
  orbita: {
    grande: () => false,
    nota: 'Plantilla Órbita: las imágenes de los destacados flotan recortadas sobre un fondo espacial; ahí lucen muy bien los PNG con transparencia (productos, logo). Servicios y Nosotros usan recuadros medianos.',
  },
  manta: {
    grande: () => false,
    nota: 'Plantilla Manta: todas las fotos van en recuadros medianos (destacados, servicios y Nosotros).',
  },
  aurea: {
    grande: (c) => c === 'slides.0.imagen',
    nota: 'Plantilla Áurea: la foto del destacado 1 es el FONDO de la portada a pantalla completa: solo fotos grandes (1200 px de ancho o más) y sin transparencia. Las demás van en recuadros.',
  },
  marea: {
    grande: (c) => /^slides\.\d+\.imagen$/.test(c),
    logosFlotan: true,
    nota: 'Plantilla Marea: cada destacado es una escena a pantalla completa: usa fotos grandes (1200 px de ancho o más). Un logo con transparencia en un destacado flota en el centro de la escena y se ve bien aunque sea mediano.',
  },
}

/** ¿Se puede poner esta foto en ese campo sin que se vea mal? Devuelve el motivo si no. */
export function motivoRechazo(campo: string, info: InfoFoto | null, plantilla: string): string | null {
  if (!info || campo === 'logo') return null
  const espacio = ESPACIOS[plantilla]
  if (espacio?.grande(campo)) {
    if (info.transparente && espacio.logosFlotan) return info.ancho < 300 ? 'es muy pequeña para ese espacio' : null
    if (info.transparente) return 'es un logo o recorte y ese espacio es un fondo a pantalla completa'
    if (info.ancho < 1000) return 'es muy pequeña para un fondo a pantalla completa y se vería pixelada'
    return null
  }
  if (Math.max(info.ancho, info.alto) < 400) return 'es muy pequeña y se vería pixelada'
  return null
}
