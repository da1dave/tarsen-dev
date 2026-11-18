import Anthropic from 'npm:@anthropic-ai/sdk@1.4.0'

/*
 * Conexión con el proveedor de IA. El resto de la función no sabe cuál se usa.
 * Principal: Claude Haiku 5.5 (SDK oficial de Anthropic). Alternativa: Gemini (PROVEEDOR_IA=gemini).
 *
 * Gemini se llama por su API REST (generativelanguage.googleapis.com), la misma que se probó
 * con curl al configurar la clave.
 */

/** `imagenes`: URLs públicas de fotos que el usuario adjuntó en este mensaje (solo Claude las ve). */
export interface MensajeHistorial { rol: 'usuario' | 'asistente'; texto: string; imagenes?: string[] }
export interface Cambio { campo: string; valor: string }
export interface Pregunta { pregunta: string; tipo: 'opciones' | 'varias' | 'texto'; opciones: string[] }
export interface Respuesta { texto: string; cambios: Cambio[]; formulario?: Pregunta[]; tokensEntrada: number; tokensSalida: number }
export interface Peticion { sistema: string; historial: MensajeHistorial[]; campos: string[] }

export class ErrorProveedor extends Error {
  constructor(public tipo: 'cuota' | 'bloqueo' | 'otro', mensaje: string) { super(mensaje) }
}

const NOMBRE_HERRAMIENTA = 'actualizar_plantilla'
const NOMBRE_FORMULARIO = 'mostrar_formulario'

/** Limpia el formulario que propone la IA: 1 a 3 preguntas, hasta 8 opciones cortas cada una. */
function limpiarFormulario(entrada: unknown): Pregunta[] | undefined {
  const lista = (entrada as { preguntas?: unknown })?.preguntas
  if (!Array.isArray(lista)) return undefined
  const preguntas: Pregunta[] = []
  for (const p of lista.slice(0, 3)) {
    const pregunta = typeof p?.pregunta === 'string' ? p.pregunta.trim().slice(0, 140) : ''
    const tipo = ['opciones', 'varias', 'texto'].includes(p?.tipo) ? p.tipo : 'texto'
    const opciones = Array.isArray(p?.opciones)
      ? [...new Set<string>(p.opciones.filter((o: unknown) => typeof o === 'string').map((o: string) => o.trim().slice(0, 60)).filter(Boolean))].slice(0, 8)
      : []
    if (!pregunta) continue
    preguntas.push({ pregunta, tipo: tipo !== 'texto' && !opciones.length ? 'texto' : tipo, opciones: tipo === 'texto' ? [] : opciones })
  }
  return preguntas.length ? preguntas : undefined
}

// ---------------- Gemini ----------------

const MODELO_GEMINI = Deno.env.get('GEMINI_MODELO') ?? 'gemini-3.5-flash'

interface Parte { text?: string; functionCall?: { name: string; args?: Record<string, unknown> }; functionResponse?: unknown; thought?: boolean }
interface Contenido { role: 'user' | 'model'; parts: Parte[] }

// Cadena de modelos: si uno está saturado (500/503), sin cuota (429) o no responde a tiempo, se pasa
// al siguiente. En el plan gratis cada modelo tiene su propia cuota por minuto y por día.
// Se puede cambiar sin tocar código con el secreto GEMINI_MODELOS="modelo1,modelo2,...".
const MODELOS_GEMINI = (Deno.env.get('GEMINI_MODELOS') ?? `${MODELO_GEMINI},gemini-3.5-flash-lite,gemini-3.1-flash-lite`)
  .split(',').map((m) => m.trim()).filter(Boolean)

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Resultado = { json: any; modelo: string }

async function pedirGemini(modelo: string, cuerpo: unknown, clave: string) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(25_000),
  })
  return { res, json: await res.json().catch(() => ({})) }
}

