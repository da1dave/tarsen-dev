import type { Pestana } from '../components/usePestanas'

export type IdPestana = 'inicio' | 'que-hacemos' | 'quienes-somos'

export const IDS_PESTANAS = ['inicio', 'que-hacemos', 'quienes-somos'] as const satisfies readonly IdPestana[]

export const PESTANAS: Pestana<IdPestana>[] = [
  { id: 'inicio', texto: 'Inicio', to: '/' },
  { id: 'que-hacemos', texto: 'Qué hacemos', to: '/#que-hacemos' },
  { id: 'quienes-somos', texto: 'Quiénes somos', to: '/#quienes-somos' },
]
