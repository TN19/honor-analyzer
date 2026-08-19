import type { DraftState, Hero, Lane, Recommendation, RecommendationEvidence, Team } from '../types'
import { manualAnalysis, recommendationRules } from '../data'
import type { RecommendationRule } from '../schemas/recommendationRules.schema'
import { analyzeComposition } from './compositionEngine'

export const defaultWeights = {synergy:.30,matchup:.25,compositionNeed:.20,archetypeFit:.15,meta:.10}
const tagNeed:Record<string,string[]> = {frontline:['tank','frontline'],engage:['engage','initiator'],peel:['peel','shield','heal'],controle:['stun','knockup','root','silence'],mobilidade:['mobility','dash','blink'],sustentacao:['sustain','heal'],poke:['poke'],burst:['burst'],danoContinuo:['sustained-damage','marksman','carry'],mapa:['wave-clear','split-push','objective-control']}
const needLabels:Record<string,string> = {frontline:'前排',engage:'開團',peel:'保護',controle:'控制',mobilidade:'機動性',sustentacao:'續航',poke:'消耗',burst:'爆發',danoContinuo:'持續傷害',mapa:'地圖控制'}
const clamp=(value:number)=>Math.max(0,Math.min(10,value))

export type RecommendationContext = { draft:DraftState; team:Team }

function conditionMatches(rule:RecommendationRule, context:RecommendationContext, allies:Hero[], enemies:Hero[]) {
  const when=rule.when
  const allyIds=new Set(allies.map(hero=>hero.id)), enemyIds=new Set(enemies.map(hero=>hero.id))
  const enemyTeam=context.team==='blue'?'red':'blue'
  if(when.allyAll && !when.allyAll.every(id=>allyIds.has(id))) return false
  if(when.enemyAll && !when.enemyAll.every(id=>enemyIds.has(id))) return false
  if(when.enemyAny && !when.enemyAny.some(id=>enemyIds.has(id))) return false
  if(when.allySlot && context.draft[context.team][when.allySlot.lane]!==when.allySlot.heroId) return false
  if(when.enemySlot && context.draft[enemyTeam][when.enemySlot.lane]!==when.enemySlot.heroId) return false
  if(when.allyRoleAtLeast && allies.filter(hero=>hero.roles.includes(when.allyRoleAtLeast!.role)).length<when.allyRoleAtLeast.count) return false
  return true
}

function evidenceForCandidate(candidate:Hero, allies:Hero[], enemies:Hero[], lane:Lane) {
  const enemyIds=new Set(enemies.map(hero=>hero.id)), allyIds=new Set(allies.map(hero=>hero.id))
  const countering:RecommendationEvidence[]=manualAnalysis.matchups.filter(entry=>entry.heroId===candidate.id&&enemyIds.has(entry.targetId)&&(!entry.lane||entry.lane===lane)).map(entry=>({heroId:entry.targetId,score:entry.score,reason:entry.reasons[0]??'已登記為有利對局。'}))
  const counteredBy:RecommendationEvidence[]=manualAnalysis.matchups.filter(entry=>entry.targetId===candidate.id&&enemyIds.has(entry.heroId)&&(!entry.lane||entry.lane===lane)).map(entry=>({heroId:entry.heroId,score:entry.score,reason:entry.reasons[0]??'敵方英雄已登記為此選擇的反制。'}))
  const synergyWith:RecommendationEvidence[]=manualAnalysis.synergies.filter(entry=>entry.heroIds.includes(candidate.id)&&entry.heroIds.some(id=>id!==candidate.id&&allyIds.has(id))).flatMap(entry=>entry.heroIds.filter(id=>id!==candidate.id&&allyIds.has(id)).map(heroId=>({heroId,score:entry.score,reason:entry.reasons[0]??entry.conditions[0]??'已登記為協同組合。'})))
  return {countering,counteredBy,synergyWith}
}

export function recommendPicks(candidates:Hero[], allies:Hero[], enemies:Hero[], lane:Lane, context?:RecommendationContext):Recommendation[] {
  const analysis=analyzeComposition(allies)
  return candidates.filter(h=>h.lanes.includes(lane)).map(hero=>{
    const covered=analysis.needs.filter(n=>tagNeed[n]?.some(t=>hero.tags.includes(t)||hero.roles.includes(t)))
    const compositionNeed=covered.length ? Math.min(10,5+covered.length*1.5) : 5
    const evidence=evidenceForCandidate(hero,allies,enemies,lane)
    const synergyValues=evidence.synergyWith.map(item=>item.score)
    const synergy=synergyValues.length?clamp(synergyValues.reduce((a,b)=>a+b,0)/synergyValues.length):5
    const matchupDelta=evidence.countering.reduce((sum,item)=>sum+(item.score-5),0)-evidence.counteredBy.reduce((sum,item)=>sum+(item.score-5),0)
    const matchup=clamp(5+matchupDelta)
    const matchingRules=context?recommendationRules.filter(rule=>rule.candidateLane===undefined||rule.candidateLane===lane).filter(rule=>conditionMatches(rule,context,allies,enemies)).filter(rule=>(rule.recommendHeroIds?.includes(hero.id)??false)||(rule.recommendRoles?.some(role=>hero.roles.includes(role))??false)):[]
    const ruleBoost=matchingRules.reduce((sum,rule)=>sum+rule.scoreBoost,0)
    const archetypeFit=clamp(5+ruleBoost), meta=hero.metaScore ?? 5
    const baseScore=synergy*.3+matchup*.25+compositionNeed*.2+archetypeFit*.15+meta*.1
    const finalScore=clamp(baseScore+Math.min(1.5,ruleBoost*.35))
    const reasons=[...matchingRules.map(rule=>rule.explanationZhHant)]
    if(evidence.countering.length) reasons.push(`可反制 ${evidence.countering.map(item=>manualAnalysis.heroes[item.heroId]?.displayNameZhHant??item.heroId).join('、')}。`)
    if(evidence.synergyWith.length) reasons.push(`可配合 ${evidence.synergyWith.map(item=>manualAnalysis.heroes[item.heroId]?.displayNameZhHant??item.heroId).join('、')}。`)
    if(!reasons.length) reasons.push(covered.length?`補足目前需求：${covered.map(key=>needLabels[key]).join('、')}。`:'符合此分路；目前沒有觸發額外的手動規則。')
    const warnings=evidence.counteredBy.length?[`注意：會被 ${evidence.counteredBy.map(item=>manualAnalysis.heroes[item.heroId]?.displayNameZhHant??item.heroId).join('、')} 反制。`]:[]
    if(!allies.length) warnings.push('尚未選擇隊友：協同評分暫為中立。')
    if(!enemies.length) warnings.push('尚未選擇敵方英雄：對線評分暫為中立。')
    if(hero.patch==='unknown') warnings.push('資料版本尚未確認。')
    const evidenceCount=evidence.countering.length+evidence.counteredBy.length+evidence.synergyWith.length+matchingRules.length
    return {heroId:hero.id,lane,finalScore:+finalScore.toFixed(1),confidence:Math.min(.85,.3+evidenceCount*.08),breakdown:{synergy,matchup,compositionNeed,archetypeFit,meta},reasons,warnings,countering:evidence.countering,counteredBy:evidence.counteredBy,synergyWith:evidence.synergyWith,matchedRules:matchingRules.map(rule=>rule.id)}
  }).sort((a,b)=>b.finalScore-a.finalScore)
}
