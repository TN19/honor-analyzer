import arli from './heroes/arli.json'
import { heroSchema } from '../schemas/hero.schema'
import type { Hero, Lane } from '../types'
import manualAnalysisRaw from './knowledge/manual-analysis-2026-08-19.json'
import addendumRaw from './knowledge/manual-analysis-2026-08-19-addendum.json'
import secondAddendumRaw from './knowledge/manual-analysis-2026-08-20-addendum.json'
import { manualAnalysisSchema } from '../schemas/manualAnalysis.schema'
import recommendationRulesRaw from './recommendation-rules/general.json'
import { recommendationRulesSchema } from '../schemas/recommendationRules.schema'
import professionalMatchesRaw from './matches/ewc-2026-final.json'
import { professionalMatchesSchema } from '../schemas/professionalMatches.schema'

const normalizeAddendum = (raw:typeof addendumRaw|typeof secondAddendumRaw,dateAccessed:string) => {
  const sources=[{ type:'manual-analysis' as const,title:'User supplied approved draft analysis addendum',dateAccessed }]
  return {
    matchups:raw.matchups.map(([heroId,targetId,score,reason])=>({heroId:String(heroId),targetId:String(targetId),score:Number(score),confidence:.5,conditions:[],reasons:[String(reason)],sources})),
    synergies:raw.synergies.map(([heroIds,score,reason])=>({heroIds:heroIds as string[],score:Number(score),confidence:.5,conditions:[],reasons:[String(reason)],sources})),
    draftRules:raw.draftRules.map(([id,conditions,recommendations,rationale])=>({id:id as string,confidence:.5,conditions:conditions as string[],recommendations:recommendations as string[],rationale:rationale as string[],sources})),
  }
}
const addendum=normalizeAddendum(addendumRaw,'2026-08-19')
const secondAddendum=normalizeAddendum(secondAddendumRaw,'2026-08-20')
const dedupe = <T>(items:T[], key:(item:T)=>string) => [...new Map(items.map(item=>[key(item),item])).values()]
export const manualAnalysis = manualAnalysisSchema.parse({
  ...manualAnalysisRaw,
  updatedAt:'2026-08-20',
  heroes:{...manualAnalysisRaw.heroes,...addendumRaw.heroes,...secondAddendumRaw.heroes},
  matchups:dedupe([...manualAnalysisRaw.matchups,...addendum.matchups,...secondAddendum.matchups], item=>`${item.heroId}:${item.targetId}`),
  synergies:dedupe([...manualAnalysisRaw.synergies,...addendum.synergies,...secondAddendum.synergies], item=>[...item.heroIds].sort().join(':')),
  draftRules:dedupe([...manualAnalysisRaw.draftRules,...addendum.draftRules,...secondAddendum.draftRules], item=>item.id),
})
export const recommendationRules = recommendationRulesSchema.parse(recommendationRulesRaw)
export const professionalMatches = professionalMatchesSchema.parse(professionalMatchesRaw)
professionalMatches.matches.forEach(match=>[...match.blue.bans,...match.blue.picks,...match.red.bans,...match.red.picks].forEach(heroId=>{if(!manualAnalysis.heroes[heroId])throw new Error(`Professional match references unknown hero: ${heroId}`)}))

const canonicalHeroes: Record<string, unknown> = { arli }
const rawHeroes = Object.entries(manualAnalysis.heroes).map(([id, registry]) => canonicalHeroes[id] ?? {
  id,
  name: registry.name,
  aliases: [],
  image: `heroes/${id}.webp`,
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
