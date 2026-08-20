import { describe,expect,it } from 'vitest'
import { analyzeComposition } from './compositionEngine'
import { getGloballyUnavailableHeroes, validateSeriesPick } from './availabilityEngine'
import { calculateWinRate } from './statisticsEngine'
import { recommendPicks } from './recommendationEngine'
import type { Hero } from '../types'
import { heroes, manualAnalysis, getHero, getHeroDisplayName, getHeroesByLane } from '../data'
const hero=(tags:string[]):Hero=>({id:'test',name:'Test',aliases:[],image:'',roles:[],lanes:['farm'],primaryLane:'farm',damage:{primary:'unknown',secondary:null},tags,strengths:[],weaknesses:[],gamePhases:{early:'',mid:'',late:''},skills:{},patch:'unknown',updatedAt:'2026-08-19',sources:[]})
describe('composition engine',()=>it('derives dimensions from tags',()=>expect(analyzeComposition([hero(['engage'])]).scores.engage).toBe(2.5)))
describe('team-scoped global ban',()=>it('does not lock the opponent',()=>{const used={a:['arli'],b:[]};expect(getGloballyUnavailableHeroes(used,'a')).toEqual(['arli']);expect(validateSeriesPick('arli','b',used)).toBe(true)}))
describe('statistics',()=>it('keeps sample size visible',()=>expect(calculateWinRate([{result:'win',teams:{ally:[],enemy:[]}},{result:'loss',teams:{ally:[],enemy:[]}}])).toEqual({value:.5,sampleSize:2})))
describe('contextual recommendations',()=>{
  it('ranks Chano as a green counter against enemy Arli',()=>{
    const enemy=getHero('arli')!, candidates=getHeroesByLane('farm').filter(hero=>['chano','lady-sun'].includes(hero.id))
    const result=recommendPicks(candidates,[],[enemy],'farm',{team:'blue',draft:{blue:{},red:{farm:'arli'}}})
    expect(result[0].heroId).toBe('chano')
    expect(result[0].countering.map(item=>item.heroId)).toContain('arli')
  })
  it('marks Arli red when enemy Faith counters her',()=>{
    const result=recommendPicks([getHero('arli')!],[],[getHero('faith')!],'farm',{team:'blue',draft:{blue:{},red:{jungle:'faith'}}})
    expect(result[0].counteredBy.map(item=>item.heroId)).toContain('faith')
    expect(result[0].breakdown.matchup).toBeLessThan(5)
  })
  it('triggers Pei specifically against jungle Augran',()=>{
    const result=recommendPicks(getHeroesByLane('jungle'),[],[getHero('augran')!],'jungle',{team:'blue',draft:{blue:{},red:{jungle:'augran'}}})
    expect(result.find(item=>item.heroId==='pei')?.matchedRules).toContain('counter-jungle-augran-with-pei')
  })
  it('recommends Garuda after two allied tanks',()=>{
    const allies=[getHero('flowborn-tank')!,getHero('lian-po')!]
    const result=recommendPicks(getHeroesByLane('mid'),allies,[],'mid',{team:'blue',draft:{blue:{clash:'flowborn-tank',roamer:'lian-po'},red:{}}})
    expect(result.find(item=>item.heroId==='garuda')?.matchedRules).toContain('two-friendly-tanks-enable-garuda')
  })
  it('keeps reasonable matchup evidence yellow instead of green or red',()=>{
    const result=recommendPicks([getHero('devara')!],[],[getHero('faith')!],'clash',{team:'blue',draft:{blue:{},red:{clash:'faith'}}})
    expect(result[0].reasonable.map(item=>item.heroId)).toContain('faith')
    expect(result[0].countering).toHaveLength(0)
  })
  it('recommends Lu Bu against two enemy tanks',()=>{
    const enemies=[getHero('flowborn-tank')!,getHero('bai-qi')!]
    const result=recommendPicks(getHeroesByLane('clash'),[],enemies,'clash',{team:'blue',draft:{blue:{},red:{clash:'bai-qi',jungle:'flowborn-tank'}}})
    expect(result.find(item=>item.heroId==='lu-bu')?.ruleRecommendations.length).toBeGreaterThan(0)
  })
  it('recommends a carry jungler with allied mid Heino',()=>{
    const result=recommendPicks(getHeroesByLane('jungle'),[getHero('heino')!],[],'jungle',{team:'blue',draft:{blue:{mid:'heino'},red:{}}})
    expect(result.find(item=>item.heroId==='jing')?.matchedRules).toContain('heino-mid-enables-carry-jungle')
  })
})
describe('manual draft knowledge',()=>{
  it('validates every referenced hero',()=>expect(Object.keys(manualAnalysis.heroes)).toHaveLength(68))
  it('exposes every registered hero to the frontend catalog',()=>expect(heroes.map(hero=>hero.id).sort()).toEqual(Object.keys(manualAnalysis.heroes).sort()))
  it('provides Traditional Chinese display names',()=>expect(getHeroDisplayName('haya')).toBe('海月'))
  it('keeps Flowborn forms separate',()=>expect(manualAnalysis.heroes['flowborn-tank'].roles).not.toEqual(manualAnalysis.heroes['flowborn-marksman'].roles))
  it('records Pei only against jungle Augran',()=>expect(manualAnalysis.draftRules.find(rule=>rule.id==='counter-enemy-jungle-augran-with-pei')?.conditions).toContain('敵方 Augran 位於打野'))
  it('records Dun as Yang Jian ally',()=>expect(manualAnalysis.draftRules.find(rule=>rule.id==='yang-jian-clash-with-dun-jungle')?.rationale).toContain('這是同隊搭配，不是 counter'))
  it('keeps multi-lane heroes available in both registered positions',()=>{
    expect(manualAnalysis.heroes.ata.lanes).toEqual(['clash','jungle'])
    expect(manualAnalysis.heroes['da-qiao'].lanes).toEqual(['mid','roamer'])
    expect(manualAnalysis.heroes.umbrosa.lanes).toEqual(['clash'])
  })
  it('uses confirmed Traditional Chinese hero names',()=>{
    expect(getHeroDisplayName('umbrosa')).toBe('影')
    expect(getHeroDisplayName('faith')).toBe('曹操')
  })
  it('registers Yuhuan for mid and roamer',()=>expect(manualAnalysis.heroes.yuhuan.lanes).toEqual(['mid','roamer']))
  it('keeps corrected heroes exclusively in their registered lanes',()=>{
    expect(manualAnalysis.heroes.chicha.lanes).toEqual(['farm'])
    expect(getHeroDisplayName('chicha')).toBe('叱吒')
    expect(manualAnalysis.heroes['ukyo-tachibana'].lanes).toEqual(['jungle'])
    expect(manualAnalysis.heroes.liang.lanes).toEqual(['roamer'])
  })
  it('returns only heroes registered for the requested lane',()=>{
    expect(getHeroesByLane('mid').every(hero=>hero.lanes.includes('mid'))).toBe(true)
    expect(getHeroesByLane('roamer').some(hero=>hero.id==='yuhuan')).toBe(true)
    expect(getHeroesByLane('clash').some(hero=>hero.id==='da-qiao')).toBe(false)
  })
})