/** Prueba los modelos en orden (o solo `fijo`, para continuar la conversación con el mismo modelo). */
async function llamarGemini(cuerpo: unknown, fijo?: string): Promise<Resultado> {
  const clave = Deno.env.get('GEMINI_API_KEY')
  if (!clave) throw new ErrorProveedor('otro', 'Falta el secreto GEMINI_API_KEY')
  const modelos = fijo ? [fijo] : MODELOS_GEMINI

  let ultimo = ''
  for (const [i, modelo] of modelos.entries()) {
    if (i > 0) await esperar(400)
    let res: Response, json: any
    try {
      ({ res, json } = await pedirGemini(modelo, cuerpo, clave))
    } catch (e) {
      ultimo = `${modelo}: ${e instanceof Error ? e.name : 'error de red'}`
      console.warn(`Gemini ${ultimo}; se prueba el siguiente modelo`)
      continue
    }
    if (res.status === 429 || res.status === 500 || res.status === 503) {
      ultimo = `${modelo}: ${res.status} ${String(json?.error?.message ?? '').slice(0, 160)}`
      console.warn(`Gemini ${ultimo}; se prueba el siguiente modelo`)
      continue
    }
    if (!res.ok) throw new ErrorProveedor('otro', `Gemini ${modelo} respondió ${res.status}: ${JSON.stringify(json).slice(0, 300)}`)
    if (json.promptFeedback?.blockReason) throw new ErrorProveedor('bloqueo', `Bloqueado: ${json.promptFeedback.blockReason}`)
    if (i > 0) console.log(`Respondió el modelo de respaldo ${modelo}`)
    return { json, modelo }
  }
  throw new ErrorProveedor('cuota', `Ningún modelo de Gemini disponible (último: ${ultimo})`)
}

async function responderGemini({ sistema, historial, campos }: Peticion): Promise<Respuesta> {
  const herramienta = {
    functionDeclarations: [{
      name: NOMBRE_HERRAMIENTA,
      description: 'Cambia textos de la página del negocio. Úsala cada vez que haya información nueva o el usuario pida un ajuste.',
      parameters: {
        type: 'OBJECT',
        properties: {
          cambios: {
            type: 'ARRAY',
            description: 'Lista de campos a cambiar con su nuevo texto.',
            items: {
              type: 'OBJECT',
              properties: {
                campo: { type: 'STRING', enum: campos, format: 'enum', description: 'Ruta del campo a cambiar' },
                valor: { type: 'STRING', description: 'Nuevo texto del campo, en español' },
              },
              required: ['campo', 'valor'],
            },
          },
        },
        required: ['cambios'],
      },
    }],
  }
  const contenidos: Contenido[] = historial.map((m) => ({ role: m.rol === 'usuario' ? 'user' : 'model', parts: [{ text: m.texto }] }))
  const base = { systemInstruction: { parts: [{ text: sistema }] }, tools: [herramienta], generationConfig: { maxOutputTokens: 4096 } }

  let tokensEntrada = 0
  let tokensSalida = 0
  const cambios: Cambio[] = []
  let texto = ''

  // Hasta dos vueltas: si el modelo usa la herramienta, se le confirma y escribe su respuesta.
  // La segunda vuelta usa el mismo modelo que respondió la primera (sus "thought signatures" son de ese
  // modelo). Si la segunda falla, los cambios ya obtenidos se aplican igual con un texto genérico.
  let modelo: string | undefined
  for (let vuelta = 0; vuelta < 2; vuelta++) {
    let json: any
    try {
      ({ json, modelo } = await llamarGemini({ ...base, contents: contenidos }, modelo))
    } catch (e) {
      if (vuelta === 0 || !cambios.length) throw e
      console.warn('Falló la segunda vuelta; se usan los cambios ya obtenidos', e)
      texto = texto || 'Listo, ya actualicé tu página. Mira la vista previa a la derecha.'
      break
    }
    tokensEntrada += json.usageMetadata?.promptTokenCount ?? 0
    tokensSalida += (json.usageMetadata?.candidatesTokenCount ?? 0) + (json.usageMetadata?.thoughtsTokenCount ?? 0)
    const candidato = json.candidates?.[0]
    if (!candidato?.content?.parts) {
      if (candidato?.finishReason === 'SAFETY') throw new ErrorProveedor('bloqueo', 'Respuesta bloqueada por seguridad')
      break
    }
    const partes: Parte[] = candidato.content.parts
    texto += partes.filter((p) => p.text && !p.thought).map((p) => p.text).join('')
    const llamadas = partes.filter((p) => p.functionCall?.name === NOMBRE_HERRAMIENTA)
    if (!llamadas.length) break

    for (const l of llamadas) {
      const lista = (l.functionCall!.args?.cambios ?? []) as Cambio[]
      if (Array.isArray(lista)) cambios.push(...lista)
    }
    // Se devuelve el resultado de la herramienta para que el modelo redacte su mensaje al usuario.
    contenidos.push({ role: 'model', parts: partes })
    contenidos.push({
      role: 'user',
      parts: llamadas.map(() => ({ functionResponse: { name: NOMBRE_HERRAMIENTA, response: { resultado: 'Cambios aplicados en la página.' } } })),
    })
    if (texto.trim()) break
  }

  return { texto: texto.trim(), cambios, tokensEntrada, tokensSalida }
}

