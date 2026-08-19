import type { DraftState, Lane, Team } from '../types'
export const emptyDraft=():DraftState=>({blue:{},red:{}})
export const loadDraft=():DraftState=>{try{return JSON.parse(localStorage.getItem('hok-current-draft')||'null')||emptyDraft()}catch{return emptyDraft()}}
export const saveDraft=(draft:DraftState)=>localStorage.setItem('hok-current-draft',JSON.stringify(draft))
export const applyPick=(draft:DraftState,team:Team,lane:Lane,heroId:string):DraftState=>({...draft,[team]:{...draft[team],[lane]:heroId}})
export const removePick=(draft:DraftState,team:Team,lane:Lane):DraftState=>{const next={...draft,[team]:{...draft[team]}};delete next[team][lane];return next}
