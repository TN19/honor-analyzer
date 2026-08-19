import type { Hero, Lane, Recommendation } from '../types'
import { analyzeComposition } from './compositionEngine'
export const defaultWeights = {synergy:.30,matchup:.25,compositionNeed:.20,archetypeFit:.15,meta:.10}
const tagNeed:Record<string,string[]> = {frontline:['tank','frontline'],engage:['engage','initiator'],peel:['peel','shield','heal'],controle:['stun','knockup','root','silence'],mobilidade:['mobility','dash','blink'],sustentacao:['sustain','heal'],poke:['poke'],burst:['burst'],danoContinuo:['sustained-damage','marksman','carry'],mapa:['wave-clear','split-push','objective-control']}
const needLabels:Record<string,string> = {frontline:'前排',engage:'開團',peel:'保護',controle:'控制',mobilidade:'機動性',sustentacao:'續航',poke:'消耗',burst:'爆發',danoContinuo:'持續傷害',mapa:'地圖控制'}
export function recommendPicks(candidates:Hero[], allies:Hero[], enemies:Hero[], lane:Lane):Recommendation[] {
  const analysis=analyzeComposition(allies)
  return candidates.filter(h=>h.lanes.includes(lane)).map(hero=>{
    const covered=analysis.needs.filter(n=>tagNeed[n]?.some(t=>hero.tags.includes(t)||hero.roles.includes(t)))
    const compositionNeed=covered.length ? Math.min(10,5+covered.length*1.5) : 5
    const synergy=5, matchup=5, archetypeFit=5, meta=hero.metaScore ?? 5
    const finalScore=synergy*.3+matchup*.25+compositionNeed*.2+archetypeFit*.15+meta*.1
    const warnings:string[]=[]
    if(!allies.length) warnings.push('尚未選擇隊友：協同評分暫為中立。')
    if(!enemies.length) warnings.push('尚未選擇敵方英雄：對線評分暫為中立。')
    if(hero.patch==='unknown') warnings.push('資料版本尚未確認。')
    return {heroId:hero.id,lane,finalScore:+finalScore.toFixed(1),confidence:covered.length?.45:.3,breakdown:{synergy,matchup,compositionNeed,archetypeFit,meta},reasons:covered.length?[`補足目前需求：${covered.map(key=>needLabels[key]).join('、')}。`]:['符合此分路；目前缺少足夠證據來區分這個選擇。'],warnings}
  }).sort((a,b)=>b.finalScore-a.finalScore)
}
