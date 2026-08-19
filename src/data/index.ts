import arli from './heroes/arli.json'
import { heroSchema } from '../schemas/hero.schema'
import type { Hero, Lane } from '../types'
import manualAnalysisRaw from './knowledge/manual-analysis-2026-08-19.json'
import { manualAnalysisSchema } from '../schemas/manualAnalysis.schema'

export const manualAnalysis = manualAnalysisSchema.parse(manualAnalysisRaw)

const canonicalHeroes: Record<string, unknown> = { arli }
const rawHeroes = Object.entries(manualAnalysis.heroes).map(([id, registry]) => canonicalHeroes[id] ?? {
  id,
  name: registry.name,
  aliases: [],
  image: `/heroes/${id}.webp`,
  roles: registry.roles,
  lanes: registry.lanes,
  primaryLane: registry.lanes[0] ?? 'unknown',
  damage: { primary: 'unknown', secondary: null },
  tags: [],
  strengths: [],
  weaknesses: [],
  gamePhases: { early: '', mid: '', late: '' },
  skills: {},
  archetypes: {},
  patch: 'unknown',
  updatedAt: manualAnalysis.updatedAt,
  sources: [{ type: 'manual-analysis', title: 'User supplied initial draft analysis', dateAccessed: manualAnalysis.updatedAt }],
})

export const heroes: Hero[] = rawHeroes.map((hero) => heroSchema.parse(hero) as Hero).sort((a,b) => a.name.localeCompare(b.name))
export const getHeroes = () => heroes
export const getHero = (id:string) => heroes.find((hero) => hero.id === id)
export const getHeroesByLane = (lane:string) => heroes.filter((hero) => hero.lanes.includes(lane as Hero['lanes'][number]))
export const getHeroDisplayName = (id:string) => manualAnalysis.heroes[id]?.displayNameZhHant ?? getHero(id)?.name ?? id
export const isHeroLaneConfirmed = (hero:Hero, lane:Lane) => hero.lanes.includes(lane)
