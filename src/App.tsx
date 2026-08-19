import { useEffect, useMemo, useState } from 'react'
import { heroes, getHero, getHeroDisplayName, isHeroLaneConfirmed } from './data'
import { analyzeComposition } from './engine/compositionEngine'
import { recommendPicks } from './engine/recommendationEngine'
import { applyPick, emptyDraft, loadDraft, removePick, saveDraft } from './store/draftStore'
import { lanes, type DraftState, type Lane, type RecommendationEvidence, type Team } from './types'
import version from './data/meta/version.json'

const laneLabels:Record<Lane,string>={clash:'對抗路',jungle:'打野',mid:'中路',farm:'發育路',roamer:'遊走'}
const roleLabels:Record<string,string>={marksman:'射手',tank:'坦克',mage:'法師',assassin:'刺客',fighter:'戰士',support:'輔助'}
const dimensionLabels:Record<string,string>={frontline:'前排',engage:'開團',peel:'保護',controle:'控制',mobilidade:'機動性',sustentacao:'續航',poke:'消耗',burst:'爆發',danoContinuo:'持續傷害',mapa:'地圖控制'}
const displayHeroName=(id:string,_name:string)=>getHeroDisplayName(id)
const displayPatch=(patch:string)=>patch==='unknown'?'待確認':patch
type Slot={team:Team;lane:Lane}

function Mark({name}:{name:string}) { return <div className="hero-mark" aria-hidden="true">{name.slice(0,2)}</div> }

function DraftSlot({team,lane,heroId,active,onSelect,onRemove}:{team:Team;lane:Lane;heroId?:string;active:boolean;onSelect:()=>void;onRemove:()=>void}) {
  const hero=heroId?getHero(heroId):undefined
  const displayName=hero?displayHeroName(hero.id,hero.name):''
  return <button className={`draft-slot ${active?'active':''} ${hero?'filled':''}`} onClick={onSelect} aria-label={`${laneLabels[lane]} ${team==='blue'?'蒼穹隊':'暮光隊'}`}>
    <span className="lane-icon">{laneLabels[lane].slice(0,1)}</span>
    {hero?<><Mark name={displayName}/><span className="slot-copy"><strong>{displayName}</strong><small>{laneLabels[lane]}</small></span><span className="remove" role="button" aria-label="移除英雄" onClick={e=>{e.stopPropagation();onRemove()}}>×</span></>:<span className="slot-copy"><strong>選擇英雄</strong><small>{laneLabels[lane]}</small></span>}
  </button>
}

function Composition({title,ids}:{title:string;ids:string[]}) {
  const analysis=analyzeComposition(ids.map(id=>getHero(id)).filter(Boolean) as NonNullable<ReturnType<typeof getHero>>[])
  const focus=['frontline','engage','controle','mobilidade','danoContinuo']
  return <section className="analysis-card"><div className="section-heading"><div><span className="eyebrow">戰術分析</span><h3>{title}</h3></div><span className="confidence">信心度 {Math.round(analysis.confidence*100)}%</span></div>
    <div className="meters">{focus.map(k=><div className="meter" key={k}><span>{dimensionLabels[k]}</span><div><i style={{width:`${analysis.scores[k]*10}%`}}/></div><b>{analysis.scores[k].toFixed(1)}</b></div>)}</div>
    <div className="insight"><span>◎</span><p>{ids.length?analysis.needs.length?`目前陣容資料仍缺少：${analysis.needs.slice(0,3).map(k=>dimensionLabels[k]).join('、')}。`:'此陣容已涵蓋目前評估的戰術面向。':'請填入英雄欄位，以查看優勢、缺口與陣容體系。'}</p></div>
  </section>
}