// ---------------- Claude (proveedor principal) ----------------

const MODELO_CLAUDE = Deno.env.get('CLAUDE_MODELO') ?? 'claude-haiku-5-5'

let clienteClaude: Anthropic | undefined
function claude() {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new ErrorProveedor('otro', 'Falta el secreto ANTHROPIC_API_KEY')
  // El SDK reintenta solo los 429, 5xx y errores de red (2 veces, con espera).
  clienteClaude ??= new Anthropic({ apiKey, maxRetries: 2, timeout: 30_000 })
  return clienteClaude
}

async function responderClaude({ sistema, historial, campos }: Peticion): Promise<Respuesta> {
  const herramientas: Anthropic.Tool[] = [
    {
      name: NOMBRE_HERRAMIENTA,
      description: 'Cambia textos, fotos, color y visibilidad de elementos de la página del negocio. Úsala cada vez que haya información nueva o el usuario pida un ajuste.',
      strict: true,
      input_schema: {
        type: 'object',
        properties: {
          cambios: {
            type: 'array',
            description: 'Lista de campos a cambiar con su nuevo valor.',
            items: {
              type: 'object',
              properties: {
                campo: { type: 'string', enum: campos, description: 'Ruta del campo a cambiar' },
                valor: { type: 'string', description: 'Nuevo texto del campo, en español (en campos de foto: el nombre de una foto subida)' },
              },
              required: ['campo', 'valor'],
              additionalProperties: false,
            },
          },
        },
        required: ['cambios'],
        additionalProperties: false,
      },
    },
    {
      name: NOMBRE_FORMULARIO,
      description: 'Muestra al usuario un formulario corto con la siguiente pregunta (o hasta 3 relacionadas) y opciones pensadas para su negocio. Úsala en todas tus respuestas.',
      strict: true,
      input_schema: {
        type: 'object',
        properties: {
          preguntas: {
            type: 'array',
            description: 'De 1 a 3 preguntas.',
            items: {
              type: 'object',
              properties: {
                pregunta: { type: 'string', description: 'Pregunta corta, en español' },
                tipo: {
                  type: 'string',
                  enum: ['opciones', 'varias', 'texto'],
                  description: '"opciones": elige una; "varias": puede elegir varias; "texto": respuesta escrita (teléfono, dirección, nombre…)',
                },
                opciones: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'De 3 a 6 opciones concretas para este negocio (vacío si el tipo es "texto"). No incluyas "Otro": se agrega solo.',
                },
              },
              required: ['pregunta', 'tipo', 'opciones'],
              additionalProperties: false,
            },
          },
        },
        required: ['preguntas'],
        additionalProperties: false,
      },
    },
  ]

  // La conversación debe empezar con un mensaje del usuario (el historial se recorta a los últimos 20).
  const inicio = historial.findIndex((m) => m.rol === 'usuario')
  const mensajes: Anthropic.MessageParam[] = historial.slice(Math.max(inicio, 0))
    .map((m): Anthropic.MessageParam => m.imagenes?.length
      ? {
        role: 'user',
        content: [
          ...m.imagenes.map((url) => ({ type: 'image' as const, source: { type: 'url' as const, url } })),
          { type: 'text' as const, text: m.texto },
        ],
      }
      : { role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto })

  let tokensEntrada = 0
  let tokensSalida = 0
  const cambios: Cambio[] = []
  let formulario: Pregunta[] | undefined
  let texto = ''

  // Hasta tres vueltas: Claude puede cambiar la página, escribir su mensaje y proponer el formulario
  // en la misma respuesta; si le falta algo, se le devuelven los resultados y continúa.
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    let respuesta: Anthropic.Message
    try {
      respuesta = await claude().messages.create({
        model: MODELO_CLAUDE,
        max_tokens: 8000,
        output_config: { effort: 'low' }, // chat corto: menos espera y menos costo
        cache_control: { type: 'ephemeral' }, // las vueltas siguientes reutilizan el prefijo
        system: sistema,
        tools: herramientas,
        messages: mensajes,
      })
    } catch (e) {
      if (vuelta > 0 && (cambios.length || formulario || texto)) {
        console.warn('Falló una vuelta posterior; se usa lo ya obtenido', e)
        break
      }
      if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError || e instanceof Anthropic.APIConnectionError) {
        throw new ErrorProveedor('cuota', `Claude no disponible: ${e.message}`)
      }
      if (e instanceof Anthropic.APIError && e.status === 529) throw new ErrorProveedor('cuota', `Claude saturado: ${e.message}`)
      throw new ErrorProveedor('otro', `Claude: ${e instanceof Error ? e.message : String(e)}`)
    }

    const u = respuesta.usage
    tokensEntrada += u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0)
    tokensSalida += u.output_tokens

    if (respuesta.stop_reason === 'refusal') {
      if (cambios.length || texto) break
      throw new ErrorProveedor('bloqueo', 'Claude declinó responder')
    }

    for (const b of respuesta.content) if (b.type === 'text') texto += (texto && b.text ? '\n' : '') + b.text
    const usos = respuesta.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    for (const uso of usos) {
      if (uso.name === NOMBRE_HERRAMIENTA) {
        const lista = (uso.input as { cambios?: unknown })?.cambios
        if (Array.isArray(lista)) cambios.push(...(lista as Cambio[]))
      } else if (uso.name === NOMBRE_FORMULARIO) {
        formulario = limpiarFormulario(uso.input) ?? formulario
      }
    }
    if (respuesta.stop_reason !== 'tool_use' || !usos.length) break
    // Ya hay mensaje y formulario: no hace falta otra vuelta.
    if (texto.trim() && formulario) break

    // Se devuelve el contenido completo (incluye los bloques de razonamiento) y el resultado de cada herramienta.
    mensajes.push({ role: 'assistant', content: respuesta.content })
    mensajes.push({
      role: 'user',
      content: usos.map((uso) => ({
        type: 'tool_result' as const,
        tool_use_id: uso.id,
        content: uso.name === NOMBRE_FORMULARIO ? 'Formulario listo para mostrarse.' : 'Cambios aplicados en la página.',
      })),
    })
  }

  if (!texto.trim() && cambios.length) texto = 'Listo, ya actualicé tu página. Mira la vista previa a la derecha.'
  return { texto: texto.trim(), cambios, formulario, tokensEntrada, tokensSalida }
}

