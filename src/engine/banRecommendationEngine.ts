import type { Hero, Team } from '../types'
import { manualAnalysis, professionalMatchDatasets } from '../data'

export type BanRelevance='high'|'medium'|'low'
export type BanRecommendation={heroId:string;score:number;relevance:BanRelevance;reasons:string[];historicalWeight:number;protectsPlannedPick:boolean}
export type BanRecommendationContext={team:Team;stepIndex:number;plannedPickId?:string;usedHeroIds:Set<string>}

const sideName=(team:Team)=>team==='blue'?'藍方':'紅方'

export function recommendBans(candidates:Hero[],context:BanRecommendationContext):BanRecommendation[]{
  const history=professionalMatchDatasets.flatMap(dataset=>dataset.matches.map(match=>({match,weight:dataset.evidenceWeight})))
  const weightedCount=(heroId:string,team?:Team,firstOnly=false)=>history.reduce((sum,{match,weight})=>{
    const sides:Team[]=team?[team]:['blue','red']
    return sum+sides.reduce((sideSum,side)=>sideSum+((firstOnly?match[side].bans[0]===heroId:match[side].bans.includes(heroId))?weight:0),0)
  },0)
  const available=candidates.filter(hero=>!context.usedHeroIds.has(hero.id))
  const maxOverall=Math.max(1,...available.map(hero=>weightedCount(hero.id)))
  const maxSide=Math.max(1,...available.map(hero=>weightedCount(hero.id,context.team)))
  const firstBan=context.stepIndex<4
  const maxFirst=Math.max(1,...available.map(hero=>weightedCount(hero.id,context.team,true)))
  return available.map(hero=>{
    const overall=weightedCount(hero.id),side=weightedCount(hero.id,context.team),first=firstBan?weightedCount(hero.id,context.team,true):0
    const threats=context.plannedPickId?manualAnalysis.matchups.filter(entry=>entry.targetId===context.plannedPickId&&entry.heroId===hero.id&&entry.score>=7):[]
    const protection=Math.min(3,threats.reduce((best,entry)=>Math.max(best,entry.score-5),0)*1.5)
    const score=Math.min(10,overall/maxOverall*3.2+side/maxSide*2.2+first/maxFirst*1.1+protection)
    const reasons:string[]=[]
    if(threats.length){const planned=manualAnalysis.heroes[context.plannedPickId!]?.displayNameZhHant??context.plannedPickId;reasons.push(`${hero.id===context.plannedPickId?'此英雄':manualAnalysis.heroes[hero.id]?.displayNameZhHant??hero.id}已登記為${planned}的威脅；禁用可保護預定選角。`)}
    if(side>0) reasons.push(`${sideName(context.team)}在已登記職業賽的加權禁用值為 ${side.toFixed(1)}。`)
    else if(overall>0) reasons.push(`此英雄在已登記職業賽曾被禁用，加權值為 ${overall.toFixed(1)}。`)
    if(first>0) reasons.push(`${sideName(context.team)}曾將此英雄放在第一禁用。`)
    if(!reasons.length) reasons.push('目前沒有足夠的歷史禁用或選角保護證據。')
    const relevance:BanRelevance=score>=6.5?'high':score>=3.5?'medium':'low'
    return {heroId:hero.id,score:+score.toFixed(1),relevance,reasons,historicalWeight:+overall.toFixed(1),protectsPlannedPick:threats.length>0}
  }).sort((a,b)=>b.score-a.score||b.historicalWeight-a.historicalWeight).slice(0,12)
}
