import { useEffect, useMemo, useState } from 'react'
import { heroes, getHero, getHeroDisplayName, isHeroLaneConfirmed } from './data'
import { analyzeComposition } from './engine/compositionEngine'
import { recommendAllHeroes, recommendPicks } from './engine/recommendationEngine'
import { recommendBans, type BanRecommendation } from './engine/banRecommendationEngine'
import { applyPick, emptyDraft, loadDraft, removePick, saveDraft } from './store/draftStore'
import { banPickSteps } from './store/banPickSequence'
import { lanes, type DraftState, type Lane, type Recommendation, type RecommendationEvidence, type Team } from './types'
import version from './data/meta/version.json'

const laneLabels:Record<Lane,string>={clash:'對抗路',jungle:'打野',mid:'中路',farm:'發育路',roamer:'遊走'}
const roleLabels:Record<string,string>={marksman:'射手',tank:'坦克',mage:'法師',assassin:'刺客',fighter:'戰士',support:'輔助'}
const dimensionLabels:Record<string,string>={frontline:'前排',engage:'開團',peel:'保護',controle:'控制',mobilidade:'機動性',sustentacao:'續航',poke:'消耗',burst:'爆發',danoContinuo:'持續傷害',mapa:'地圖控制'}
const displayHeroName=(id:string,_name:string)=>getHeroDisplayName(id)
const displayPatch=(patch:string)=>patch==='unknown'?'待確認':patch
type Slot={team:Team;lane:Lane}

function Mark({name,heroId}:{name:string;heroId?:string}) { const [failed,setFailed]=useState(false); return <div className="hero-mark" aria-hidden="true">{heroId&&!failed&&<img src={`${import.meta.env.BASE_URL}heroes/${heroId}.webp`} alt="" loading="lazy" onError={()=>setFailed(true)}/>}<span>{name.slice(0,2)}</span></div> }

function DraftSlot({team,lane,heroId,active,onSelect,onRemove}:{team:Team;lane:Lane;heroId?:string;active:boolean;onSelect:()=>void;onRemove:()=>void}) {
  const hero=heroId?getHero(heroId):undefined
  const displayName=hero?displayHeroName(hero.id,hero.name):''
  return <button className={`draft-slot ${active?'active':''} ${hero?'filled':''}`} onClick={onSelect} aria-label={`${laneLabels[lane]} ${team==='blue'?'蒼穹隊':'暮光隊'}`}>
    <span className="lane-icon">{laneLabels[lane].slice(0,1)}</span>
    {hero?<><Mark name={displayName} heroId={hero.id}/><span className="slot-copy"><strong>{displayName}</strong><small>{laneLabels[lane]}</small></span><span className="remove" role="button" aria-label="移除英雄" onClick={e=>{e.stopPropagation();onRemove()}}>×</span></>:<span className="slot-copy"><strong>選擇英雄</strong><small>{laneLabels[lane]}</small></span>}
  </button>
}

function Composition({title,ids}:{title:string;ids:string[]}) {
  const analysis=analyzeComposition(ids.map(id=>getHero(id)).filter(Boolean) as NonNullable<ReturnType<typeof getHero>>[])
  const focus=['frontline','engage','controle','mobilidade','danoContinuo']
  return <section className="analysis-card"><div className="section-heading"><div><span className="eyebrow">戰術分析</span><h3>{title}</h3></div></div>
    <div className="meters">{focus.map(k=><div className="meter" key={k}><span>{dimensionLabels[k]}</span><div><i style={{width:`${analysis.scores[k]*10}%`}}/></div><b>{analysis.scores[k].toFixed(1)}</b></div>)}</div>
    <div className="insight"><span>◎</span><p>{ids.length?analysis.needs.length?`目前陣容資料仍缺少：${analysis.needs.slice(0,3).map(k=>dimensionLabels[k]).join('、')}。`:'此陣容已涵蓋目前評估的戰術面向。':'請填入英雄欄位，以查看優勢、缺口與陣容體系。'}</p></div>
  </section>
}

