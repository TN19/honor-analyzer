import type { Hero } from '../types'
const dimensions:Record<string,string[]> = {frontline:['tank','frontline'],engage:['engage','initiator'],peel:['peel','shield','heal'],controle:['stun','knockup','root','silence'],mobilidade:['mobility','dash','blink'],sustentacao:['sustain','heal'],poke:['poke'],burst:['burst'],danoContinuo:['sustained-damage','marksman','carry'],mapa:['wave-clear','split-push','objective-control']}
export function analyzeComposition(heroes:Hero[]) {
  const scores = Object.fromEntries(Object.entries(dimensions).map(([key,tags]) => [key, Math.min(10, heroes.reduce((sum,h) => sum + (tags.some(t => h.tags.includes(t) || h.roles.includes(t)) ? 2.5 : 0),0))]))
  const needs = Object.entries(scores).filter(([,v]) => v < 4).map(([k]) => k)
  const strengths = Object.entries(scores).filter(([,v]) => v >= 7).map(([k]) => k)
  return {scores,needs,strengths,confidence:heroes.length ? Math.min(.8,.25 + heroes.length*.1) : 0}
}
