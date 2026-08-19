export type Match={result:'win'|'loss'|'unknown';teams:{ally:{heroId:string;playerId?:string;lane?:string}[];enemy:{heroId:string;playerId?:string;lane?:string}[]}}
export const calculateWinRate=(matches:Match[])=>{const decided=matches.filter(m=>m.result!=='unknown');return {value:decided.length?decided.filter(m=>m.result==='win').length/decided.length:0,sampleSize:decided.length}}
export const calculateHeroWinRate=(matches:Match[],heroId:string)=>calculateWinRate(matches.filter(m=>m.teams.ally.some(p=>p.heroId===heroId)))