function EvidenceButton({tone,label,items}:{tone:'positive'|'caution'|'negative';label:string;items:RecommendationEvidence[]}) {
  const [open,setOpen]=useState(false)
  if(!items.length) return null
  const icon=tone==='positive'?'✓':tone==='caution'?'◆':'!'
  return <div className={`evidence ${tone}`}><button onClick={()=>setOpen(value=>!value)} aria-expanded={open}>{icon} {label} · {items.length}</button>{open&&<div className="evidence-popover">{items.map(item=><div key={`${item.heroId}-${item.reason}`}><strong>{displayHeroName(item.heroId,item.heroId)}</strong><span>{item.reason}</span><b>{item.score.toFixed(1)}</b></div>)}</div>}</div>
}

type BanPickAction={team:Team;kind:'pick'|'ban';heroId:string}
const loadBanPick=():BanPickAction[]=>{try{const saved=JSON.parse(localStorage.getItem('hok-ban-pick-sequence')||'[]');return Array.isArray(saved)?saved:[]}catch{return []}}

function BanPickRecommendationList({title,tone,items,onChoose}:{title:string;tone:'positive'|'caution'|'negative';items:Recommendation[];onChoose:(id:string)=>void}){
  const evidence=(item:Recommendation)=>tone==='positive'?[...item.countering,...item.synergyWith,...item.ruleRecommendations]:tone==='caution'?item.reasonable:item.counteredBy
  return <section className={`bp-rec-group ${tone}`}><div className="bp-rec-title"><h3>{title}</h3><b>{items.length}</b></div><div className="bp-rec-list">{items.map(item=>{const hero=getHero(item.heroId)!,details=evidence(item);return <article className="bp-rec-row" key={item.heroId}><Mark name={displayHeroName(hero.id,hero.name)} heroId={hero.id}/><div><strong>{displayHeroName(hero.id,hero.name)}</strong><span>{details[0]?.reason}</span></div><em>{details.length}</em><button onClick={()=>onChoose(hero.id)}>選擇</button></article>})}{!items.length&&<p className="bp-none">目前沒有符合此分類的英雄。</p>}</div></section>
}

function BanSuggestionList({items,onChoose}:{items:BanRecommendation[];onChoose:(id:string)=>void}){
  const labels={high:'高關聯',medium:'中關聯',low:'低關聯'}
  return <div className="ban-suggestion-list">{items.map(item=>{const hero=getHero(item.heroId)!;return <article className={`ban-suggestion ${item.relevance}`} key={item.heroId}><Mark name={displayHeroName(hero.id,hero.name)} heroId={hero.id}/><div><strong>{displayHeroName(hero.id,hero.name)}</strong><span>{item.reasons[0]}</span><small>保護預定選角 · 已登記的英雄關係</small></div><b>{labels[item.relevance]}<em>{item.score.toFixed(1)}</em></b><button onClick={()=>onChoose(hero.id)}>禁用</button></article>})}{!items.length&&<p className="bp-none">請先指定預定選角；系統只會依已登記的英雄關係提出禁用建議。</p>}</div>
}

