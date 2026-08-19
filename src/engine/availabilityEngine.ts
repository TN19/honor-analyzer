import type { DraftState, Hero, Team } from '../types'
export const getAvailableHeroes=(heroes:Hero[],draft:DraftState)=>{const used=new Set([...Object.values(draft.blue),...Object.values(draft.red)]);return heroes.filter(h=>!used.has(h.id))}
export const getGloballyUnavailableHeroes=(usedHeroesByTeam:Record<string,string[]>,teamId:string)=>[...(usedHeroesByTeam[teamId]??[])]
export const isHeroAvailable=(id:string,heroes:Hero[],draft:DraftState,teamId?:string,used?:Record<string,string[]>)=>getAvailableHeroes(heroes,draft).some(h=>h.id===id)&&(!teamId||!used?.[teamId]?.includes(id))
export const validateSeriesPick=(heroId:string,teamId:string,used:Record<string,string[]>)=>!getGloballyUnavailableHeroes(used,teamId).includes(heroId)
