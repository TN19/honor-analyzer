import type { Hero, Team } from '../types'
import { manualAnalysis } from '../data'

export type BanRelevance='high'|'medium'|'low'
export type BanRecommendation={heroId:string;score:number;relevance:BanRelevance;reasons:string[];protectsPlannedPick:boolean}
export type BanRecommendationContext={team:Team;stepIndex:number;plannedPickId?:string;usedHeroIds:Set<string>}

export function recommendBans(candidates:Hero[],context:BanRecommendationContext):BanRecommendation[]{
  const available=candidates.filter(hero=>!context.usedHeroIds.has(hero.id))
  if(!context.plannedPickId) return []
  return available.map(hero=>{
    const threats=context.plannedPickId?manualAnalysis.matchups.filter(entry=>entry.targetId===context.plannedPickId&&entry.heroId===hero.id&&entry.score>=7):[]
    const score=threats.reduce((best,entry)=>Math.max(best,entry.score),0)
    const planned=manualAnalysis.heroes[context.plannedPickId!]?.displayNameZhHant??context.plannedPickId
    const heroName=manualAnalysis.heroes[hero.id]?.displayNameZhHant??hero.id
    const reasons=[`${heroName}已登記為${planned}的威脅；禁用可保護預定選角。`,...threats.flatMap(entry=>entry.reasons)]
    const relevance:BanRelevance=score>=6.5?'high':score>=3.5?'medium':'low'
    return {heroId:hero.id,score:+score.toFixed(1),relevance,reasons,protectsPlannedPick:threats.length>0}
  }).filter(item=>item.protectsPlannedPick).sort((a,b)=>b.score-a.score).slice(0,12)
}