function EvidenceButton({tone,label,items}:{tone:'positive'|'negative';label:string;items:RecommendationEvidence[]}) {
  const [open,setOpen]=useState(false)
  if(!items.length) return null
  return <div className={`evidence ${tone}`}><button onClick={()=>setOpen(value=>!value)} aria-expanded={open}>{tone==='positive'?'✓':'!'} {label} · {items.length}</button>{open&&<div className="evidence-popover">{items.map(item=><div key={`${item.heroId}-${item.reason}`}><strong>{displayHeroName(item.heroId,item.heroId)}</strong><span>{item.reason}</span><b>{item.score.toFixed(1)}</b></div>)}</div>}</div>
}

export default function App(){
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
    <header><a className="brand" href="#"><span className="brand-glyph">BP</span><span><strong>BP 分析</strong><small>《王者榮耀》</small></span></a><nav><a className="active" href="#draft">自由選角</a><a href="#future">禁選模式 <em>即將推出</em></a><a href="#future">系列賽</a><a href="#future">對戰紀錄</a></nav><div className="status"><span className={online?'online':'offline'}/>{online?'已連線':'離線'}<b>版本 {displayPatch(version.currentPatch)}</b></div></header>
    <main>
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
          <div className="hero-list">{filtered.map(h=>{const name=displayHeroName(h.id,h.name),laneConfirmed=isHeroLaneConfirmed(h,slot.lane),laneText=h.lanes.length?h.lanes.map(l=>laneLabels[l]).join('、'):'位置待確認';return <button className={`hero-row ${laneConfirmed?'lane-confirmed':'lane-unconfirmed'}`} key={h.id} onClick={()=>choose(h.id)} title={laneConfirmed?'符合目前位置':'自由選角可手動放入；推薦引擎不會視為此位置候選'}><Mark name={name}/><span><strong>{name} <i>{h.name}</i></strong><small>{h.roles.length?h.roles.map(r=>roleLabels[r]??r).join(' · '):'角色待確認'} · {laneText} · 版本 {displayPatch(h.patch)}</small></span><b>{laneConfirmed?'＋':'○'}</b></button>})}{!filtered.length&&<div className="empty"><strong>沒有可用資料</strong><p>請加入通過驗證的英雄 JSON。系統不會自動捏造英雄資料。</p></div>}</div>
        </aside>
        <section className="recommendations"><div className="section-heading"><div><span className="eyebrow">最佳選擇</span><h3>可解釋推薦</h3></div><span className="formula">30 協同 · 25 對線 · 20 陣容 · 15 體系 · 10 強度</span></div>
          {recommendations.map((r,i)=>{const h=getHero(r.heroId)!,name=displayHeroName(h.id,h.name);return <article className={`rec-card ${r.countering.length?'has-counter':''} ${r.counteredBy.length?'has-risk':''}`} key={r.heroId}><span className="rank">0{i+1}</span><Mark name={name}/><div className="rec-main"><div><h4>{name}</h4><span className="confidence">信心度 {Math.round(r.confidence*100)}%</span></div><p>{r.reasons[0]}</p><div className="evidence-actions"><EvidenceButton tone="positive" label="反制敵方" items={r.countering}/><EvidenceButton tone="negative" label="遭到反制" items={r.counteredBy}/>{r.matchedRules.length>0&&<span className="rule-chip">◆ 觸發規則 {r.matchedRules.length}</span>}</div><small>⚠ {r.warnings[0]||'目前沒有登記其他風險。'}</small></div><div className="score"><b>{r.finalScore.toFixed(1)}</b><span>/ 10</span></div><button onClick={()=>choose(h.id)}>選擇</button></article>})}
          {!recommendations.length&&<div className="empty large"><span>◇</span><strong>沒有符合條件的英雄</strong><p>請選擇已有資料的分路，或在英雄目錄中加入新資料。</p></div>}
        </section>
      </section>
      <div className="analysis-grid"><Composition title="蒼穹隊" ids={Object.values(draft.blue) as string[]}/><Composition title="暮光隊" ids={Object.values(draft.red) as string[]}/></div>
    </main>
    <footer><span>資料集 v{version.datasetVersion}</span><span>本機資料 · 首次載入後可離線使用</span></footer>{toast&&<div className="toast">✓ {toast}</div>}
  </div>
}
