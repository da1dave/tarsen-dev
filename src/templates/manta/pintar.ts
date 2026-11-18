/*
 * Copia un bloque del HTML a un <canvas> con su mismo aspecto: fondos, bordes, imágenes, íconos SVG
 * y textos (cada palabra en su posición exacta, con su fuente y color). Así el efecto manta puede
 * doblar textos e imágenes juntos. Está pensado para el HTML de las plantillas, no para cualquier página:
 * no pinta sombras, degradados ni pseudo-elementos.
 */

const cache = new Map<string, Promise<HTMLImageElement | null>>()
function cargar(src: string) {
  if (!cache.has(src)) {
    cache.set(src, new Promise((ok) => {
      const img = new Image()
      img.onload = () => ok(img)
      img.onerror = () => ok(null)
      img.src = src
    }))
  }
  return cache.get(src)!
}

const transparente = (c: string) => c === 'transparent' || /rgba?\(.*,\s*0\)$/.test(c) || c.endsWith(' / 0)')
const px = (v: string) => parseFloat(v) || 0

function rectRedondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
}

/* Dibuja `img` en el rectángulo según object-fit (cover / contain / fill). */
function dibujarAjustada(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, ajuste: string) {
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  if (!iw || !ih) return
  if (ajuste === 'cover') {
    const e = Math.max(w / iw, h / ih)
    const sw = w / e
    const sh = h / e
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h)
  } else if (ajuste === 'contain') {
    const e = Math.min(w / iw, h / ih)
    ctx.drawImage(img, x + (w - iw * e) / 2, y + (h - ih * e) / 2, iw * e, ih * e)
  } else {
    ctx.drawImage(img, x, y, w, h)
  }
}

