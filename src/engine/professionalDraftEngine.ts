import type { Team } from '../types'
import ikl from '../data/matches/2026/ikl-2026-spring-regular-season.json'
import kml from '../data/matches/2026/kml-2026-spring-playoffs.json'
import kpl from '../data/matches/2026/kpl-2026-spring-playoffs.json'
import kwc from '../data/matches/2026/kwc-2026-playoffs.json'
import mkl from '../data/matches/2026/mkl-2026-spring-regular-season.json'
import pkl from '../data/matches/2026/pkl-2026-spring-regular-season.json'

type HistoricalDraft={team:string;picks:string[];bans:string[]}
type HistoricalGame={winnerTeam:string;winnerSide:Team;draft:Record<Team,HistoricalDraft>}
type HistoricalSeries={teams:{name:string;region:string}[];winnerTeam:string;finalScore:Record<string,number>;games:HistoricalGame[]}
type HistoricalArchive={tournament:{id:string;name:string;stage:string;region:string};series:HistoricalSeries[]}
type DraftAction={team:Team;kind:'pick'|'ban';heroId:string}
export type ProfessionalDraftRecommendation={heroId:string;score:number;weightedEvidence:number;appearances:number;weightedWinRate:number|null;regions:string[];explanationZhHant:string;weightDetails:string[]}

const archives=[ikl,kml,kpl,kwc,mkl,pkl] as unknown as HistoricalArchive[]
const internationalTeamRegions:Record<string,string>={
  agal:'china',ksg:'china','aurora gaming':'malaysia',roc:'malaysia',geekay:'malaysia',btr:'indonesia',dmt:'indonesia',vp:'west',
}
const regionLabels:Record<string,string>={china:'中國',indonesia:'印尼',malaysia:'馬來西亞',philippines:'菲律賓',west:'西方',international:'國際'}

function achievementByRegion(){
  const result:Record<string,number>={china:.4,indonesia:.35,malaysia:.35,philippines:.3,west:.3,international:.5}
  const international=archives.find(archive=>archive.tournament.region==='international')
  if(!international) return result
  international.series.forEach((series,index)=>{
    const progress=(index+1)/international.series.length
    series.teams.forEach(team=>{const region=internationalTeamRegions[team.name.toLowerCase()];if(region)result[region]=Math.max(result[region]??0,progress)})
  })
  return result
}
const regionalAchievement=achievementByRegion()
const gamesByRegion=archives.reduce<Record<string,number>>((totals,archive)=>{totals[archive.tournament.region]=(totals[archive.tournament.region]??0)+archive.series.reduce((sum,series)=>sum+series.games.length,0);return totals},{})

function seriesCloseness(series:HistoricalSeries){
  const scores=Object.values(series.finalScore).sort((a,b)=>b-a),winner=scores[0]??1,loser=scores[1]??0
  return .75+.5*Math.min(1,loser/Math.max(1,winner))
}
function seriesPhase(archive:HistoricalArchive,index:number){
  const progress=(index+1)/Math.max(1,archive.series.length)
  return archive.tournament.stage.toLowerCase().includes('playoff')?.95+progress*.55:.85+progress*.2
}
function sampleStrength(region:string){return Math.max(.55,Math.min(1,Math.sqrt((gamesByRegion[region]??0)/100)))}
function regionStrength(region:string){return .8+(regionalAchievement[region]??.3)*.45}

export function calculateProfessionalSeriesWeight(input:{playoffs:boolean;progress:number;winnerWins:number;loserWins:number;regionAchievement:number}){
  const phase=input.playoffs?.95+input.progress*.55:.85+input.progress*.2
  const closeness=.75+.5*Math.min(1,input.loserWins/Math.max(1,input.winnerWins))
  const region=.8+input.regionAchievement*.45
  return phase*closeness*region
}