// ---------------- Selección del proveedor ----------------

// 'claude' (Claude Haiku 5.5, de pago) es el principal; 'gemini' queda como alternativa (PROVEEDOR_IA=gemini).
export const PROVEEDOR = Deno.env.get('PROVEEDOR_IA') ?? 'claude'

/*
 * A veces el modelo escribe el formulario como texto ("[Formulario mostrado]\n- ¿Pregunta? (a / b)")
 * en vez de usar la herramienta. Se quita del texto y, si no hubo herramienta, se convierte en formulario.
 */
const MARCA_FORMULARIO = /\n?\s*\[\s*formulario(?: mostrado)?\s*\]\s*/i
export function separarFormularioEscrito(texto: string): { texto: string; formulario?: Pregunta[] } {
  const corte = texto.search(MARCA_FORMULARIO)
  if (corte < 0) return { texto }
  const preguntas = texto.slice(corte).replace(MARCA_FORMULARIO, '').split('\n')
    .map((l) => l.trim().match(/^[-•*]\s*(.+?)(?:\s*\(([^)]*)\))?\s*$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => {
      const opciones = (m[2] ?? '').split('/').map((o) => o.trim()).filter(Boolean)
      return { pregunta: m[1], tipo: opciones.length ? 'opciones' : 'texto', opciones }
    })
  return { texto: texto.slice(0, corte).trim(), formulario: limpiarFormulario({ preguntas }) }
}

export async function responder(p: Peticion): Promise<Respuesta> {
  let r: Respuesta
  if (PROVEEDOR === 'claude') r = await responderClaude(p)
  else if (PROVEEDOR === 'gemini') r = await responderGemini(p)
  else throw new ErrorProveedor('otro', `Proveedor de IA no soportado: ${PROVEEDOR}`)
  const escrito = separarFormularioEscrito(r.texto)
  return { ...r, texto: escrito.texto, formulario: r.formulario ?? escrito.formulario }
}
