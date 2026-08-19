import { describe,expect,it } from 'vitest'
import { analyzeComposition } from './compositionEngine'
import { getGloballyUnavailableHeroes, validateSeriesPick } from './availabilityEngine'
import { calculateWinRate } from './statisticsEngine'
import type { Hero } from '../types'
import { heroes, manualAnalysis, getHeroDisplayName } from '../data'
const hero=(tags:string[]):Hero=>({id:'test',name:'Test',aliases:[],image:'',roles:[],lanes:['farm'],primaryLane:'farm',damage:{primary:'unknown',secondary:null},tags,strengths:[],weaknesses:[],gamePhases:{early:'',mid:'',late:''},skills:{},patch:'unknown',updatedAt:'2026-08-19',sources:[]})
describe('composition engine',()=>it('derives dimensions from tags',()=>expect(analyzeComposition([hero(['engage'])]).scores.engage).toBe(2.5)))
describe('team-scoped global ban',()=>it('does not lock the opponent',()=>{const used={a:['arli'],b:[]};expect(getGloballyUnavailableHeroes(used,'a')).toEqual(['arli']);expect(validateSeriesPick('arli','b',used)).toBe(true)}))
describe('statistics',()=>it('keeps sample size visible',()=>expect(calculateWinRate([{result:'win',teams:{ally:[],enemy:[]}},{result:'loss',teams:{ally:[],enemy:[]}}])).toEqual({value:.5,sampleSize:2})))
describe('manual draft knowledge',()=>{
  it('validates every referenced hero',()=>expect(Object.keys(manualAnalysis.heroes).length).toBeGreaterThan(40))
  it('exposes every registered hero to the frontend catalog',()=>expect(heroes.map(hero=>hero.id).sort()).toEqual(Object.keys(manualAnalysis.heroes).sort()))
  it('provides Traditional Chinese display names',()=>expect(getHeroDisplayName('haya')).toBe('海月'))
  it('keeps Flowborn forms separate',()=>expect(manualAnalysis.heroes['flowborn-tank'].roles).not.toEqual(manualAnalysis.heroes['flowborn-marksman'].roles))
  it('records Pei only against jungle Augran',()=>expect(manualAnalysis.draftRules.find(rule=>rule.id==='counter-enemy-jungle-augran-with-pei')?.conditions).toContain('敵方 Augran 位於打野'))
  it('records Dun as Yang Jian ally',()=>expect(manualAnalysis.draftRules.find(rule=>rule.id==='yang-jian-clash-with-dun-jungle')?.rationale).toContain('這是同隊搭配，不是 counter'))
  it('keeps multi-lane heroes available in both registered positions',()=>{
    expect(manualAnalysis.heroes.ata.lanes).toEqual(['clash','jungle'])
    expect(manualAnalysis.heroes['da-qiao'].lanes).toEqual(['clash','roamer'])
    expect(manualAnalysis.heroes.umbrosa.lanes).toEqual(['clash','jungle'])
  })
})