export function professionalArchiveSummary(){
  return {games:archives.reduce((sum,archive)=>sum+archive.series.reduce((count,series)=>count+series.games.length,0),0),series:archives.reduce((sum,archive)=>sum+archive.series.length,0),regions:new Set(archives.map(archive=>archive.tournament.region)).size,regionalAchievement}
}

export function recommendFromProfessionalGames(actions:DraftAction[],team:Team,kind:'pick'|'ban',used:Set<string>):ProfessionalDraftRecommendation[]{
  const allyPicks=actions.filter(action=>action.team===team&&action.kind==='pick').map(action=>action.heroId)
  const enemyPicks=actions.filter(action=>action.team!==team&&action.kind==='pick').map(action=>action.heroId)
  const selectedBans=actions.filter(action=>action.kind==='ban').map(action=>action.heroId)
  const stats=new Map<string,{weight:number;wins:number;exposure:number;appearances:number;regions:Set<string>;details:Map<string,number>}>()
  archives.forEach(archive=>archive.series.forEach((series,seriesIndex)=>{
    const phase=seriesPhase(archive,seriesIndex),closeness=seriesCloseness(series),regional=regionStrength(archive.tournament.region),sample=sampleStrength(archive.tournament.region)
    series.games.forEach(game=>{
      const own=game.draft[team],enemy=game.draft[team==='blue'?'red':'blue']
      const allyMatches=allyPicks.filter(id=>own.picks.includes(id)).length
      const enemyMatches=enemyPicks.filter(id=>enemy.picks.includes(id)).length
      const banMatches=selectedBans.filter(id=>own.bans.includes(id)||enemy.bans.includes(id)).length
      const context=(1+allyMatches*.42+enemyMatches*.5+banMatches*.12)/(1+Math.max(0,allyPicks.length+enemyPicks.length-allyMatches-enemyMatches)*.18)
      const won=game.winnerSide===team
      const base=phase*closeness*regional*sample*context
      const pool=kind==='pick'?own.picks:own.bans
      pool.forEach(heroId=>{
        if(used.has(heroId)) return
        const current=stats.get(heroId)??{weight:0,wins:0,exposure:0,appearances:0,regions:new Set<string>(),details:new Map<string,number>()}
        const outcome=kind==='pick'?(won?1.15:.85):1
        const weight=base*outcome
        current.weight+=weight;current.exposure+=base;current.wins+=won?base:0;current.appearances+=1;current.regions.add(archive.tournament.region)
        current.details.set('階段',Math.max(current.details.get('階段')??0,phase))
        current.details.set('系列賽接近度',Math.max(current.details.get('系列賽接近度')??0,closeness))
        current.details.set('賽區表現',Math.max(current.details.get('賽區表現')??0,regional))
        current.details.set('樣本充足度',Math.max(current.details.get('樣本充足度')??0,sample))
        stats.set(heroId,current)
      })
    })
  }))
  const max=Math.max(1,...[...stats.values()].map(item=>item.weight))
  return [...stats.entries()].map(([heroId,item])=>{
    const score=10*Math.sqrt(item.weight/max)
    const regions=[...item.regions].map(region=>regionLabels[region]??region)
    const weightedWinRate=kind==='pick'?item.wins/Math.max(.001,item.exposure)*100:null
    const explanationZhHant=kind==='pick'?`來自 ${item.appearances} 場職業選角；加權勝率 ${Math.min(100,weightedWinRate!).toFixed(1)}%。`:`來自 ${item.appearances} 場職業禁用，涵蓋 ${regions.join('、')}。`
    return {heroId,score:+score.toFixed(1),weightedEvidence:+item.weight.toFixed(2),appearances:item.appearances,weightedWinRate:weightedWinRate===null?null:+Math.min(100,weightedWinRate).toFixed(1),regions,explanationZhHant,weightDetails:[...item.details].map(([label,value])=>`${label} ×${value.toFixed(2)}`)}
  }).sort((a,b)=>b.score-a.score||b.appearances-a.appearances).slice(0,24)
}
