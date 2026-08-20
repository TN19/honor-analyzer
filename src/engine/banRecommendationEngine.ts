import type { Hero, Team } from '../types'
import { manualAnalysis, professionalMatchDatasets } from '../data'

export type BanRelevance='high'|'medium'|'low'
export type BanRecommendation={heroId:string;score:number;relevance:BanRelevance;reasons:string[];historicalWeight:number;phaseHistoricalWeight:number;banPhase:'first-two'|'last-two';protectsPlannedPick:boolean}
export type BanRecommendationContext={team:Team;stepIndex:number;plannedPickId?:string;usedHeroIds:Set<string>}

const sideName=(team:Team)=>team==='blue'?'藍方':'紅方'

export function recommendBans(candidates:Hero[],context:BanRecommendationContext):BanRecommendation[]{
  const history=professionalMatchDatasets.flatMap(dataset=>dataset.matches.map(match=>({match,weight:dataset.evidenceWeight})))
  const weightedCount=(heroId:string,team?:Team,range?:readonly [number,number])=>history.reduce((sum,{match,weight})=>{
    const sides:Team[]=team?[team]:['blue','red']
    return sum+sides.reduce((sideSum,side)=>sideSum+((range?match[side].bans.slice(range[0],range[1]).includes(heroId):match[side].bans.includes(heroId))?weight:0),0)
  },0)
  const available=candidates.filter(hero=>!context.usedHeroIds.has(hero.id))
  const maxOverall=Math.max(1,...available.map(hero=>weightedCount(hero.id)))
  const maxSide=Math.max(1,...available.map(hero=>weightedCount(hero.id,context.team)))
  const banPhase:'first-two'|'last-two'=context.stepIndex<4?'first-two':'last-two'
  const phaseRange:readonly [number,number]=banPhase==='first-two'?[0,2]:[2,4]
  const maxPhase=Math.max(1,...available.map(hero=>weightedCount(hero.id,context.team,phaseRange)))
  return available.map(hero=>{
    const overall=weightedCount(hero.id),side=weightedCount(hero.id,context.team),phase=weightedCount(hero.id,context.team,phaseRange)
    const threats=context.plannedPickId?manualAnalysis.matchups.filter(entry=>entry.targetId===context.plannedPickId&&entry.heroId===hero.id&&entry.score>=7):[]
    const protection=Math.min(3,threats.reduce((best,entry)=>Math.max(best,entry.score-5),0)*1.5)
    const score=Math.min(10,overall/maxOverall*1.4+side/maxSide*1.6+phase/maxPhase*4+protection)
    const reasons:string[]=[]
    if(threats.length){const planned=manualAnalysis.heroes[context.plannedPickId!]?.displayNameZhHant??context.plannedPickId;reasons.push(`${hero.id===context.plannedPickId?'此英雄':manualAnalysis.heroes[hero.id]?.displayNameZhHant??hero.id}已登記為${planned}的威脅；禁用可保護預定選角。`)}
    if(phase>0) reasons.push(`${sideName(context.team)}在職業賽${banPhase==='first-two'?'前兩個 ban':'後兩個 ban'}的階段權重為 ${phase.toFixed(1)}。`)
    if(side>0) reasons.push(`${sideName(context.team)}的整體加權禁用值為 ${side.toFixed(1)}。`)
    else if(overall>0) reasons.push(`此英雄在已登記職業賽曾被禁用，加權值為 ${overall.toFixed(1)}。`)
    if(!reasons.length) reasons.push('目前沒有足夠的歷史禁用或選角保護證據。')
    const relevance:BanRelevance=score>=6.5?'high':score>=3.5?'medium':'low'
    return {heroId:hero.id,score:+score.toFixed(1),relevance,reasons,historicalWeight:+overall.toFixed(1),phaseHistoricalWeight:+phase.toFixed(1),banPhase,protectsPlannedPick:threats.length>0}
  }).sort((a,b)=>b.score-a.score||b.historicalWeight-a.historicalWeight).slice(0,12)
}
