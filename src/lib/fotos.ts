import { db } from './supabase'

/*
 * Fotos del usuario: se comprimen en el navegador (máx. 1600 px, WebP) y se suben a Storage en
 * fotos/<usuario>/<proyecto>/<nombre> (la foto de perfil, en fotos/<usuario>/perfil/).
 * Las reglas del bucket solo dejan subir a la carpeta propia.
 * El nombre lleva el tamaño y si tiene transparencia ("…-1600x1067.webp", "…-512x512-t.webp"):
 * nuestra IA lo usa para no poner un logo o una foto pequeña de fondo a pantalla completa.
 */
export interface Foto { nombre: string; url: string }

const LADO_MAXIMO = 1600
const PESO_MAXIMO = 15 * 1024 * 1024 // antes de comprimir

/** `cuadrado`: recorta el centro en un cuadrado de `lado` px (fotos de perfil). */
interface Comprimida { blob: Blob; extension: string; ancho: number; alto: number; transparente: boolean }

/** ¿Tiene píxeles transparentes? (se revisa una versión reducida de 64 px) */
function tieneTransparencia(lienzo: HTMLCanvasElement) {
  const muestra = document.createElement('canvas')
  muestra.width = muestra.height = 64
  const ctx = muestra.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(lienzo, 0, 0, 64, 64)
  const d = ctx.getImageData(0, 0, 64, 64).data
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true
  return false
}

async function comprimir(archivo: File, lado = LADO_MAXIMO, cuadrado = false): Promise<Comprimida> {
  let imagen: ImageBitmap
  try {
    imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(`No pudimos leer "${archivo.name}". Prueba con una foto JPG o PNG.`)
  }
  const lienzo = document.createElement('canvas')
  if (cuadrado) {
    const corte = Math.min(imagen.width, imagen.height)
    lienzo.width = lienzo.height = Math.min(lado, corte)
    lienzo.getContext('2d')!.drawImage(imagen, (imagen.width - corte) / 2, (imagen.height - corte) / 2, corte, corte, 0, 0, lienzo.width, lienzo.height)
  } else {
    const escala = Math.min(1, lado / Math.max(imagen.width, imagen.height))
    lienzo.width = Math.round(imagen.width * escala)
    lienzo.height = Math.round(imagen.height * escala)
    lienzo.getContext('2d')!.drawImage(imagen, 0, 0, lienzo.width, lienzo.height)
  }
  imagen.close()
  const medidas = { ancho: lienzo.width, alto: lienzo.height }
  const conAlfa = /png|webp|gif|avif/.test(archivo.type) && tieneTransparencia(lienzo)
  const aBlob = (tipo: string) => new Promise<Blob | null>((ok) => lienzo.toBlob(ok, tipo, 0.82))
  // Algunos navegadores no generan WebP (devuelven PNG): en ese caso, JPG.
  const webp = await aBlob('image/webp')
  if (webp?.type === 'image/webp') return { blob: webp, extension: 'webp', ...medidas, transparente: conAlfa }
  const jpg = await aBlob('image/jpeg')
  if (!jpg) throw new Error('No pudimos preparar la foto. Intenta con otra.')
  return { blob: jpg, extension: 'jpg', ...medidas, transparente: false }
}

async function subir(carpeta: string, archivo: File, lado?: number, cuadrado?: boolean): Promise<Foto> {
  if (!archivo.type.startsWith('image/')) throw new Error(`"${archivo.name}" no es una imagen.`)
  if (archivo.size > PESO_MAXIMO) throw new Error(`"${archivo.name}" pesa más de 15 MB.`)
  const { data: { session } } = await db().auth.getSession()
  if (!session) throw new Error('Tu sesión terminó. Vuelve a iniciar sesión.')

  const { blob, extension, ancho, alto, transparente } = await comprimir(archivo, lado, cuadrado)
  const nombre = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${ancho}x${alto}${transparente ? '-t' : ''}.${extension}`
  const ruta = `${session.user.id}/${carpeta}/${nombre}`
  const { error } = await db().storage.from('fotos').upload(ruta, blob, { contentType: blob.type, cacheControl: '31536000' })
  if (error) throw new Error('No pudimos subir la foto. Revisa tu conexión e intenta de nuevo.')
  return { nombre, url: db().storage.from('fotos').getPublicUrl(ruta).data.publicUrl }
}

export const subirFoto = (proyectoId: string, archivo: File) => subir(proyectoId, archivo)

/** Foto de perfil: cuadrada, 400 px. */
export const subirAvatar = (archivo: File) => subir('perfil', archivo, 400, true)

/** Borra una foto subida (best effort: si falla, solo queda el archivo sin usar). */
export function borrarFoto(url: string) {
  const marca = '/storage/v1/object/public/fotos/'
  const i = url.indexOf(marca)
  if (i < 0) return
  db().storage.from('fotos').remove([decodeURIComponent(url.slice(i + marca.length))]).catch(() => {})
}