function BanPickMode(){
  const [history,setHistory]=useState<BanPickAction[]>(loadBanPick)
  const [query,setQuery]=useState('')
  const [laneFilter,setLaneFilter]=useState<Lane|'all'>('all')
  const [plannedPicks,setPlannedPicks]=useState<Partial<Record<Team,string>>>({})
  useEffect(()=>localStorage.setItem('hok-ban-pick-sequence',JSON.stringify(history)),[history])
  const current=banPickSteps[history.length],team=current?.team??'blue',used=new Set(history.map(action=>action.heroId))
  const catalog=heroes.filter(hero=>!used.has(hero.id)&&(laneFilter==='all'||hero.lanes.includes(laneFilter))&&`${displayHeroName(hero.id,hero.name)} ${hero.name}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>displayHeroName(a.id,a.name).localeCompare(displayHeroName(b.id,b.name),'zh-Hant'))
  const picks=(side:Team)=>history.filter(action=>action.team===side&&action.kind==='pick')
  const bans=(side:Team)=>history.filter(action=>action.team===side&&action.kind==='ban')
  const allies=picks(team).map(action=>getHero(action.heroId)).filter(Boolean) as NonNullable<ReturnType<typeof getHero>>[]
  const enemyTeam=team==='blue'?'red':'blue',enemies=picks(enemyTeam).map(action=>getHero(action.heroId)).filter(Boolean) as NonNullable<ReturnType<typeof getHero>>[]
  const draft:DraftState={blue:{},red:{}}
  const recommendations=useMemo(()=>recommendAllHeroes(catalog,allies,enemies,{team,draft,action:current?.kind,stepIndex:history.length}),[catalog,allies,enemies,team,current?.kind,history.length])
  const banSuggestions=useMemo(()=>current?.kind==='ban'?recommendBans(heroes,{team,stepIndex:history.length,plannedPickId:plannedPicks[team],usedHeroIds:used}):[],[current?.kind,team,history.length,plannedPicks,history])
  const green=recommendations.filter(item=>item.countering.length+item.synergyWith.length+item.ruleRecommendations.length>0)
  const yellow=recommendations.filter(item=>item.reasonable.length>0&&item.countering.length+item.synergyWith.length+item.ruleRecommendations.length===0)
  const red=recommendations.filter(item=>item.counteredBy.length>0)
  const choose=(heroId:string)=>{if(current)setHistory(actions=>[...actions,{...current,heroId}])}
  const undo=()=>setHistory(actions=>actions.slice(0,-1))
  const reset=()=>{setHistory([]);setPlannedPicks({})}
  const teamName=(side:Team)=>side==='blue'?'蒼穹隊':'暮光隊'
  const actionName=current?.kind==='ban'?'禁用':'選擇'
  const renderPickSlots=(side:Team)=>Array.from({length:5},(_,index)=>{const action=picks(side)[index],hero=action?getHero(action.heroId):undefined,isLast=action===history.at(-1);return <div className={`draft-slot bp-pick-slot ${hero?'filled':''}`} key={index}>{hero?<><Mark name={displayHeroName(hero.id,hero.name)} heroId={hero.id}/><span className="slot-copy"><strong>{displayHeroName(hero.id,hero.name)}</strong></span>{isLast&&<button className="remove" aria-label="撤銷上一步" onClick={undo}>×</button>}</>:<span className="slot-copy"><strong>選擇英雄</strong></span>}</div>})
  const renderBanSlots=(side:Team)=>Array.from({length:4},(_,index)=>{const action=bans(side)[index],hero=action?getHero(action.heroId):undefined,isLast=action===history.at(-1);return <div className={`bp-ban-slot ${hero?'filled':''}`} key={index}>{hero?<><Mark name={displayHeroName(hero.id,hero.name)} heroId={hero.id}/><strong>{displayHeroName(hero.id,hero.name)}</strong>{isLast&&<button aria-label="撤銷上一步" onClick={undo}>×</button>}</>:<span>禁用</span>}</div>})
  return <>
    <div className="hero-heading"><div><span className="eyebrow">完整禁選流程</span><h1>禁選模式</h1><p>系統會依正式順序自動切換藍紅雙方的禁用與選擇；英雄欄位不綁定分路。</p></div><div className="actions"><button className="ghost" onClick={undo} disabled={!history.length}>撤銷上一步</button><button className="ghost" onClick={reset}>全部清除</button></div></div>
    <div className={`bp-turn ${current?.kind??'complete'}`}><span>{current?`第 ${history.length+1}／${banPickSteps.length} 步`:'流程完成'}</span><strong>{current?`${teamName(team)} · ${actionName}英雄`:'雙方選角完成'}</strong><div><i style={{width:`${history.length/banPickSteps.length*100}%`}}/></div></div>
    <section className="draft-stage bp-sequence-board"><div className="team-head blue"><span>01</span><div><small>隊伍 A</small><h2>蒼穹隊</h2></div><b>{picks('blue').length}/5</b></div><div className="versus"><span>禁選</span><small>流程</small></div><div className="team-head red"><b>{picks('red').length}/5</b><div><small>隊伍 B</small><h2>暮光隊</h2></div><span>02</span></div><div className="bp-ban-row blue-bans">{renderBanSlots('blue')}</div><div className="bp-ban-row red-bans">{renderBanSlots('red')}</div><div className="slots blue-slots">{renderPickSlots('blue')}</div><div className="center-rune">◇</div><div className="slots red-slots">{renderPickSlots('red')}</div></section>
    {current?.kind==='ban'&&<section className="ban-advisor"><div className="section-heading"><div><span className="eyebrow">禁用決策</span><h2>建議禁用英雄</h2><p>僅依預定選角與已登記的反制關係提出建議；歷史賽事不參與分析。</p></div><label><span>預定下一個選角</span><select value={plannedPicks[team]??''} onChange={event=>setPlannedPicks(value=>({...value,[team]:event.target.value||undefined}))}><option value="">尚未指定</option>{heroes.filter(hero=>!used.has(hero.id)).map(hero=><option value={hero.id} key={hero.id}>{displayHeroName(hero.id,hero.name)}</option>)}</select></label></div><BanSuggestionList items={banSuggestions} onChoose={choose}/></section>}
    <section className="bp-picker"><div className="section-heading"><div><span className="eyebrow">{current?`${teamName(team)} · ${actionName}`:'禁選完成'}</span><h3>所有英雄</h3></div></div><label className="search"><span>⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜尋英雄…" aria-label="搜尋英雄"/></label><div className="lane-tabs bp-lane-filter"><button className={laneFilter==='all'?'active':''} onClick={()=>setLaneFilter('all')}>全部</button>{lanes.map(lane=><button className={laneFilter===lane?'active':''} onClick={()=>setLaneFilter(lane)} key={lane}>{laneLabels[lane]}</button>)}</div><div className="bp-catalog">{catalog.map(hero=><button className="bp-hero" disabled={!current} key={hero.id} onClick={()=>choose(hero.id)}><Mark name={displayHeroName(hero.id,hero.name)} heroId={hero.id}/><strong>{displayHeroName(hero.id,hero.name)}</strong><b>{current?.kind==='ban'?'禁':'＋'}</b></button>)}</div></section>
    <section className="bp-recommendations"><div className="section-heading"><div><span className="eyebrow">全部結果</span><h2>英雄關係推薦</h2></div><span className="formula">綠色優勢 · 黃色合理 · 紅色風險</span></div><div className="bp-rec-grid"><BanPickRecommendationList title="有利選擇" tone="positive" items={green} onChoose={choose}/><BanPickRecommendationList title="合理選擇" tone="caution" items={yellow} onChoose={choose}/><BanPickRecommendationList title="遭到反制" tone="negative" items={red} onChoose={choose}/></div></section>
  </>
}

export default function App(){
  const [mode,setMode]=useState<'free'|'bp'>('free')
  const [draft,setDraft]=useState<DraftState>(()=>loadDraft())
  const [slot,setSlot]=useState<Slot>({team:'blue',lane:'farm'})
  const [query,setQuery]=useState('')
  const [online,setOnline]=useState(navigator.onLine)
  const [toast,setToast]=useState('')
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);addEventListener('online',update);addEventListener('offline',update);return()=>{removeEventListener('online',update);removeEventListener('offline',update)}},[])
  const used=new Set([...Object.values(draft.blue),...Object.values(draft.red)])
  const filtered=heroes.filter(h=>isHeroLaneConfirmed(h,slot.lane)&&!used.has(h.id)&&(`${displayHeroName(h.id,h.name)} ${h.name}`.toLowerCase().includes(query.toLowerCase())||h.aliases.some(a=>a.toLowerCase().includes(query.toLowerCase())))).sort((a,b)=>displayHeroName(a.id,a.name).localeCompare(displayHeroName(b.id,b.name),'zh-Hant'))
  const allies=Object.values(draft[slot.team]).map(id=>getHero(id!)).filter(Boolean) as NonNullable<ReturnType<typeof getHero>>[]
  const enemies=Object.values(draft[slot.team==='blue'?'red':'blue']).map(id=>getHero(id!)).filter(Boolean) as NonNullable<ReturnType<typeof getHero>>[]
  const recommendations=useMemo(()=>recommendPicks(filtered,allies,enemies,slot.lane,{draft,team:slot.team}),[filtered,allies,enemies,slot.lane,draft,slot.team])
  const choose=(heroId:string)=>{setDraft(d=>applyPick(d,slot.team,slot.lane,heroId));const laneIndex=lanes.indexOf(slot.lane);if(laneIndex<lanes.length-1)setSlot({...slot,lane:lanes[laneIndex+1]})}
  const save=()=>{saveDraft(draft);setToast('選角已儲存於此裝置。');setTimeout(()=>setToast(''),2200)}
  const reset=()=>{setDraft(emptyDraft());setToast('選角已清除。');setTimeout(()=>setToast(''),1800)}
  return <div className="app-shell">
    <header><a className="brand" href="#"><span className="brand-glyph">BP</span><span><strong>BP 分析</strong><small>《王者榮耀》</small></span></a><nav><button className={mode==='free'?'active':''} onClick={()=>setMode('free')}>自由選角</button><button className={mode==='bp'?'active':''} onClick={()=>setMode('bp')}>禁選模式</button><a href="#future">系列賽</a><a href="#future">對戰紀錄</a></nav><div className="status"><span className={online?'online':'offline'}/>{online?'已連線':'離線'}<b>版本 {displayPatch(version.currentPatch)}</b></div></header>
    <main>{mode==='bp'?<BanPickMode/>:<>
      <div className="hero-heading"><div><span className="eyebrow">陣容實驗室</span><h1>自由選角</h1><p>配置雙方陣容、找出戰術缺口，並取得附帶證據與風險說明的推薦，而不只是一個分數。</p></div><div className="actions"><button className="ghost" onClick={reset}>清除</button><button className="primary" onClick={save}>儲存選角</button></div></div>
      <section className="draft-stage" id="draft">
        <div className="team-head blue"><span>01</span><div><small>隊伍 A</small><h2>蒼穹</h2></div><b>{Object.keys(draft.blue).length}/5</b></div>
        <div className="versus"><span>對戰</span><small>陣容</small></div>
        <div className="team-head red"><b>{Object.keys(draft.red).length}/5</b><div><small>隊伍 B</small><h2>暮光</h2></div><span>02</span></div>
        <div className="slots blue-slots">{lanes.map(l=><DraftSlot key={l} team="blue" lane={l} heroId={draft.blue[l]} active={slot.team==='blue'&&slot.lane===l} onSelect={()=>setSlot({team:'blue',lane:l})} onRemove={()=>setDraft(d=>removePick(d,'blue',l))}/>)}</div>
        <div className="center-rune">◇</div>
        <div className="slots red-slots">{lanes.map(l=><DraftSlot key={l} team="red" lane={l} heroId={draft.red[l]} active={slot.team==='red'&&slot.lane===l} onSelect={()=>setSlot({team:'red',lane:l})} onRemove={()=>setDraft(d=>removePick(d,'red',l))}/>)}</div>
      </section>
      <section className="workspace">
        <aside className="picker"><div className="section-heading"><div><span className="eyebrow">填入欄位</span><h3>{slot.team==='blue'?'蒼穹':'暮光'} · {laneLabels[slot.lane]}</h3></div></div><label className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋英雄或別名…" aria-label="搜尋英雄或別名"/></label><div className="lane-tabs">{lanes.map(l=><button className={slot.lane===l?'active':''} onClick={()=>setSlot({...slot,lane:l})} key={l}>{laneLabels[l]}</button>)}</div>
          <div className="hero-list">{filtered.map(h=>{const name=displayHeroName(h.id,h.name),laneConfirmed=isHeroLaneConfirmed(h,slot.lane),laneText=h.lanes.length?h.lanes.map(l=>laneLabels[l]).join('、'):'位置待確認';return <button className={`hero-row ${laneConfirmed?'lane-confirmed':'lane-unconfirmed'}`} key={h.id} onClick={()=>choose(h.id)} title={laneConfirmed?'符合目前位置':'自由選角可手動放入；推薦引擎不會視為此位置候選'}><Mark name={name} heroId={h.id}/><span><strong>{name} <i>{h.name}</i></strong><small>{h.roles.length?h.roles.map(r=>roleLabels[r]??r).join(' · '):'角色待確認'} · {laneText} · 版本 {displayPatch(h.patch)}</small></span><b>{laneConfirmed?'＋':'○'}</b></button>})}{!filtered.length&&<div className="empty"><strong>沒有可用資料</strong><p>請加入通過驗證的英雄 JSON。系統不會自動捏造英雄資料。</p></div>}</div>
        </aside>
        <section className="recommendations"><div className="section-heading"><div><span className="eyebrow">最佳選擇</span><h3>可解釋推薦</h3></div><span className="formula">30 協同 · 25 對線 · 20 陣容 · 15 體系 · 10 強度</span></div>
          {recommendations.map((r,i)=>{const h=getHero(r.heroId)!,name=displayHeroName(h.id,h.name),hasGreen=Boolean(r.countering.length+r.synergyWith.length+r.ruleRecommendations.length),reasonable=hasGreen?[]:r.reasonable;return <article className={`rec-card ${hasGreen?'has-counter':''} ${reasonable.length?'has-caution':''} ${r.counteredBy.length?'has-risk':''}`} key={r.heroId}><span className="rank">0{i+1}</span><Mark name={name} heroId={h.id}/><div className="rec-main"><div><h4>{name}</h4></div><p>{r.reasons[0]}</p><div className="evidence-actions"><EvidenceButton tone="positive" label="反制敵方" items={r.countering}/><EvidenceButton tone="positive" label="配合隊友" items={r.synergyWith}/><EvidenceButton tone="positive" label="陣容推薦" items={r.ruleRecommendations}/><EvidenceButton tone="caution" label="合理選擇" items={reasonable}/><EvidenceButton tone="negative" label="遭到反制" items={r.counteredBy}/></div><small>⚠ {r.warnings[0]||'目前沒有登記其他風險。'}</small></div><div className="score"><b>{r.finalScore.toFixed(1)}</b><span>/ 10</span></div><button onClick={()=>choose(h.id)}>選擇</button></article>})}
          {!recommendations.length&&<div className="empty large"><span>◇</span><strong>沒有符合條件的英雄</strong><p>請選擇已有資料的分路，或在英雄目錄中加入新資料。</p></div>}
        </section>
      </section>
      <div className="analysis-grid"><Composition title="蒼穹隊" ids={Object.values(draft.blue) as string[]}/><Composition title="暮光隊" ids={Object.values(draft.red) as string[]}/></div></>}
    </main>
    <footer><span>資料集 v{version.datasetVersion}</span><span>本機資料 · 首次載入後可離線使用</span></footer>{toast&&<div className="toast">✓ {toast}</div>}
  </div>
}