export async function pintar(bloque: HTMLElement, escala: number) {
  const base = bloque.getBoundingClientRect()
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.max(1, Math.ceil(base.width * escala))
  lienzo.height = Math.max(1, Math.ceil(base.height * escala))
  const ctx = lienzo.getContext('2d')!
  ctx.scale(escala, escala)
  const rel = (r: DOMRect) => ({ x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height })

  const caja = async (el: Element, cs: CSSStyleDeclaration) => {
    const { x, y, w, h } = rel(el.getBoundingClientRect())
    const radio = px(cs.borderTopLeftRadius)

    if (!transparente(cs.backgroundColor)) {
      ctx.fillStyle = cs.backgroundColor
      rectRedondo(ctx, x, y, w, h, radio)
      ctx.fill()
    }
    const url = /url\(["']?([^"')]+)["']?\)/.exec(cs.backgroundImage)?.[1]
    if (url) {
      const img = await cargar(url)
      if (img) {
        ctx.save()
        rectRedondo(ctx, x, y, w, h, radio)
        ctx.clip()
        dibujarAjustada(ctx, img, x, y, w, h, 'cover')
        ctx.restore()
      }
    }

    // Bordes: si los cuatro son iguales, un rectángulo (con su radio); si no, cada lado por separado.
    const lados = [
      [px(cs.borderTopWidth), cs.borderTopColor, cs.borderTopStyle],
      [px(cs.borderRightWidth), cs.borderRightColor, cs.borderRightStyle],
      [px(cs.borderBottomWidth), cs.borderBottomColor, cs.borderBottomStyle],
      [px(cs.borderLeftWidth), cs.borderLeftColor, cs.borderLeftStyle],
    ] as const
    const trazo = (ancho: number, color: string, estilo: string) => {
      ctx.lineWidth = ancho
      ctx.strokeStyle = color
      ctx.setLineDash(estilo === 'dashed' ? [ancho * 4, ancho * 3] : [])
    }
    const iguales = lados.every(([a, c, e]) => a === lados[0][0] && c === lados[0][1] && e === lados[0][2])
    if (iguales && lados[0][0] > 0 && lados[0][2] !== 'none') {
      const a = lados[0][0]
      trazo(a, lados[0][1], lados[0][2])
      rectRedondo(ctx, x + a / 2, y + a / 2, w - a, h - a, Math.max(0, radio - a / 2))
      ctx.stroke()
    } else {
      const segmentos = [
        [x, y, x + w, y], [x + w, y, x + w, y + h], [x, y + h, x + w, y + h], [x, y, x, y + h],
      ]
      lados.forEach(([a, c, e], k) => {
        if (!a || e === 'none' || transparente(c)) return
        const [x1, y1, x2, y2] = segmentos[k]
        const m = k === 0 ? a / 2 : k === 2 ? -a / 2 : k === 1 ? -a / 2 : a / 2
        trazo(a, c, e)
        ctx.beginPath()
        if (k % 2 === 0) { ctx.moveTo(x1, y1 + m); ctx.lineTo(x2, y2 + m) } else { ctx.moveTo(x1 + m, y1); ctx.lineTo(x2 + m, y2) }
        ctx.stroke()
      })
    }
    ctx.setLineDash([])
  }

  const imagen = async (img: HTMLImageElement, cs: CSSStyleDeclaration) => {
    const { x, y, w, h } = rel(img.getBoundingClientRect())
    const cargada = img.complete && img.naturalWidth ? img : await cargar(img.currentSrc || img.src)
    if (!cargada) return
    ctx.save()
    if (cs.filter.includes('brightness(0)')) ctx.filter = 'brightness(0)'
    rectRedondo(ctx, x, y, w, h, px(cs.borderTopLeftRadius))
    ctx.clip()
    dibujarAjustada(ctx, cargada, x, y, w, h, cs.objectFit)
    ctx.restore()
  }

  const svg = async (el: SVGSVGElement, cs: CSSStyleDeclaration) => {
    const { x, y, w, h } = rel(el.getBoundingClientRect())
    const copia = el.cloneNode(true) as SVGSVGElement
    copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    copia.setAttribute('width', String(w))
    copia.setAttribute('height', String(h))
    const marcado = copia.outerHTML.replaceAll('currentColor', cs.color)
    const img = await cargar(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(marcado)}`)
    if (img) ctx.drawImage(img, x, y, w, h)
  }

  // Cada palabra se dibuja donde el navegador la puso, así el ajuste de líneas es idéntico al HTML.
  const texto = (nodo: Text, cs: CSSStyleDeclaration) => {
    const contenido = nodo.data
    if (!contenido.trim()) return
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    ctx.fillStyle = cs.color
    ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
    ctx.textBaseline = 'alphabetic'
    const ascenso = ctx.measureText('Hg').fontBoundingBoxAscent
    const rango = document.createRange()
    const palabra = /\S+/g
    let m: RegExpExecArray | null
    while ((m = palabra.exec(contenido))) {
      rango.setStart(nodo, m.index)
      rango.setEnd(nodo, m.index + m[0].length)
      const r = rango.getBoundingClientRect()
      if (!r.width) continue
      let t = m[0]
      if (cs.textTransform === 'uppercase') t = t.toUpperCase()
      const { x, y } = rel(r)
      ctx.fillText(t, x, y + ascenso)
    }
  }

  const recorrer = async (nodo: Node, esRaiz = false) => {
    if (nodo.nodeType === Node.TEXT_NODE) {
      const padre = nodo.parentElement
      if (padre) texto(nodo as Text, getComputedStyle(padre))
      return
    }
    if (!(nodo instanceof Element)) return
    const cs = getComputedStyle(nodo)
    if (cs.display === 'none' || cs.visibility === 'hidden') return
    if (!esRaiz && cs.opacity === '0') return
    if (nodo instanceof SVGSVGElement) { await svg(nodo, cs); return }
    await caja(nodo, cs)
    if (nodo instanceof HTMLImageElement) { await imagen(nodo, cs); return }
    for (const hijo of Array.from(nodo.childNodes)) await recorrer(hijo)
  }

  await recorrer(bloque, true)
  return lienzo
}
