import { describe,expect,it } from 'vitest'
import { analyzeComposition } from './compositionEngine'
import { getGloballyUnavailableHeroes, validateSeriesPick } from './availabilityEngine'
import { calculateWinRate } from './statisticsEngine'
import type { Hero } from '../types'
const hero=(tags:string[]):Hero=>({id:'test',name:'Test',aliases:[],image:'',roles:[],lanes:['farm'],primaryLane:'farm',damage:{primary:'unknown',secondary:null},tags,strengths:[],weaknesses:[],gamePhases:{early:'',mid:'',late:''},skills:{},patch:'unknown',updatedAt:'2026-08-19',sources:[]})
describe('composition engine',()=>it('derives dimensions from tags',()=>expect(analyzeComposition([hero(['engage'])]).scores.engage).toBe(2.5)))
describe('team-scoped global ban',()=>it('does not lock the opponent',()=>{const used={a:['arli'],b:[]};expect(getGloballyUnavailableHeroes(used,'a')).toEqual(['arli']);expect(validateSeriesPick('arli','b',used)).toBe(true)}))
describe('statistics',()=>it('keeps sample size visible',()=>expect(calculateWinRate([{result:'win',teams:{ally:[],enemy:[]}},{result:'loss',teams:{ally:[],enemy:[]}}])).toEqual({value:.5,sampleSize:2})))
