import arli from './heroes/arli.json'
import { heroSchema } from '../schemas/hero.schema'
import type { Hero } from '../types'
import manualAnalysisRaw from './knowledge/manual-analysis-2026-08-19.json'
import { manualAnalysisSchema } from '../schemas/manualAnalysis.schema'

const rawHeroes = [arli]
export const heroes: Hero[] = rawHeroes.map((hero) => heroSchema.parse(hero) as Hero)
export const getHeroes = () => heroes
export const getHero = (id:string) => heroes.find((hero) => hero.id === id)
export const getHeroesByLane = (lane:string) => heroes.filter((hero) => hero.lanes.includes(lane as Hero['lanes'][number]))
export const manualAnalysis = manualAnalysisSchema.parse(manualAnalysisRaw)
