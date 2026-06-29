import { useState, useEffect, useRef, useCallback } from "react"
import ProjectsScreen from "./Projects.jsx"
import Projetar from "./Projetar.jsx"
import Ferragens from "./Ferragens.jsx"
import { supabase } from "./supabase.js"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import {
  Home, Plus, Layers, Scissors, Clock, Bell, ChevronRight, Trash2,
  Check, RefreshCw, ArrowLeft, AlertTriangle, X, Zap, TrendingUp,
  Package, Info, CheckCircle, ChevronLeft, RotateCcw, Eye, BarChart2,
  ZoomIn, Search, Edit2, Maximize2, Grid, FolderOpen, DollarSign, Wrench, PenTool,
} from "lucide-react"

// ══════════════════════════════════════════════════════
// TOKENS
// ══════════════════════════════════════════════════════
const T = {
  green:"#22C55E",greenDark:"#15803D",greenLight:"#DCFCE7",
  dark:"#111A11",card:"#FFFFFF",bg:"#F0F4F0",
  border:"#E2E8E2",text:"#111827",textMid:"#4B5563",textMuted:"#9CA3AF",
  red:"#EF4444",redLight:"#FEF2F2",amber:"#F59E0B",amberLight:"#FFFBEB",
  sidebar:"#0D160D",
}
const COR={
  incolor:{label:"Incolor",bg:"#EFF6FF",dot:"#60A5FA",piece:"#B3D4F0",stroke:"#2563EB",pieceText:"#0F172A"},
  verde:{label:"Verde",bg:"#F0FDF4",dot:"#22C55E",piece:"#A8D5A2",stroke:"#16A34A",pieceText:"#0F172A"},
  fume:{label:"Fumê",bg:"#1F2937",dot:"#9CA3AF",piece:"#8A8A8A",stroke:"#4B5563",pieceText:"#FFFFFF"},
}

function useIsMobile(){
  const[m,setM]=useState(typeof window!=="undefined"?window.innerWidth<768:false)
  useEffect(()=>{const h=()=>setM(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h)},[])
  return m
}

// ══════════════════════════════════════════════════════
// DRAFT — salva rascunho da otimização no browser
// ══════════════════════════════════════════════════════
const DRAFT_KEY="otmglass_draft_v2"
const saveDraft=d=>{try{localStorage.setItem(DRAFT_KEY,JSON.stringify({...d,ts:Date.now()}))}catch(e){}}
const loadDraft=()=>{try{const d=localStorage.getItem(DRAFT_KEY);return d?JSON.parse(d):null}catch(e){return null}}
const clearDraft=()=>{try{localStorage.removeItem(DRAFT_KEY)}catch(e){}}

// ══════════════════════════════════════════════════════
// DATABASE
// ══════════════════════════════════════════════════════
const DB={
  async loadAll(){
    const[{data:chapas},{data:retalhos},{data:otimizacoes}]=await Promise.all([
      supabase.from("chapas").select("*").order("criado_em",{ascending:false}),
      supabase.from("retalhos").select("*").order("criado_em",{ascending:false}),
      supabase.from("otimizacoes").select("*").order("criado_em",{ascending:false}),
    ])
    return{chapas:chapas||[],retalhos:retalhos||[],otimizacoes:otimizacoes||[]}
  },
  chapas:{
    async insert(r){const{error}=await supabase.from("chapas").insert({...r,criado_em:Date.now()});if(error)throw error},
    async update(id,f){const{error}=await supabase.from("chapas").update(f).eq("id",id);if(error)throw error},
    async delete(id){const{error}=await supabase.from("chapas").delete().eq("id",id);if(error)throw error},
  },
  retalhos:{
    async insertMany(rows){if(!rows.length)return;const{error}=await supabase.from("retalhos").insert(rows.map(r=>({...r,criado_em:Date.now()})));if(error)throw error},
    async update(id,f){const{error}=await supabase.from("retalhos").update(f).eq("id",id);if(error)throw error},
    async delete(id){const{error}=await supabase.from("retalhos").delete().eq("id",id);if(error)throw error},
  },
  otimizacoes:{
    async insert(r){const{error}=await supabase.from("otimizacoes").insert({...r,criado_em:Date.now()});if(error)throw error},
  },
  pecas:{
    async insertMany(rows){if(!rows.length)return;const{error}=await supabase.from("otimizacao_pecas").insert(rows.map(r=>({...r,criado_em:Date.now()})));if(error)throw error},
    async getByOtimizacao(id){const{data,error}=await supabase.from("otimizacao_pecas").select("*").eq("otimizacao_id",id);if(error)throw error;return data||[]},
  },
}

// ══════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════
const uid=()=>([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16))
const genId=()=>"#OTM-"+uid()
const area_m2=(w,h)=>((w*h)/1e6).toFixed(2)
const int=v=>parseInt(v,10)||0
const fmt_date=ts=>new Date(ts).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})
const isToday=ts=>new Date(ts).toDateString()===new Date().toDateString()

// ══════════════════════════════════════════════════════
// MAXRECTS
// ══════════════════════════════════════════════════════
function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){return!(ax>=bx+bw||ax+aw<=bx||ay>=by+bh||ay+ah<=by)}
function isContained(i,o){return o.x<=i.x&&o.y<=i.y&&o.x+o.w>=i.x+i.w&&o.y+o.h>=i.y+i.h}

function packOneSheet(pieces,W,H){
  let free=[{x:0,y:0,w:W,h:H}]
  const placed=[],notPlaced=[]
  for(const p of pieces){
    const pw=int(p.w),ph=int(p.h)
    if(!pw||!ph)continue
    let b1=Infinity,b2=Infinity,bRect=null,bRot=false
    for(const r of free){
      if(pw<=r.w&&ph<=r.h){const s1=Math.min(r.w-pw,r.h-ph),s2=Math.max(r.w-pw,r.h-ph);if(s1<b1||(s1===b1&&s2<b2)){b1=s1;b2=s2;bRect=r;bRot=false}}
      if(ph<=r.w&&pw<=r.h){const s1=Math.min(r.w-ph,r.h-pw),s2=Math.max(r.w-ph,r.h-pw);if(s1<b1||(s1===b1&&s2<b2)){b1=s1;b2=s2;bRect=r;bRot=true}}
    }
    if(!bRect){notPlaced.push(p);continue}
    const fw=bRot?ph:pw,fh=bRot?pw:ph,px=bRect.x,py=bRect.y
    placed.push({x:px,y:py,pw:fw,ph:fh,rotated:bRot,ref:p})
    const nr=[]
    for(const r of free){
      if(!rectsOverlap(px,py,fw,fh,r.x,r.y,r.w,r.h)){nr.push(r);continue}
      if(r.x<px)nr.push({x:r.x,y:r.y,w:px-r.x,h:r.h})
      if(r.x+r.w>px+fw)nr.push({x:px+fw,y:r.y,w:r.x+r.w-px-fw,h:r.h})
      if(r.y<py)nr.push({x:r.x,y:r.y,w:r.w,h:py-r.y})
      if(r.y+r.h>py+fh)nr.push({x:r.x,y:py+fh,w:r.w,h:r.y+r.h-py-fh})
    }
    free=nr.filter((r,i)=>r.w>0&&r.h>0&&!nr.some((o,j)=>i!==j&&isContained(r,o)))
  }
  return{placed,notPlaced,freeRects:free}
}

// ── Motor aprimorado: testa múltiplas estratégias e retorna o melhor resultado ──
function packOneSheetBest(pieces,W,H){
  const score=r=>r.placed.reduce((s,p)=>s+p.pw*p.ph,0)*1000+r.placed.length
  const byArea=[...pieces].sort((a,b)=>b.w*b.h-a.w*a.h)
  const byLong=[...pieces].sort((a,b)=>Math.max(b.w,b.h)-Math.max(a.w,a.h))
  const byPerim=[...pieces].sort((a,b)=>(b.w+b.h)-(a.w+a.h))
  const byW=[...pieces].sort((a,b)=>b.w-a.w)
  const byH=[...pieces].sort((a,b)=>b.h-a.h)
  // Tenta girar 90° todas as peças antes de ordenar
  const rotated=[...pieces].map(p=>({...p,w:p.h,h:p.w,_prerot:true}))
  const byAreaRot=[...rotated].sort((a,b)=>b.w*b.h-a.w*a.h)
  const candidates=[byArea,byLong,byPerim,byW,byH,byAreaRot]
  let best=null
  for(const order of candidates){
    const r=packOneSheet(order,W,H)
    if(!best||score(r)>score(best))best=r
  }
  return best
}

function buildSheet(placed,freeRects,W,H,extra){
  const used=placed.reduce((s,p)=>s+p.pw*p.ph,0)
  const total=W*H
  const scraps=freeRects.filter(r=>r.w>=50&&r.h>=50)
  return{
    width:W,height:H,pieces:placed,
    freeRects:freeRects.filter(r=>r.w>=10&&r.h>=10),
    scraps,
    mainScrap:scraps.reduce((b,r)=>(!b||r.w*r.h>b.w*b.h)?r:b,null),
    efficiency:Math.round((used/total)*1000)/10,
    usedArea:used,totalArea:total,
    errors:[],
    ...extra,
  }
}

function runFullOptimization(pecas,chapas,retalhos,cor){
  const all=[]
  pecas.forEach(p=>{
    const W=int(p.largura),H=int(p.altura),Q=int(p.quantidade)
    if(!W||!H||!Q)return
    for(let i=0;i<Q;i++)all.push({w:W+4,h:H+4,origW:W,origH:H,pid:p.id||i})
  })
  if(!all.length)return[]
  all.sort((a,b)=>b.w*b.h-a.w*a.h)
  const results=[]
  let toPlace=[...all]
  const ch=chapas.filter(c=>c.cor===cor&&c.quantidade>0).reduce((b,c)=>(!b||c.largura*c.altura>b.largura*b.altura)?c:b,null)
  if(ch){
    let rem=[...toPlace]
    while(rem.length>0){
      const{placed,notPlaced,freeRects}=packOneSheetBest(rem,int(ch.largura),int(ch.altura))
      if(!placed.length)break
      results.push(buildSheet(placed,freeRects,int(ch.largura),int(ch.altura),{isRetalho:false}))
      rem=notPlaced
    }
    toPlace=[]
  }
  const rets=retalhos.filter(r=>r.status==="ativo"&&r.cor===cor).sort((a,b)=>a.largura*a.altura-b.largura*b.altura)
  for(const r of rets){
    if(!toPlace.length)break
    const rW=int(r.largura),rH=int(r.altura)
    const cands=toPlace.filter(p=>(p.w<=rW&&p.h<=rH)||(p.h<=rW&&p.w<=rH))
    if(!cands.length)continue
    const{placed,notPlaced,freeRects}=packOneSheetBest(cands,rW,rH)
    if(!placed.length)continue
    results.push(buildSheet(placed,freeRects,rW,rH,{isRetalho:true,retalhoId:r.id,retalhoLabel:"Retalho "+rW+"×"+rH}))
    const refs=new Set(placed.map(p=>p.ref))
    toPlace=toPlace.filter(p=>!refs.has(p))
  }
  return results
}

// ══════════════════════════════════════════════════════
// SVG DA CHAPA
// ══════════════════════════════════════════════════════
function SheetSVG({sheet,cor,maxW,onZoom,onPieceClick,selectedPieceIdx}){
  const W=maxW||480
  const sx2=W/sheet.width
  const svgH=Math.min(sheet.height*sx2,560)
  const sy2=svgH/sheet.height
  const sx=v=>Math.round(v*sx2)
  const sy=v=>Math.round(v*sy2)
  const c=COR[cor]||COR.incolor
  const sigScraps=[...sheet.freeRects].filter(r=>r.w>=60&&r.h>=60).sort((a,b)=>b.w*b.h-a.w*a.h)

  function renderLabel(x,y,w,h,lines,color,fw){
    if(w<12||h<12)return null
    const isV=h>w*1.3
    const fs=Math.max(8,Math.min(13,Math.min(w,h)*0.14))
    const lh=fs+3
    const cx=x+w/2,cy=y+h/2
    const transform=isV?`rotate(-90,${cx},${cy})`:undefined
    return(
      <g>
        {lines.map((line,i)=>(
          <text key={i} x={cx} y={cy-((lines.length-1)/2-i)*lh}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={fs} fill={color} fontFamily="monospace" fontWeight={fw||"700"}
            transform={transform} style={{userSelect:"none"}}>
            {line}
          </text>
        ))}
      </g>
    )
  }

  return(
    <div style={{position:"relative",borderRadius:10,overflow:"hidden"}}>
      <div style={{background:"#0D1A0D",padding:"8px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:12,color:"#9CA3AF",fontFamily:"monospace"}}>
          MAPA DE CORTE · {sheet.width}×{sheet.height} mm
          {sheet.isRetalho&&<span style={{color:T.amber,marginLeft:8}}>RETALHO</span>}
        </span>
        {onZoom&&(
          <button onClick={onZoom} style={{background:"#1A2A1A",border:"1px solid #2A3A2A",borderRadius:6,padding:"4px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,color:"#9CA3AF",fontSize:11}}>
            <ZoomIn size={13}/>Ampliar
          </button>
        )}
      </div>
      <svg width={W} height={svgH} style={{display:"block",background:"#0D1A0D"}}>
        <rect width={W} height={svgH} fill="#0D1A0D"/>
        {Array.from({length:25},(_,i)=><line key={"gv"+i} x1={Math.round(W*i/25)} y1={0} x2={Math.round(W*i/25)} y2={svgH} stroke="#142014" strokeWidth={0.5}/>)}
        {Array.from({length:20},(_,i)=><line key={"gh"+i} x1={0} y1={Math.round(svgH*i/20)} x2={W} y2={Math.round(svgH*i/20)} stroke="#142014" strokeWidth={0.5}/>)}
        <rect x={1} y={1} width={W-2} height={svgH-2} fill="none" stroke="#2A3A2A" strokeWidth={2}/>
        {sheet.freeRects.map((r,i)=>{
          const rw=sx(r.w),rh=sy(r.h)
          if(rw<4||rh<4)return null
          const idx=sigScraps.findIndex(s=>s===r)
          const isSig=idx>=0
          return(
            <g key={"f"+i}>
              <rect x={sx(r.x)} y={sy(r.y)} width={rw} height={rh}
                fill="#D1D5DB" fillOpacity={isSig?0.15:0.06}
                stroke={isSig?"#9CA3AF":"#3A4A3A"}
                strokeWidth={isSig?1.5:0.8} strokeDasharray={isSig?"7 3":"3 3"}/>
              {isSig&&rw>35&&rh>35&&renderLabel(sx(r.x),sy(r.y),rw,rh,
                ["Retalho "+(idx+1),Math.round(r.w)+"×"+Math.round(r.h),area_m2(r.w,r.h)+" m²"],
                "#EF4444","700")}
            </g>
          )
        })}
        {sheet.pieces.map((p,i)=>{
          const pw=sx(p.pw),ph=sy(p.ph)
          const oW=p.ref?p.ref.origW:p.pw-4,oH=p.ref?p.ref.origH:p.ph-4
          const isSelected=selectedPieceIdx===i
          return(
            <g key={"p"+i} onClick={onPieceClick?()=>onPieceClick(i):undefined} style={{cursor:onPieceClick?"pointer":"default"}}>
              <rect x={sx(p.x)+1} y={sy(p.y)+1} width={pw-2} height={ph-2}
                fill={c.piece} stroke={isSelected?"#FACC15":c.stroke} strokeWidth={isSelected?3:2} rx={2}/>
              {pw>20&&ph>16&&(
                <text x={sx(p.x)+5} y={sy(p.y)+11} fontSize={9} fill={c.pieceText+"88"} fontFamily="monospace" fontWeight="600">{i+1}</text>
              )}
              {pw>50&&ph>34&&renderLabel(sx(p.x)+1,sy(p.y)+1,pw-2,ph-2,
                [p.pw+"×"+p.ph,"("+oW+"×"+oH+")"],c.pieceText,"800")}
            </g>
          )
        })}
        <line x1={10} y1={svgH-8} x2={W-10} y2={svgH-8} stroke="#4B5563" strokeWidth={1}/>
        <text x={W/2} y={svgH-1} textAnchor="middle" fontSize={10} fill="#FFFFFF" fontFamily="monospace" fontWeight="600">Y = {sheet.width} mm</text>
        <line x1={8} y1={10} x2={8} y2={svgH-18} stroke="#4B5563" strokeWidth={1}/>
        <text x={14} y={svgH/2} fontSize={10} fill="#FFFFFF" fontFamily="monospace" fontWeight="600" transform={`rotate(-90,14,${svgH/2})`} textAnchor="middle">X = {sheet.height} mm</text>
      </svg>
      <div style={{background:"#0D1A0D",padding:"8px 14px",display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#9CA3AF"}}>
          <div style={{width:14,height:10,background:c.piece,border:"2px solid "+c.stroke,borderRadius:2}}/>Peça cortada
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#9CA3AF"}}>
          <div style={{width:14,height:10,background:"#D1D5DB30",border:"1.5px dashed #9CA3AF",borderRadius:2}}/>
          <span style={{color:"#EF4444"}}>Retalho/Sobra</span>
        </div>
        {sigScraps.length>0&&<span style={{fontSize:11,color:T.amber,fontWeight:600,marginLeft:"auto"}}>{sigScraps.length} retalho(s) gerado(s)</span>}
      </div>
    </div>
  )
}

function ZoomModal({sheet,cor,onClose}){
  const sw=typeof window!=="undefined"?window.innerWidth:800
  const maxW=sw-40
  return(
    <div style={{position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,0.95)",display:"flex",flexDirection:"column",overflow:"auto"}}>
      <div style={{display:"flex",justifyContent:"flex-end",padding:"16px 20px",flexShrink:0}}>
        <button onClick={onClose} style={{background:"#1A2A1A",border:"1px solid #2A3A2A",borderRadius:10,padding:"8px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,color:"#fff",fontSize:14,fontWeight:700}}>
          <X size={16}/>Fechar
        </button>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"0 20px 20px",overflowY:"auto"}}>
        <div style={{width:"100%",maxWidth:Math.min(maxW,1200)}}>
          <SheetSVG sheet={sheet} cor={cor} maxW={Math.min(maxW,1200)}/>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// UI ATOMS
// ══════════════════════════════════════════════════════
function Pill({cor}){
  const c=COR[cor]||{label:cor,bg:"#F3F4F6",dot:"#9CA3AF"}
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:5,background:c.bg,padding:"2px 10px",borderRadius:20,fontSize:12,fontWeight:600,color:T.text}}>
      <span style={{width:8,height:8,borderRadius:"50%",background:c.dot,flexShrink:0}}/>
      {c.label}
    </span>
  )
}

function StatCard({icon,label,value,sub,subColor,accent}){
  return(
    <div style={{background:T.card,borderRadius:16,padding:"18px 20px",flex:1,minWidth:0,boxShadow:"0 1px 6px rgba(0,0,0,0.08)",borderLeft:accent?"4px solid "+accent:"none"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <span style={{color:accent||T.green}}>{icon}</span>
        <span style={{fontSize:12,color:T.textMuted,fontWeight:500}}>{label}</span>
      </div>
      <div style={{fontSize:26,fontWeight:800,color:T.text,lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:subColor||T.green,marginTop:5,fontWeight:500}}>{sub}</div>}
    </div>
  )
}

function Btn({children,onClick,variant,size,fullWidth,icon,disabled,style}){
  const v=variant||"primary",s=size||"md"
  const vs={primary:{background:disabled?"#9CA3AF":T.green,color:"#fff",border:"none"},secondary:{background:"transparent",color:T.green,border:"2px solid "+T.green},ghost:{background:"transparent",color:T.textMid,border:"none"},danger:{background:T.redLight,color:T.red,border:"2px solid "+T.red}}
  const ps={sm:"6px 14px",md:"11px 20px",lg:"14px 26px"}
  const fz={sm:12,md:14,lg:15}
  return(
    <button onClick={onClick} disabled={disabled}
      style={{...(vs[v]||vs.primary),padding:ps[s]||ps.md,fontSize:fz[s]||fz.md,borderRadius:10,fontWeight:700,cursor:disabled?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,width:fullWidth?"100%":"auto",transition:"all .15s",...(style||{})}}>
      {icon&&<span style={{display:"flex"}}>{icon}</span>}
      {children}
    </button>
  )
}

// ══════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════
// Modal de escolha do tipo de otimização
function OptModal({ navigate }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ marginTop: 16, background: T.green, color: "#fff", border: "none", borderRadius: 12, padding: "12px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
        <Plus size={18} /> Nova Otimização
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setOpen(false)}>
          <div style={{ background: T.card, borderRadius: "20px 20px 0 0", padding: "28px 24px 40px", width: "100%", maxWidth: 560 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: T.border, borderRadius: 2, margin: "0 auto 24px" }} />
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Nova Otimização</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 24 }}>Escolha o tipo de otimização</div>

            {/* Automática */}
            <button onClick={() => { setOpen(false); navigate("new-opt") }}
              style={{ width: "100%", background: T.green, color: "#fff", border: "none", borderRadius: 14, padding: "18px 20px", marginBottom: 12, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Zap size={22} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Automática</div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Algoritmo otimiza automaticamente o aproveitamento máximo</div>
              </div>
              <ChevronRight size={20} style={{ marginLeft: "auto", opacity: 0.7 }} />
            </button>

            {/* Manual */}
            <button onClick={() => { setOpen(false); navigate("manual-opt") }}
              style={{ width: "100%", background: "#fff", color: T.text, border: "2px solid " + T.green, borderRadius: 14, padding: "18px 20px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: T.greenLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Grid size={22} color={T.greenDark} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.greenDark }}>Manual Assistida</div>
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Operador define o posicionamento com assistência do sistema</div>
              </div>
              <ChevronRight size={20} color={T.green} style={{ marginLeft: "auto" }} />
            </button>

            <button onClick={() => setOpen(false)}
              style={{ width: "100%", background: "none", border: "none", marginTop: 18, cursor: "pointer", fontSize: 14, color: T.textMuted, fontWeight: 600 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Dashboard({data,navigate}){
  const[filter,setFilter]=useState("semanal")
  const totalChapas=data.chapas.reduce((s,c)=>s+c.quantidade,0)
  const retAtivos=data.retalhos.filter(r=>r.status==="ativo").length
  const hoje=data.otimizacoes.filter(o=>isToday(o.criado_em||o.criadoEm))
  const m2hoje=hoje.reduce((s,o)=>s+(o.area_total||o.areaTotal||0),0).toFixed(2)
  const otmHoje=hoje.length
  const buildChart=()=>{
    const days=filter==="semanal"?7:30
    return Array.from({length:days},(_,i)=>{
      const d=new Date();d.setDate(d.getDate()-(days-1-i))
      const key=d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})
      const v=data.otimizacoes.filter(o=>new Date(o.criado_em||o.criadoEm).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})===key).reduce((s,o)=>s+(o.area_total||o.areaTotal||0),0)
      return{d:key,v:parseFloat(v.toFixed(2))}
    })
  }
  const chart=buildChart()
  const totalProd=chart.reduce((s,d)=>s+d.v,0).toFixed(2)
  const pieData=["incolor","verde","fume"].map(cor=>({name:COR[cor].label,value:data.chapas.filter(c=>c.cor===cor).reduce((s,c)=>s+c.quantidade,0)}))
  const pieColors=["#60A5FA","#22C55E","#6B7280"]
  const lowStock=data.chapas.filter(c=>c.quantidade<=4)
  return(
    <div style={{display:"flex",flexDirection:"column",gap:22}}>
      <div style={{background:T.dark,borderRadius:18,padding:"22px 24px"}}>
        <div style={{color:"#9CA3AF",fontSize:13,marginBottom:4}}>Resumo operacional em tempo real</div>
        <div style={{color:"#fff",fontSize:24,fontWeight:800}}>Bem-vindo, <span style={{color:T.green}}>Operador</span></div>
        <OptModal navigate={navigate} />
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
        <StatCard icon={<Package size={18}/>} label="Chapas em estoque" value={totalChapas} sub="total no estoque" accent={T.green}/>
        <StatCard icon={<Scissors size={18}/>} label="Retalhos úteis" value={retAtivos} sub="disponíveis para uso" accent="#60A5FA"/>
        <StatCard icon={<TrendingUp size={18}/>} label="Metragem hoje" value={m2hoje+" m²"} sub="área otimizada hoje" accent={T.green}/>
        <StatCard icon={<BarChart2 size={18}/>} label="Otimizações hoje" value={otmHoje} sub="realizadas hoje" accent={T.amber}/>
      </div>
      <div style={{background:T.dark,borderRadius:18,padding:"20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{color:"#fff",fontWeight:700,fontSize:15}}>Produção de vidro</div>
            <div style={{color:"#9CA3AF",fontSize:12}}>Total: {totalProd} m²</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {["semanal","mensal"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{padding:"5px 12px",borderRadius:8,border:"none",background:filter===f?T.green:"#1F2F1F",color:filter===f?"#fff":"#9CA3AF",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={chart} barSize={filter==="semanal"?28:12}>
            <XAxis dataKey="d" tick={{fill:"#9CA3AF",fontSize:9}} axisLine={false} tickLine={false} interval={filter==="mensal"?4:0}/>
            <YAxis tick={{fill:"#9CA3AF",fontSize:9}} axisLine={false} tickLine={false} unit=" m²"/>
            <Tooltip contentStyle={{background:"#1F2937",border:"none",borderRadius:8,color:"#fff"}} formatter={v=>[v+" m²","Produzido"]}/>
            <Bar dataKey="v" fill={T.green} radius={[4,4,0,0]} opacity={0.9}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{background:T.card,borderRadius:16,padding:18,boxShadow:"0 1px 6px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>Chapas por cor</div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
            <PieChart width={100} height={80}><Pie data={pieData} cx={50} cy={40} innerRadius={26} outerRadius={40} dataKey="value">{pieData.map((_,i)=><Cell key={i} fill={pieColors[i]}/>)}</Pie></PieChart>
          </div>
          {pieData.map((d,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,marginTop:5}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:pieColors[i],flexShrink:0}}/>
              <span style={{color:T.textMid,flex:1}}>{d.name}</span>
              <span style={{fontWeight:700}}>{d.value}</span>
            </div>
          ))}
        </div>
        <div style={{background:T.card,borderRadius:16,padding:18,boxShadow:"0 1px 6px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>Últimas otimizações</div>
          {data.otimizacoes.slice(0,4).map(o=>(
            <div key={o.id} style={{paddingBottom:10,marginBottom:10,borderBottom:"1px solid "+T.border}}>
              <div style={{fontSize:11,fontWeight:700,fontFamily:"monospace",color:T.textMid}}>{o.id}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:2}}>
                <Pill cor={o.cor}/>
                <span style={{fontSize:14,fontWeight:800,color:T.green}}>{o.aproveitamento}%</span>
              </div>
            </div>
          ))}
          {!data.otimizacoes.length&&<div style={{color:T.textMuted,fontSize:12}}>Nenhuma ainda</div>}
        </div>
      </div>
      {lowStock.length>0&&(
        <div>
          <div style={{fontSize:15,fontWeight:700,marginBottom:10}}>Alertas de estoque</div>
          {lowStock.map(c=>(
            <div key={c.id} style={{background:T.amberLight,border:"1px solid #FCD34D",borderRadius:12,padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
              <AlertTriangle size={18} color={T.amber}/>
              <div>
                <div style={{fontSize:13,fontWeight:700}}>Estoque baixo</div>
                <div style={{fontSize:12,color:T.textMid}}>Chapa {COR[c.cor]?.label} {c.largura}×{c.altura}</div>
                <div style={{fontSize:12,color:T.amber,fontWeight:600}}>Restam {c.quantidade} unidades</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// ESTOQUE
// ══════════════════════════════════════════════════════
function StockScreen({data,setData}){
  const[showAdd,setShowAdd]=useState(false)
  const[form,setForm]=useState({cor:"incolor",largura:"",altura:"",quantidade:""})
  const[saving,setSaving]=useState(false)
  const handleAdd=async()=>{
    const W=int(form.largura),H=int(form.altura),Q=int(form.quantidade)
    if(!W||!H||!Q)return
    setSaving(true)
    try{
      const row={id:uid(),cor:form.cor,largura:W,altura:H,quantidade:Q}
      await DB.chapas.insert(row)
      setData(d=>({...d,chapas:[{...row,criado_em:Date.now()},...d.chapas]}))
      setForm({cor:"incolor",largura:"",altura:"",quantidade:""});setShowAdd(false)
    }catch(e){alert("Erro: "+e.message)}
    setSaving(false)
  }
  const handleRemove=async id=>{
    if(!confirm("Remover esta chapa?"))return
    try{await DB.chapas.delete(id);setData(d=>({...d,chapas:d.chapas.filter(c=>c.id!==id)}))}catch(e){alert("Erro: "+e.message)}
  }
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <div><div style={{fontSize:22,fontWeight:800}}>Estoque de Chapas</div><div style={{fontSize:13,color:T.textMuted}}>Espessura 8mm</div></div>
        <Btn onClick={()=>setShowAdd(true)} size="sm" icon={<Plus size={14}/>}>Adicionar</Btn>
      </div>
      {showAdd&&(
        <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:16,padding:22,marginBottom:22,boxShadow:"0 4px 24px rgba(0,0,0,0.1)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <div style={{fontSize:16,fontWeight:700}}>Nova Chapa</div>
            <X size={18} style={{cursor:"pointer",color:T.textMuted}} onClick={()=>setShowAdd(false)}/>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:600,color:T.textMid,marginBottom:8}}>Cor do vidro</div>
            <div style={{display:"flex",gap:8}}>
              {["incolor","verde","fume"].map(c=>(
                <button key={c} onClick={()=>setForm(f=>({...f,cor:c}))}
                  style={{flex:1,padding:"10px 8px",borderRadius:10,border:"2px solid "+(form.cor===c?T.green:T.border),background:form.cor===c?T.greenLight:"#fff",fontWeight:600,fontSize:13,cursor:"pointer",color:form.cor===c?T.greenDark:T.textMid}}>
                  {COR[c].label}
                </button>
              ))}
            </div>
          </div>
          {[["largura","Largura (mm)"],["altura","Altura (mm)"],["quantidade","Quantidade"]].map(([k,label])=>(
            <div key={k} style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:600,color:T.textMid,marginBottom:6}}>{label}</div>
              <input type="number" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"1.5px solid "+T.border,fontSize:15,outline:"none",boxSizing:"border-box",background:"#F9FAFB"}}/>
            </div>
          ))}
          <Btn onClick={handleAdd} fullWidth disabled={saving} icon={saving?<RefreshCw size={15} style={{animation:"spin 1s linear infinite"}}/>:<Check size={15}/>}>
            {saving?"Salvando...":"Salvar no Estoque"}
          </Btn>
        </div>
      )}
      {["incolor","verde","fume"].map(cor=>{
        const items=data.chapas.filter(c=>c.cor===cor)
        if(!items.length)return null
        return(
          <div key={cor} style={{marginBottom:26}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <Pill cor={cor}/><span style={{fontSize:13,color:T.textMuted}}>{items.reduce((s,c)=>s+c.quantidade,0)} unidades</span>
            </div>
            {items.map(c=>(
              <div key={c.id} style={{background:T.card,borderRadius:14,padding:"14px 18px",marginBottom:8,display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:17,fontWeight:700,fontFamily:"monospace"}}>{c.largura}×{c.altura} mm</div>
                  <div style={{fontSize:12,color:T.textMuted}}>8mm · {area_m2(c.largura,c.altura)} m²/unidade</div>
                </div>
                <div style={{textAlign:"center",minWidth:54}}>
                  <div style={{fontSize:26,fontWeight:800,color:c.quantidade<=4?T.red:T.text}}>{c.quantidade}</div>
                  <div style={{fontSize:10,color:T.textMuted}}>unid.</div>
                </div>
                <Trash2 size={17} color={T.textMuted} style={{cursor:"pointer"}} onClick={()=>handleRemove(c.id)}/>
              </div>
            ))}
          </div>
        )
      })}
      {!data.chapas.length&&(
        <div style={{textAlign:"center",padding:"48px 24px",color:T.textMuted}}>
          <Package size={40} style={{marginBottom:12,opacity:0.4}}/>
          <div style={{fontSize:15,fontWeight:600}}>Nenhuma chapa em estoque</div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// RETALHOS — com busca, seleção múltipla e usar como base
// ══════════════════════════════════════════════════════
function ScrapsScreen({data,setData,navigate}){
  const[selMode,setSelMode]=useState(false)
  const[selected,setSelected]=useState(new Set())
  const[searchW,setSearchW]=useState("")
  const[searchH,setSearchH]=useState("")
  const[tab,setTab]=useState("ativos") // ativos | descartados | busca

  const ativos=[...data.retalhos.filter(r=>r.status==="ativo")].sort((a,b)=>b.largura*b.altura-a.largura*a.altura)
  const descartados=[...data.retalhos.filter(r=>r.status==="descartado")].sort((a,b)=>b.largura*b.altura-a.largura*a.altura)

  const searchResults=(()=>{
    const W=int(searchW)+4,H=int(searchH)+4
    if(!W||!H)return[]
    return ativos.filter(r=>(r.largura>=W&&r.altura>=H)||(r.largura>=H&&r.altura>=W))
      .sort((a,b)=>a.largura*a.altura-b.largura*b.altura)
  })()

  const updateStatus=async(id,status)=>{
    try{await DB.retalhos.update(id,{status});setData(d=>({...d,retalhos:d.retalhos.map(r=>r.id===id?{...r,status}:r)}))}
    catch(e){alert("Erro: "+e.message)}
  }
  const deleteRetalho=async id=>{
    if(!confirm("Deletar permanentemente? Não pode ser desfeito."))return
    try{await DB.retalhos.delete(id);setData(d=>({...d,retalhos:d.retalhos.filter(r=>r.id!==id)}))}
    catch(e){alert("Erro: "+e.message)}
  }
  const toggleSelect=id=>{
    setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})
  }
  const bulkAction=async(status)=>{
    if(status==="delete"){
      if(!confirm(`Deletar permanentemente ${selected.size} retalho(s)?`))return
      for(const id of selected)await deleteRetalho(id).catch(()=>{})
    } else {
      for(const id of selected)await updateStatus(id,status).catch(()=>{})
    }
    setSelected(new Set());setSelMode(false)
  }

  const listToShow=tab==="ativos"?ativos:tab==="descartados"?descartados:searchResults

  function RetalhoCard({r,showCheck}){
    const isChecked=selected.has(r.id)
    return(
      <div style={{background:T.card,borderRadius:14,padding:"14px 18px",marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",border:isChecked?"2px solid "+T.green:"2px solid transparent"}}>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          {showCheck&&(
            <button onClick={()=>toggleSelect(r.id)} style={{background:"none",border:"none",cursor:"pointer",padding:0,flexShrink:0}}>
              <div style={{width:20,height:20,borderRadius:4,border:"2px solid "+(isChecked?T.green:T.border),background:isChecked?T.green:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {isChecked&&<Check size={12} color="#fff"/>}
              </div>
            </button>
          )}
          <div style={{width:40,height:50,background:"#D1D5DB30",border:"2px dashed #9CA3AF",borderRadius:6,flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:16,fontWeight:700,fontFamily:"monospace"}}>{r.largura}×{r.altura} mm</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}><Pill cor={r.cor}/><span style={{fontSize:12,color:T.textMuted}}>{r.area} m²</span></div>
            <div style={{fontSize:11,color:T.textMuted,marginTop:3}}>de {r.origem}</div>
          </div>
          {!showCheck&&(
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {r.status==="ativo"&&(
                <>
                  <button onClick={()=>{navigate("manual-opt",{retalhoBase:r})}} style={{background:T.greenLight,border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:11,color:T.greenDark,fontWeight:600,whiteSpace:"nowrap"}}>
                    <Grid size={11}/>Usar
                  </button>
                  <button onClick={()=>updateStatus(r.id,"descartado")} style={{background:T.redLight,border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:11,color:T.red,fontWeight:600,whiteSpace:"nowrap"}}>
                    <Trash2 size={11}/>Descartar
                  </button>
                </>
              )}
              {r.status==="descartado"&&(
                <>
                  <button onClick={()=>updateStatus(r.id,"ativo")} style={{background:T.greenLight,border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:11,color:T.greenDark,fontWeight:600,whiteSpace:"nowrap"}}>
                    <RotateCcw size={11}/>Restaurar
                  </button>
                  <button onClick={()=>deleteRetalho(r.id)} style={{background:T.redLight,border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:11,color:T.red,fontWeight:600,whiteSpace:"nowrap"}}>
                    <Trash2 size={11}/>Deletar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{fontSize:22,fontWeight:800}}>Retalhos</div><div style={{fontSize:13,color:T.textMuted}}>Ordenados do maior para o menor</div></div>
        <Btn onClick={()=>{setSelMode(!selMode);setSelected(new Set())}} variant={selMode?"danger":"secondary"} size="sm">
          {selMode?"Cancelar":"Selecionar"}
        </Btn>
      </div>

      <div style={{background:T.card,borderRadius:16,padding:"14px 18px",marginBottom:16,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
        <div><div style={{fontSize:24,fontWeight:800,color:T.green}}>{ativos.length}</div><div style={{fontSize:11,color:T.textMuted}}>Ativos</div></div>
        <div><div style={{fontSize:24,fontWeight:800}}>{descartados.length}</div><div style={{fontSize:11,color:T.textMuted}}>Descartados</div></div>
        <div><div style={{fontSize:18,fontWeight:800,color:T.textMid}}>{ativos.reduce((s,r)=>s+r.area,0).toFixed(2)} m²</div><div style={{fontSize:11,color:T.textMuted}}>Área ativa</div></div>
      </div>

      {/* Abas */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["ativos","Ativos"],["descartados","Descartados"],["busca","Buscar"]].map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:"7px 14px",borderRadius:10,border:"2px solid "+(tab===t?T.green:T.border),background:tab===t?T.green:"#fff",color:tab===t?"#fff":T.textMid,fontSize:13,fontWeight:700,cursor:"pointer"}}>
            {label}
          </button>
        ))}
      </div>

      {/* Busca por tamanho */}
      {tab==="busca"&&(
        <div style={{background:T.card,borderRadius:16,padding:18,marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>Buscar retalho compatível</div>
          <div style={{fontSize:12,color:T.textMuted,marginBottom:12}}>Digite o tamanho da peça. O sistema busca retalhos com +4mm de acréscimo.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            {[["searchW","Largura (mm)"],["searchH","Altura (mm)"]].map(([k,label])=>(
              <div key={k}>
                <div style={{fontSize:11,fontWeight:600,color:T.textMid,marginBottom:6}}>{label}</div>
                <input type="number" value={k==="searchW"?searchW:searchH}
                  onChange={e=>k==="searchW"?setSearchW(e.target.value):setSearchH(e.target.value)}
                  placeholder="Ex: 550"
                  style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid "+T.border,fontSize:14,outline:"none",boxSizing:"border-box",background:"#F9FAFB"}}/>
              </div>
            ))}
          </div>
          {(searchW||searchH)&&(
            <div style={{fontSize:13,color:T.textMuted,marginBottom:8}}>
              {searchResults.length>0
                ?<span style={{color:T.green,fontWeight:600}}>{searchResults.length} retalho(s) compatível(is) encontrado(s)</span>
                :"Nenhum retalho compatível encontrado"}
            </div>
          )}
        </div>
      )}

      {/* Ações em massa */}
      {selMode&&selected.size>0&&(
        <div style={{background:T.dark,borderRadius:14,padding:"14px 18px",marginBottom:14,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{color:"#fff",fontSize:13,fontWeight:600,flex:1}}>{selected.size} selecionado(s)</span>
          <button onClick={()=>bulkAction("ativo")} style={{background:T.green,border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",color:"#fff",fontSize:12,fontWeight:700}}>Restaurar todos</button>
          <button onClick={()=>bulkAction("descartado")} style={{background:T.amber,border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",color:"#fff",fontSize:12,fontWeight:700}}>Descartar todos</button>
          <button onClick={()=>bulkAction("delete")} style={{background:T.red,border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",color:"#fff",fontSize:12,fontWeight:700}}>Deletar todos</button>
        </div>
      )}
      {selMode&&listToShow.length>0&&(
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <button onClick={()=>setSelected(new Set(listToShow.map(r=>r.id)))} style={{background:T.greenLight,border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",color:T.greenDark,fontSize:12,fontWeight:700}}>Selecionar todos</button>
          <button onClick={()=>setSelected(new Set())} style={{background:T.redLight,border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",color:T.red,fontSize:12,fontWeight:700}}>Limpar seleção</button>
        </div>
      )}

      {listToShow.map(r=><RetalhoCard key={r.id} r={r} showCheck={selMode}/>)}
      {!listToShow.length&&tab!=="busca"&&(
        <div style={{textAlign:"center",padding:"48px 24px",color:T.textMuted}}>
          <Scissors size={40} style={{marginBottom:12,opacity:0.4}}/>
          <div style={{fontSize:15,fontWeight:600}}>Nenhum retalho {tab==="ativos"?"ativo":"descartado"}</div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// NOVA OTIMIZAÇÃO (automática) com rascunho
// ══════════════════════════════════════════════════════
function NewOptimization({data,setData,navigate,pecasPreenchidas}){
  const[step,setStep]=useState(1)
  const[cor,setCor]=useState("incolor")
  const[pecas,setPecas]=useState([{id:uid(),largura:"",altura:"",quantidade:""}])
  const[result,setResult]=useState(null)
  const[currentSheet,setCurrentSheet]=useState(0)
  const[cortadas,setCortadas]=useState(new Set())
  const[loading,setLoading]=useState(false)
  const[error,setError]=useState("")
  const[zoomSheet,setZoomSheet]=useState(null)
  const[draftRestored,setDraftRestored]=useState(false)
  const isMobile=useIsMobile()

  // Carregar rascunho salvo
  useEffect(()=>{
    if(pecasPreenchidas){setCor(pecasPreenchidas.cor);setPecas(pecasPreenchidas.pecas);setStep(2);return}
    const draft=loadDraft()
    if(draft&&draft.type==="auto"&&draft.pecas?.length){
      if(confirm("Você tem uma otimização em andamento. Deseja continuar de onde parou?")){
        setCor(draft.cor||"incolor");setPecas(draft.pecas);setStep(draft.step||2);setDraftRestored(true)
      } else clearDraft()
    }
  },[])

  // Salvar rascunho automaticamente
  useEffect(()=>{
    if(step>=2&&step<4)saveDraft({type:"auto",cor,pecas,step})
  },[cor,pecas,step])

  const totalPecas=pecas.reduce((s,p)=>s+(int(p.quantidade)||0),0)
  const areaTotal=pecas.reduce((s,p)=>s+int(p.largura)*int(p.altura)*int(p.quantidade),0)
  const addPeca=()=>setPecas(p=>[...p,{id:uid(),largura:"",altura:"",quantidade:""}])
  const removePeca=id=>setPecas(p=>p.filter(x=>x.id!==id))
  const updatePeca=(id,field,val)=>setPecas(p=>p.map(x=>x.id===id?{...x,[field]:val}:x))

  const handleOptimize=()=>{
    setError("")
    const valid=pecas.filter(p=>int(p.largura)>0&&int(p.altura)>0&&int(p.quantidade)>0)
    if(!valid.length){setError("Adicione ao menos uma peça com medidas e quantidade válidas.");return}
    const temCh=data.chapas.some(c=>c.cor===cor&&c.quantidade>0)
    const temRet=data.retalhos.some(r=>r.status==="ativo"&&r.cor===cor)
    if(!temCh&&!temRet){setError("Sem chapas ou retalhos de "+(COR[cor]?.label||cor)+" em estoque.");return}
    setLoading(true)
    setTimeout(()=>{
      const sheets=runFullOptimization(valid,data.chapas,data.retalhos,cor)
      if(!sheets.length){setError("Nenhuma peça coube. Verifique as medidas.");setLoading(false);return}
      setResult(sheets);setCurrentSheet(0);setCortadas(new Set());setStep(4);setLoading(false)
    },600)
  }

  const handleFinalize=async()=>{
    if(!result)return
    const id=genId()
    const chapasNaoRet=result.filter(s=>!s.isRetalho)
    const avgEff=result.reduce((s,r)=>s+r.efficiency,0)/result.length
    const novosRet=result.map(s=>s.mainScrap).filter(Boolean).map(r=>({id:uid(),cor,largura:Math.round(r.w),altura:Math.round(r.h),area:parseFloat(area_m2(r.w,r.h)),origem:id,status:"ativo"}))
    const retUsados=result.filter(s=>s.isRetalho&&s.retalhoId).map(s=>s.retalhoId)
    const ch=data.chapas.filter(c=>c.cor===cor&&c.quantidade>0).reduce((b,c)=>(!b||c.largura*c.altura>b.largura*b.altura)?c:b,null)
    const novaOtm={id,cor,chapas_usadas:chapasNaoRet.length,aproveitamento:Math.round(avgEff*10)/10,desperdicio:Math.round((100-avgEff)*10)/10,pecas_totais:totalPecas,area_total:parseFloat((areaTotal/1e6).toFixed(2)),chapa_largura:ch?int(ch.largura):2200,chapa_altura:ch?int(ch.altura):3210}
    const pSalvar=pecas.filter(p=>int(p.largura)&&int(p.altura)&&int(p.quantidade)).map(p=>({id:uid(),otimizacao_id:id,largura:int(p.largura),altura:int(p.altura),quantidade:int(p.quantidade)}))
    try{
      if(ch&&chapasNaoRet.length>0)await DB.chapas.update(ch.id,{quantidade:Math.max(0,ch.quantidade-chapasNaoRet.length)})
      for(const rid of retUsados)await DB.retalhos.update(rid,{status:"usado"})
      await DB.retalhos.insertMany(novosRet)
      await DB.otimizacoes.insert(novaOtm)
      await DB.pecas.insertMany(pSalvar)
      const novasCh=data.chapas.map(c=>(ch&&c.id===ch.id)?{...c,quantidade:Math.max(0,c.quantidade-chapasNaoRet.length)}:c)
      const novosRetList=[...data.retalhos.map(r=>retUsados.includes(r.id)?{...r,status:"usado"}:r),...novosRet.map(r=>({...r,criado_em:Date.now()}))]
      setData(d=>({...d,chapas:novasCh,retalhos:novosRetList,otimizacoes:[{...novaOtm,chapasUsadas:novaOtm.chapas_usadas,pecasTotais:novaOtm.pecas_totais,areaTotal:novaOtm.area_total,criadoEm:Date.now()},...d.otimizacoes]}))
      clearDraft()
      navigate("history")
    }catch(e){alert("Erro ao finalizar: "+e.message)}
  }

  const STEPS=["Configuração","Peças","Resumo","Resultado"]

  return(
    <div>
      {zoomSheet&&<ZoomModal sheet={zoomSheet} cor={cor} onClose={()=>setZoomSheet(null)}/>}
      <div style={{display:"flex",alignItems:"center",marginBottom:26}}>
        {STEPS.map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",flex:i<STEPS.length-1?1:"none"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:i+1<step?T.green:i+1===step?T.green:T.border,color:i+1<=step?"#fff":T.textMuted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>
                {i+1<step?<Check size={14}/>:i+1}
              </div>
              <span style={{fontSize:10,color:i+1<=step?T.greenDark:T.textMuted,fontWeight:600,whiteSpace:"nowrap"}}>{s}</span>
            </div>
            {i<STEPS.length-1&&<div style={{flex:1,height:2,background:i+1<step?T.green:T.border,margin:"0 6px",marginBottom:18}}/>}
          </div>
        ))}
      </div>

      {draftRestored&&step<4&&(
        <div style={{background:T.amberLight,border:"1px solid "+T.amber,borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",gap:8,alignItems:"center",fontSize:13,color:"#92400E"}}>
          <Info size={16}/>Rascunho restaurado. Continue de onde parou ou <button onClick={()=>{clearDraft();setPecas([{id:uid(),largura:"",altura:"",quantidade:""}]);setStep(1);setDraftRestored(false)}} style={{background:"none",border:"none",cursor:"pointer",color:T.red,fontWeight:700,fontSize:13}}>recomeçar</button>
        </div>
      )}

      {step===1&&(
        <div>
          <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>Nova Otimização</div>
          <div style={{fontSize:14,color:T.textMuted,marginBottom:24}}>Selecione a cor da chapa</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:28}}>
            {["incolor","verde","fume"].map(c=>{
              const stock=data.chapas.filter(ch=>ch.cor===c).reduce((s,ch)=>s+ch.quantidade,0)
              const ret=data.retalhos.filter(r=>r.cor===c&&r.status==="ativo").length
              return(
                <button key={c} onClick={()=>setCor(c)}
                  style={{padding:"18px 10px",borderRadius:14,border:"2px solid "+(cor===c?T.green:T.border),background:cor===c?T.greenLight:"#fff",cursor:"pointer",textAlign:"center"}}>
                  <div style={{width:38,height:38,borderRadius:8,background:COR[c].bg,border:"2px solid "+COR[c].stroke,margin:"0 auto 10px"}}/>
                  <div style={{fontSize:14,fontWeight:700,color:T.text}}>{COR[c].label}</div>
                  <div style={{fontSize:11,color:stock>0?T.green:T.textMuted,fontWeight:600}}>{stock} chapas</div>
                  {ret>0&&<div style={{fontSize:10,color:T.amber,fontWeight:600}}>{ret} retalhos</div>}
                </button>
              )
            })}
          </div>
          <div style={{background:T.greenLight,borderRadius:12,padding:"12px 16px",marginBottom:24,display:"flex",gap:10}}>
            <Info size={16} color={T.green} style={{flexShrink:0,marginTop:2}}/>
            <div style={{fontSize:13,color:T.greenDark}}><strong>+2mm por lado (+4mm total)</strong>. Chapas são otimizadas primeiro, retalhos por último.</div>
          </div>
          <Btn onClick={()=>setStep(2)} fullWidth size="lg" icon={<ChevronRight size={18}/>}>Continuar</Btn>
        </div>
      )}

      {step===2&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            <ArrowLeft size={20} style={{cursor:"pointer",color:T.textMid}} onClick={()=>setStep(1)}/>
            <div><div style={{fontSize:20,fontWeight:800}}>Adicionar Peças</div><Pill cor={cor}/></div>
          </div>
          {pecasPreenchidas&&<div style={{background:T.greenLight,borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:T.greenDark}}>Peças da otimização anterior carregadas.</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 90px 36px",gap:8,padding:"0 2px",marginBottom:8}}>
            {["Largura (mm)","Altura (mm)","Quantidade",""].map((h,i)=><div key={i} style={{fontSize:11,fontWeight:700,color:T.textMuted}}>{h}</div>)}
          </div>
          {pecas.map(p=>(
            <div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr 90px 36px",gap:8,marginBottom:8,alignItems:"center"}}>
              {["largura","altura"].map(field=>(
                <input key={field} type="number" value={p[field]} onChange={e=>updatePeca(p.id,field,e.target.value)}
                  style={{padding:"11px 12px",borderRadius:8,border:"1.5px solid "+T.border,fontSize:14,outline:"none",background:"#F9FAFB",width:"100%",boxSizing:"border-box"}}/>
              ))}
              <input type="number" value={p.quantidade} onChange={e=>updatePeca(p.id,"quantidade",e.target.value)}
                style={{padding:"11px 8px",borderRadius:8,border:"1.5px solid "+T.border,fontSize:14,outline:"none",background:"#F9FAFB",textAlign:"center",width:"100%",boxSizing:"border-box"}}/>
              <button onClick={()=>removePeca(p.id)} style={{background:T.redLight,border:"none",borderRadius:8,width:36,height:40,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Trash2 size={14} color={T.red}/>
              </button>
            </div>
          ))}
          <Btn onClick={addPeca} variant="secondary" size="sm" style={{marginTop:8,marginBottom:20}} icon={<Plus size={14}/>}>Adicionar linha</Btn>
          <div style={{background:T.greenLight,borderRadius:12,padding:"14px 18px",marginBottom:20}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              <div><div style={{fontSize:11,color:T.textMuted}}>Total de peças</div><div style={{fontSize:22,fontWeight:800,color:T.greenDark}}>{totalPecas}</div></div>
              <div><div style={{fontSize:11,color:T.textMuted}}>Área total</div><div style={{fontSize:20,fontWeight:800,color:T.greenDark}}>{(areaTotal/1e6).toFixed(2)} m²</div></div>
              <div><div style={{fontSize:11,color:T.textMuted}}>Acréscimo</div><div style={{fontSize:14,fontWeight:700,color:T.green}}>+4mm/peça</div></div>
            </div>
          </div>
          <Btn onClick={()=>setStep(3)} fullWidth size="lg" disabled={totalPecas===0} icon={<ChevronRight size={18}/>}>Continuar para Resumo</Btn>
        </div>
      )}

      {step===3&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            <ArrowLeft size={20} style={{cursor:"pointer",color:T.textMid}} onClick={()=>setStep(2)}/>
            <div style={{fontSize:20,fontWeight:800}}>Confirmar Otimização</div>
          </div>
          <div style={{background:T.card,borderRadius:16,padding:20,marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {[["Cor",<Pill cor={cor}/>],["Peças",<span style={{fontSize:18,fontWeight:800}}>{totalPecas}</span>],["Área total",<span style={{fontSize:16,fontWeight:700}}>{(areaTotal/1e6).toFixed(2)} m²</span>],["Acréscimo",<span style={{fontSize:14,fontWeight:700,color:T.green}}>+4mm/peça</span>]].map(([l,v],i)=>(
                <div key={i}><div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>{l}</div>{v}</div>
              ))}
            </div>
          </div>
          <div style={{background:T.card,borderRadius:16,padding:20,marginBottom:20,boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>Peças a otimizar</div>
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 50px",gap:8,marginBottom:8}}>
              {["#","Largura","Altura","Qtd"].map(h=><div key={h} style={{fontSize:11,fontWeight:700,color:T.textMuted}}>{h}</div>)}
            </div>
            {pecas.filter(p=>int(p.largura)&&int(p.altura)&&int(p.quantidade)).map((p,i)=>(
              <div key={p.id} style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 50px",gap:8,paddingBottom:10,borderBottom:"1px solid "+T.border,marginBottom:10}}>
                <div style={{fontSize:12,color:T.textMuted}}>{i+1}</div>
                <div style={{fontSize:14,fontWeight:600,fontFamily:"monospace"}}>{p.largura}</div>
                <div style={{fontSize:14,fontWeight:600,fontFamily:"monospace"}}>{p.altura}</div>
                <div style={{fontSize:14,fontWeight:700,color:T.green}}>{p.quantidade}×</div>
              </div>
            ))}
          </div>
          {error&&<div style={{background:T.redLight,border:"1px solid "+T.red,borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:T.red}}>{error}</div>}
          <Btn onClick={handleOptimize} fullWidth size="lg" disabled={loading}
            icon={loading?<RefreshCw size={18} style={{animation:"spin 1s linear infinite"}}/>:<Zap size={18}/>}>
            {loading?"Calculando...":"Iniciar Otimização"}
          </Btn>
        </div>
      )}

      {step===4&&result&&(()=>{
        const s=result[currentSheet]
        const qtdCh=result.filter(sh=>!sh.isRetalho).length
        const qtdRet=result.filter(sh=>sh.isRetalho).length
        const svgMaxW=isMobile?Math.min(500,(typeof window!=="undefined"?window.innerWidth:360)-40):Math.min(600,700)
        return(
          <div>
            <div style={{background:T.greenLight,borderRadius:14,padding:"14px 18px",marginBottom:18,display:"flex",gap:12,alignItems:"center"}}>
              <CheckCircle size={22} color={T.green}/>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:T.greenDark}}>Otimização concluída!</div>
                <div style={{fontSize:12,color:T.greenDark}}>
                  {qtdCh>0&&qtdCh+" chapa(s) · "}{qtdRet>0&&qtdRet+" retalho(s) · "}{result.reduce((t,sh)=>t+sh.pieces.length,0)} peças
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
              {result.map((sh,i)=>(
                <button key={i} onClick={()=>setCurrentSheet(i)}
                  style={{padding:"8px 16px",borderRadius:10,border:"2px solid "+(currentSheet===i?(sh.isRetalho?T.amber:T.green):T.border),background:currentSheet===i?(sh.isRetalho?T.amber:T.green):T.card,color:currentSheet===i?"#fff":T.textMid,fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0,minWidth:90,textAlign:"center"}}>
                  {sh.isRetalho?"Retalho":("Chapa "+(i+1))}
                  <div style={{fontSize:10,marginTop:2}}>{sh.efficiency}%</div>
                </button>
              ))}
            </div>
            <div style={{marginBottom:14,borderRadius:10,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.2)"}}>
              <SheetSVG sheet={s} cor={cor} maxW={svgMaxW} onZoom={()=>setZoomSheet(s)}/>
            </div>
            <div style={{background:T.card,borderRadius:14,padding:16,marginBottom:14,boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:14,fontWeight:700}}>
                  {s.isRetalho?(s.retalhoLabel||"Retalho"):("Chapa "+(currentSheet+1)+" de "+result.length)}
                  <span style={{fontSize:12,color:T.textMuted,fontWeight:400,marginLeft:8}}>{s.width}×{s.height} mm</span>
                </div>
                <span style={{fontSize:12,fontWeight:700,color:cortadas.has(currentSheet)?T.green:T.amber}}>
                  {cortadas.has(currentSheet)?"✓ Cortada":"Pendente"}
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,textAlign:"center"}}>
                <div><div style={{fontSize:11,color:T.textMuted}}>Área utilizada</div><div style={{fontSize:20,fontWeight:800,color:T.green}}>{(s.usedArea/1e6).toFixed(2)} m²</div><div style={{fontSize:12,color:T.textMuted}}>{s.efficiency}%</div></div>
                <div><div style={{fontSize:11,color:T.textMuted}}>Peças</div><div style={{fontSize:20,fontWeight:800}}>{s.pieces.length}</div></div>
                <div><div style={{fontSize:11,color:T.textMuted}}>Retalhos</div><div style={{fontSize:20,fontWeight:800,color:T.amber}}>{s.scraps?s.scraps.length:0}</div></div>
              </div>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {currentSheet>0&&<Btn onClick={()=>setCurrentSheet(i=>i-1)} variant="ghost" size="sm" icon={<ChevronLeft size={16}/>}>Anterior</Btn>}
              {!cortadas.has(currentSheet)&&<Btn onClick={()=>setCortadas(prev=>new Set([...prev,currentSheet]))} variant="secondary" size="sm" icon={<Check size={16}/>} style={{flex:1}}>Marcar cortada</Btn>}
              {currentSheet<result.length-1?<Btn onClick={()=>setCurrentSheet(i=>i+1)} size="sm" icon={<ChevronRight size={16}/>} style={{flex:1}}>Próxima</Btn>:<Btn onClick={handleFinalize} size="sm" icon={<CheckCircle size={16}/>} style={{flex:1}}>Finalizar e salvar</Btn>}
            </div>
          </div>
        )
      })()}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MOTOR DE CORTE INDUSTRIAL — Guillotine Real
// Regras:
//  - Ponto zero = canto inferior esquerdo
//  - Y = largura (horizontal), X = altura (vertical)
//  - Peças crescem de baixo para cima
//  - qtyY = duplica para o lado (horizontal)
//  - qtyX = duplica para cima (vertical)
//  - Todo corte é borda a borda dentro da zona
//  - Retalho >= 300x300 = aproveitável, abaixo = sucata
// ══════════════════════════════════════════════════════════════
const SCRAP_MIN = 300

// ══════════════════════════════════════════════════════════════
// MOTOR GUILLOTINE — pontos clicáveis, sem linhas em chapa vazia
// ══════════════════════════════════════════════════════════════

function buildCutLayout(entries, sheetW, sheetH) {
  // zones: { id, x0, y0, w, h } — zonas disponíveis para inserção
  // cada entry tem { id, origY, origX, qtyY, qtyX, zoneId? }
  const pieces = []
  const waste = []
  let zoneCounter = 1

  // Zona inicial = chapa inteira
  let zones = [{ id: zoneCounter++, x0: 0, y0: 0, w: sheetW, h: sheetH }]

  for (const entry of entries) {
    const pieceW = int(entry.origY) + 4
    const pieceH = int(entry.origX) + 4
    const qtyY = Math.max(1, int(entry.qtyY) || 1)
    const qtyX = Math.max(1, int(entry.qtyX) || 1)
    const totalW = pieceW * qtyY
    const totalH = pieceH * qtyX

    // Usa zona selecionada pelo operador ou primeira que cabe
    let zIdx = -1
    if (entry.zoneId != null) {
      zIdx = zones.findIndex(z => z.id === entry.zoneId && z.w >= totalW && z.h >= totalH)
    }
    if (zIdx === -1) {
      zIdx = zones.findIndex(z => z.w >= totalW && z.h >= totalH)
    }
    if (zIdx === -1) continue

    const zone = zones.splice(zIdx, 1)[0]

    // Posiciona peças na grade
    for (let ix = 0; ix < qtyX; ix++) {
      for (let iy = 0; iy < qtyY; iy++) {
        pieces.push({
          posY: zone.x0 + iy * pieceW,
          posX: zone.y0 + ix * pieceH,
          w: pieceW, h: pieceH,
          origY: int(entry.origY), origX: int(entry.origX),
          entryId: entry.id,
        })
      }
    }

    const usedW = totalW, usedH = totalH
    const remW = zone.w - usedW, remH = zone.h - usedH

    // Zona à direita
    if (remW > 0 && zone.h > 0) {
      zones.push({ id: zoneCounter++, x0: zone.x0 + usedW, y0: zone.y0, w: remW, h: zone.h })
    }
    // Zona acima
    if (remH > 0 && usedW > 0) {
      zones.push({ id: zoneCounter++, x0: zone.x0, y0: zone.y0 + usedH, w: usedW, h: remH })
    }
    // Retalhos/sucata gerados apenas nas bordas das peças (não na chapa livre)
    // são calculados ao final pelas zonas residuais pequenas após todas as entradas
  }

  // Retalhos/sucata = zonas que ficaram após todas as entradas
  // MAS apenas as adjacentes a peças existentes (não a chapa livre toda)
  const occupiedBounds = pieces.length > 0 ? {
    maxX: Math.max(...pieces.map(p => p.posX + p.h)),
    maxY: Math.max(...pieces.map(p => p.posY + p.w)),
  } : { maxX: 0, maxY: 0 }

  const reusable = []
  for (const z of zones) {
    if (!z.w || !z.h) continue
    // Só marcar como retalho/sucata se adjacente a área já cortada
    const isAdjacent = (z.x0 < occupiedBounds.maxY && z.y0 < occupiedBounds.maxX)
    if (!isAdjacent) continue // chapa livre — não marca nada
    if (z.w >= SCRAP_MIN && z.h >= SCRAP_MIN) {
      reusable.push({ posY: z.x0, posX: z.y0, w: z.w, h: z.h })
    } else if (z.w > 0 && z.h > 0) {
      waste.push({ posY: z.x0, posX: z.y0, w: z.w, h: z.h })
    }
  }

  const usedArea = pieces.reduce((s, p) => s + p.w * p.h, 0)
  const totalArea = sheetW * sheetH
  return {
    pieces, reusable, waste,
    availableZones: zones,
    usedArea, totalArea,
    eff: Math.round((usedArea / totalArea) * 1000) / 10,
  }
}

// ── SVG Mapa de corte ──
function CutMapSVG({ layout, sheetW, sheetH, cor, maxW, onZoom, selectedZoneId, onZoneClick }) {
  const W = maxW || 400
  const scale = W / sheetW
  const H = Math.min(sheetH * scale, 560)
  const sH = H / sheetH
  const c = COR[cor] || COR.incolor
  const sx = v => Math.round(v * scale)
  const sy = v => Math.round((sheetH - v) * sH)

  function label(posY, posX, w, h, lines, color) {
    const pw = sx(w), ph = Math.abs(sy(posX) - sy(posX + h))
    if (pw < 18 || ph < 14) return null
    const isV = ph > pw * 1.3
    const cx = sx(posY) + pw / 2, cy = sy(posX) - ph / 2
    const fs = Math.max(7, Math.min(12, Math.min(pw, ph) * 0.13))
    const lh = fs + 3
    const tr = isV ? `rotate(-90,${cx},${cy})` : undefined
    return (
      <g>
        {lines.map((line, i) => (
          <text key={i} x={cx} y={cy - ((lines.length - 1) / 2 - i) * lh}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={fs} fill={color} fontFamily="monospace" fontWeight="700"
            transform={tr} style={{ userSelect: "none" }}>{line}</text>
        ))}
      </g>
    )
  }

  // Zonas disponíveis para mostrar pontos clicáveis
  const zones = layout ? layout.availableZones || [] : []

  if (!layout) return (
    <div style={{ background: "#1A2A1A", borderRadius: 10, padding: 32, textAlign: "center", color: "#4B5563", fontSize: 13 }}>
      Adicione peças para ver o mapa de corte em tempo real
    </div>
  )

  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ background: "#0D1A0D", padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "monospace" }}>
          MAPA DE CORTE · {sheetW}×{sheetH} mm · <span style={{ color: T.green, fontWeight: 700 }}>{layout.eff}%</span>
        </span>
        {onZoom && (
          <button onClick={onZoom} style={{ background: "#1A2A1A", border: "1px solid #2A3A2A", borderRadius: 6, padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: "#9CA3AF", fontSize: 11 }}>
            <ZoomIn size={13} />Ampliar
          </button>
        )}
      </div>

      <svg width={W} height={H} style={{ display: "block", background: "#D4D4D4" }}>
        {/* Fundo chapa cinza limpo */}
        <rect width={W} height={H} fill="#D4D4D4" />
        {/* Grid sutil */}
        {Array.from({ length: 22 }, (_, i) => <line key={"gv"+i} x1={Math.round(W*i/22)} y1={0} x2={Math.round(W*i/22)} y2={H} stroke="#C8C8C8" strokeWidth={0.4}/>)}
        {Array.from({ length: 18 }, (_, i) => <line key={"gh"+i} x1={0} y1={Math.round(H*i/18)} x2={W} y2={Math.round(H*i/18)} stroke="#C8C8C8" strokeWidth={0.4}/>)}
        <rect x={1} y={1} width={W-2} height={H-2} fill="none" stroke="#888" strokeWidth={2}/>

        {/* Sucata 🟥 */}
        {layout.waste.map((r, i) => {
          const rx=sx(r.posY), ry=sy(r.posX+r.h), rw=sx(r.w), rh=Math.abs(sy(r.posX)-sy(r.posX+r.h))
          if(rw<3||rh<3) return null
          return(
            <g key={"w"+i}>
              <rect x={rx} y={ry} width={rw} height={rh} fill="#EF444428" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 3"/>
              {label(r.posY,r.posX,r.w,r.h,["SUCATA",Math.round(r.w)+"×"+Math.round(r.h)],"#EF4444")}
            </g>
          )
        })}

        {/* Retalho aproveitável 🟩 */}
        {layout.reusable.map((r, i) => {
          const rx=sx(r.posY), ry=sy(r.posX+r.h), rw=sx(r.w), rh=Math.abs(sy(r.posX)-sy(r.posX+r.h))
          if(rw<3||rh<3) return null
          return(
            <g key={"ret"+i}>
              <rect x={rx} y={ry} width={rw} height={rh} fill="#22C55E20" stroke="#22C55E" strokeWidth={1.5} strokeDasharray="7 3"/>
              {label(r.posY,r.posX,r.w,r.h,["Retalho",Math.round(r.w)+"×"+Math.round(r.h),area_m2(r.w,r.h)+" m²"],"#15803D")}
            </g>
          )
        })}

        {/* Linhas de corte — apenas horizontais no topo das peças, borda a borda em Y */}
        {(()=>{
          const hCuts = new Set()
          const vCuts = new Set()
          // Agrupa peças por faixa de base (posX similar)
          const rows = {}
          layout.pieces.forEach(p => {
            const key = Math.round(p.posX)
            if (!rows[key]) rows[key] = []
            rows[key].push(p)
          })
          Object.values(rows).forEach(row => {
            const maxTop = Math.max(...row.map(p => p.posX + p.h))
            if (maxTop < sheetH - 2) hCuts.add(Math.round(maxTop))
            // Vertical apenas entre peças adjacentes na mesma faixa
            const sorted = [...row].sort((a, b) => a.posY - b.posY)
            for (let i = 0; i < sorted.length - 1; i++) {
              if (Math.abs((sorted[i].posY + sorted[i].w) - sorted[i+1].posY) < 4) {
                vCuts.add(Math.round(sorted[i].posY + sorted[i].w))
              }
            }
          })
          return (
            <g>
              {[...hCuts].map(y => (
                <line key={"hc"+y} x1={0} y1={sy(y)} x2={W} y2={sy(y)} stroke="#2563EB" strokeWidth={1.5} strokeDasharray="10 5" opacity={0.7}/>
              ))}
              {[...vCuts].map(x => {
                const row = layout.pieces.filter(p => Math.abs((p.posY+p.w)-x)<4 || Math.abs(p.posY-x)<4)
                const minBase = Math.min(...row.map(p=>p.posX))
                const maxTop = Math.max(...row.map(p=>p.posX+p.h))
                return (
                  <line key={"vc"+x} x1={sx(x)} y1={sy(maxTop)} x2={sx(x)} y2={sy(minBase)} stroke="#2563EB" strokeWidth={1.5} strokeDasharray="10 5" opacity={0.7}/>
                )
              })}
            </g>
          )
        })()}

        {/* Peças */}
        {layout.pieces.map((p, i) => {
          const px=sx(p.posY), py=sy(p.posX+p.h), pw=sx(p.w), ph=Math.abs(sy(p.posX)-sy(p.posX+p.h))
          return (
            <g key={"p"+i}>
              <rect x={px+1} y={py+1} width={pw-2} height={ph-2} fill={c.piece} stroke={c.stroke} strokeWidth={2} rx={2}/>
              {pw>18&&ph>13&&<text x={px+6} y={py+12} fontSize={9} fill={c.text+"99"} fontFamily="monospace" fontWeight="700">{i+1}</text>}
              {label(p.posY,p.posX,p.w,p.h,[p.w+"×"+p.h,"(Y"+p.origY+"×X"+p.origX+")"],c.text)}
            </g>
          )
        })}

        {/* Pontos clicáveis — canto inferior esquerdo de cada zona disponível */}
        {onZoneClick && zones.map(z => {
          const dotX = sx(z.x0) + 6
          const dotY = sy(z.y0) - 6
          const isSelected = selectedZoneId === z.id
          return (
            <g key={"dot"+z.id} style={{ cursor: "pointer" }} onClick={() => onZoneClick(z.id)}>
              <circle cx={dotX} cy={dotY} r={isSelected ? 10 : 7}
                fill={isSelected ? T.green : "#111"}
                stroke={isSelected ? "#fff" : T.green}
                strokeWidth={2} opacity={0.9}/>
              {isSelected && <circle cx={dotX} cy={dotY} r={14} fill="none" stroke={T.green} strokeWidth={1.5} opacity={0.4}/>}
            </g>
          )
        })}

        {/* Ponto zero */}
        <circle cx={10} cy={H-10} r={5} fill="#111" stroke="#fff" strokeWidth={1.5}/>
        <text x={17} y={H-5} fontSize={8} fill="#222" fontFamily="monospace" fontWeight="600">0,0</text>

        {/* Eixos */}
        <line x1={14} y1={H-12} x2={W-12} y2={H-12} stroke="#555" strokeWidth={1}/>
        <text x={W/2} y={H-3} textAnchor="middle" fontSize={10} fill="#333" fontFamily="monospace" fontWeight="600">Y = {sheetW} mm</text>
        <line x1={10} y1={12} x2={10} y2={H-14} stroke="#555" strokeWidth={1}/>
        <text x={16} y={H/2} fontSize={10} fill="#333" fontFamily="monospace" fontWeight="600" transform={`rotate(-90,16,${H/2})`} textAnchor="middle">X = {sheetH} mm</text>
      </svg>

      <div style={{ background: "#0D1A0D", padding: "8px 14px", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9CA3AF" }}>
          <div style={{ width: 14, height: 10, background: c.piece, border: "2px solid "+c.stroke, borderRadius: 2 }}/>Peça cortada
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9CA3AF" }}>
          <div style={{ width: 14, height: 10, background: "#22C55E20", border: "1.5px dashed #22C55E", borderRadius: 2 }}/>
          <span style={{ color: "#22C55E" }}>Retalho (≥300×300)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9CA3AF" }}>
          <div style={{ width: 14, height: 10, background: "#EF444428", border: "1.5px dashed #EF4444", borderRadius: 2 }}/>
          <span style={{ color: "#EF4444" }}>Sucata</span>
        </div>
        {onZoneClick && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9CA3AF" }}>
            <circle r={4} cx={4} cy={4} style={{ display: "inline-block", width: 10, height: 10 }}/>
            <span style={{ color: T.green }}>● Toque para inserir aqui</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Otimização Manual Assistida ──
function ManualOptimization({ data, setData, navigate, retalhoBase }) {
  const [step, setStep] = useState(retalhoBase ? "editing" : "select-base")
  const [base, setBase] = useState(retalhoBase
    ? { type: "retalho", width: int(retalhoBase.largura), height: int(retalhoBase.altura), id: retalhoBase.id, cor: retalhoBase.cor }
    : null)
  const [cor, setCor] = useState(retalhoBase?.cor || "incolor")
  const [entries, setEntries] = useState([])
  const [layout, setLayout] = useState(null)
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [form, setForm] = useState({ y: "", x: "", qtyY: "1", qtyX: "1" })
  const [editId, setEditId] = useState(null)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [manualW, setManualW] = useState("")
  const [manualH, setManualH] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const isMobile = useIsMobile()

  // Recalcula layout em tempo real
  useEffect(() => {
    if (!base || !entries.length) { setLayout(null); return }
    const mapped = entries.map(e => ({ ...e, y: int(e.origY) + 4, x: int(e.origX) + 4 }))
    const result = buildCutLayout(mapped, base.width, base.height)
    setLayout(result)
    // Seleciona automaticamente a primeira zona se nenhuma selecionada
    if (result.availableZones.length > 0 && !selectedZoneId) {
      setSelectedZoneId(result.availableZones[0].id)
    }
  }, [entries, base])

  // Inicia com zona 1 selecionada (chapa inteira)
  useEffect(() => {
    if (base && !entries.length) setSelectedZoneId(1)
  }, [base])

  const addEntry = () => {
    const Y = int(form.y), X = int(form.x)
    if (!Y || !X) { setError("Preencha Y (largura) e X (altura)."); return }
    setError("")
    const entry = {
      id: Date.now() + Math.random(),
      origY: Y, origX: X,
      qtyY: int(form.qtyY) || 1,
      qtyX: int(form.qtyX) || 1,
      zoneId: selectedZoneId,
    }
    if (editId) {
      setEntries(prev => prev.map(e => e.id === editId ? { ...entry, id: e.id } : e))
      setEditId(null)
    } else {
      setEntries(prev => [...prev, entry])
    }
    setForm({ y: "", x: "", qtyY: "1", qtyX: "1" })
    setSelectedZoneId(null) // será re-selecionado após recalculo
  }

  const removeEntry = id => { setEntries(prev => prev.filter(e => e.id !== id)); setSelectedZoneId(null) }

  const startEdit = e => {
    setEditId(e.id)
    setForm({ y: String(e.origY), x: String(e.origX), qtyY: String(e.qtyY||1), qtyX: String(e.qtyX||1) })
    setSelectedZoneId(e.zoneId)
  }

  const handleFinalize = async () => {
    if (!layout || !base) return
    setSaving(true)
    const id = genId()
    const totalPecas = entries.reduce((s, e) => s + (int(e.qtyY)||1) * (int(e.qtyX)||1), 0)
    const novosRet = layout.reusable.map(r => ({
      id: uid(), cor, largura: Math.round(r.w), altura: Math.round(r.h),
      area: parseFloat(area_m2(r.w, r.h)), origem: id, status: "ativo"
    }))
    const novaOtm = {
      id, cor, chapas_usadas: base.type === "retalho" ? 0 : 1,
      aproveitamento: layout.eff, desperdicio: Math.round((100 - layout.eff) * 10) / 10,
      pecas_totais: totalPecas,
      area_total: parseFloat((layout.usedArea / 1e6).toFixed(2)),
      chapa_largura: base.width, chapa_altura: base.height,
    }
    const pSalvar = entries.map(e => ({
      id: uid(), otimizacao_id: id,
      largura: int(e.origY), altura: int(e.origX),
      quantidade: (int(e.qtyY)||1) * (int(e.qtyX)||1)
    }))
    try {
      if (base.type === "retalho" && base.id) await DB.retalhos.update(base.id, { status: "usado" })
      await DB.retalhos.insertMany(novosRet)
      await DB.otimizacoes.insert(novaOtm)
      await DB.pecas.insertMany(pSalvar)
      const novosRetList = [
        ...data.retalhos.map(r => (base.type === "retalho" && r.id === base.id) ? { ...r, status: "usado" } : r),
        ...novosRet.map(r => ({ ...r, criado_em: Date.now() }))
      ]
      setData(d => ({
        ...d, retalhos: novosRetList,
        otimizacoes: [{ ...novaOtm, chapasUsadas: novaOtm.chapas_usadas, pecasTotais: novaOtm.pecas_totais, areaTotal: novaOtm.area_total, criadoEm: Date.now() }, ...d.otimizacoes]
      }))
      navigate("history")
    } catch (e) { alert("Erro ao salvar: " + e.message) }
    setSaving(false)
  }

  const svgW = isMobile ? Math.min(500, (typeof window !== "undefined" ? window.innerWidth : 360) - 32) : 580
  const totalPecas = entries.reduce((s, e) => s + (int(e.qtyY)||1) * (int(e.qtyX)||1), 0)

  // ── SELEÇÃO DE BASE ──
  if (step === "select-base") {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <ArrowLeft size={20} style={{ cursor: "pointer", color: T.textMid }} onClick={() => navigate("dashboard")} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Otimização Manual Assistida</div>
            <div style={{ fontSize: 13, color: T.textMuted }}>Selecione a base de corte</div>
          </div>
        </div>
        <div style={{ background: T.card, borderRadius: 16, padding: 18, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Chapas em estoque</div>
          {data.chapas.filter(c => c.quantidade > 0).map(c => (
            <button key={c.id} onClick={() => { setBase({ type: "chapa", width: int(c.largura), height: int(c.altura) }); setCor(c.cor); setStep("editing") }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: T.bg, border: "1.5px solid " + T.border, borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace" }}>{c.largura}×{c.altura} mm</div>
                <Pill cor={c.cor} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.green }}>{c.quantidade} unid. →</span>
            </button>
          ))}
          {!data.chapas.filter(c => c.quantidade > 0).length && <div style={{ color: T.textMuted, fontSize: 13 }}>Nenhuma chapa disponível</div>}
        </div>
        <div style={{ background: T.card, borderRadius: 16, padding: 18, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Retalhos disponíveis</div>
          {data.retalhos.filter(r => r.status === "ativo").map(r => (
            <button key={r.id} onClick={() => { setBase({ type: "retalho", width: int(r.largura), height: int(r.altura), id: r.id }); setCor(r.cor); setStep("editing") }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: T.bg, border: "1.5px solid " + T.border, borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace" }}>{r.largura}×{r.altura} mm</div>
                <Pill cor={r.cor} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.amber }}>{r.area} m² →</span>
            </button>
          ))}
          {!data.retalhos.filter(r => r.status === "ativo").length && <div style={{ color: T.textMuted, fontSize: 13 }}>Nenhum retalho disponível</div>}
        </div>
        <div style={{ background: T.card, borderRadius: 16, padding: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Inserir dimensões manualmente</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[["manualW", "Y — Largura (mm)"], ["manualH", "X — Altura (mm)"]].map(([k, label]) => (
              <div key={k}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textMid, marginBottom: 6 }}>{label}</div>
                <input type="number" value={k === "manualW" ? manualW : manualH}
                  onChange={e => k === "manualW" ? setManualW(e.target.value) : setManualH(e.target.value)}
                  placeholder="Ex: 2200"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid " + T.border, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#F9FAFB" }} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.textMid, marginBottom: 8 }}>Cor do vidro</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["incolor", "verde", "fume"].map(c => (
                <button key={c} onClick={() => setCor(c)}
                  style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "2px solid " + (cor === c ? T.green : T.border), background: cor === c ? T.greenLight : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", color: cor === c ? T.greenDark : T.textMid }}>
                  {COR[c]?.label || c}
                </button>
              ))}
            </div>
          </div>
          <Btn onClick={() => { const W = int(manualW), H = int(manualH); if (!W || !H) return; setBase({ type: "manual", width: W, height: H }); setStep("editing") }}
            fullWidth disabled={!int(manualW) || !int(manualH)} size="md">
            Usar estas dimensões
          </Btn>
        </div>
      </div>
    )
  }

  // ── EDIÇÃO ──
  // Zona selecionada para info
  const allZones = layout ? (layout.availableZones || []) : [{ id: 1, x0: 0, y0: 0, w: base?.width || 0, h: base?.height || 0 }]
  const selZone = allZones.find(z => z.id === selectedZoneId)

  return (
    <div>
      {zoomOpen && layout && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.95)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 20px" }}>
            <button onClick={() => setZoomOpen(false)} style={{ background: "#1A2A1A", border: "1px solid #2A3A2A", borderRadius: 10, padding: "8px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 14, fontWeight: 700 }}>
              <X size={16} />Fechar
            </button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "0 20px 20px", overflowY: "auto" }}>
            <CutMapSVG layout={layout} sheetW={base.width} sheetH={base.height} cor={cor}
              maxW={Math.min(1100, (typeof window !== "undefined" ? window.innerWidth : 800) - 40)}
              selectedZoneId={selectedZoneId} onZoneClick={setSelectedZoneId} />
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: T.dark, borderRadius: 14, padding: "14px 18px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ArrowLeft size={18} color="#9CA3AF" style={{ cursor: "pointer" }} onClick={() => setStep("select-base")} />
            <div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>Otimização Manual Assistida</div>
              <span style={{ background: T.green, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>Em edição</span>
            </div>
          </div>
          <Btn onClick={handleFinalize} size="sm" disabled={!layout || saving} icon={<CheckCircle size={14} />}>
            {saving ? "Salvando..." : "Concluir"}
          </Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
          {[["Base", `${base?.width}×${base?.height}`], ["Área utilizada", layout ? `${(layout.usedArea/1e6).toFixed(2)} m²` : "0 m²"], ["Aproveit.", layout ? `${layout.eff}%` : "0%"], ["Peças", totalPecas]].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 9, color: "#9CA3AF" }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: l === "Aproveit." ? T.green : "#fff" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mapa de corte com pontos clicáveis */}
      <div style={{ marginBottom: 14, borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
        <CutMapSVG layout={layout || { pieces: [], reusable: [], waste: [], availableZones: [{ id: 1, x0: 0, y0: 0, w: base?.width||0, h: base?.height||0 }], usedArea: 0, totalArea: (base?.width||0)*(base?.height||0), eff: 0 }}
          sheetW={base.width} sheetH={base.height} cor={cor}
          maxW={svgW} onZoom={() => setZoomOpen(true)}
          selectedZoneId={selectedZoneId} onZoneClick={setSelectedZoneId} />
      </div>

      {/* Info zona selecionada */}
      {selZone && (
        <div style={{ background: T.greenLight, borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: T.green, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: T.greenDark }}>
            <strong>Zona selecionada:</strong> disponível {Math.round(selZone.w)}×{Math.round(selZone.h)} mm · posição Y={Math.round(selZone.x0)}, X={Math.round(selZone.y0)}
          </div>
        </div>
      )}

      {/* Formulário */}
      <div style={{ background: T.card, borderRadius: 16, padding: 18, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{editId ? "Editar peça" : "Adicionar peça"}</div>
          {editId && <button onClick={() => { setEditId(null); setForm({ y: "", x: "", qtyY: "1", qtyX: "1" }) }} style={{ background: "none", border: "none", cursor: "pointer", color: T.red, fontSize: 12, fontWeight: 600 }}>Cancelar</button>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          {[["y", "Y — Largura (mm)"], ["x", "X — Altura (mm)"]].map(([k, lbl]) => (
            <div key={k}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textMid, marginBottom: 6 }}>{lbl}</div>
              <input type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                style={{ width: "100%", padding: "11px 12px", borderRadius: 8, border: "1.5px solid " + T.border, fontSize: 15, outline: "none", boxSizing: "border-box", background: "#F9FAFB" }} />
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.textMid, marginBottom: 4 }}>Qtd Y <span style={{ color: T.amber, fontSize: 10 }}>→ para o lado</span></div>
            <input type="number" value={form.qtyY} onChange={e => setForm(f => ({ ...f, qtyY: e.target.value }))} min={1} placeholder="1"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid " + T.border, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#F9FAFB" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.textMid, marginBottom: 4 }}>Qtd X <span style={{ color: T.green, fontSize: 10 }}>↑ para cima</span></div>
            <input type="number" value={form.qtyX} onChange={e => setForm(f => ({ ...f, qtyX: e.target.value }))} min={1} placeholder="1"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid " + T.border, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#F9FAFB" }} />
          </div>
        </div>

        {form.y && form.x && (
          <div style={{ background: T.greenLight, borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: T.greenDark }}>
            ✓ Corte: Y={int(form.y)+4}×X={int(form.x)+4} mm (+4mm) · {int(form.qtyY)||1}×Y · {int(form.qtyX)||1}×X = <strong>{(int(form.qtyY)||1)*(int(form.qtyX)||1)} peças</strong>
          </div>
        )}

        {!selectedZoneId && (
          <div style={{ background: T.amberLight, borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#92400E" }}>
            ⚫ Toque num ponto da chapa para escolher onde inserir a peça
          </div>
        )}

        {error && <div style={{ background: T.redLight, border: "1px solid " + T.red, borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: T.red }}>{error}</div>}

        <Btn onClick={addEntry} fullWidth size="md" icon={<Plus size={16} />} disabled={!int(form.y) || !int(form.x)}>
          {editId ? "Salvar alterações" : "+ Adicionar peça"}
        </Btn>
      </div>

      {/* Lista de peças */}
      {entries.length > 0 && (
        <div style={{ background: T.card, borderRadius: 16, padding: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Peças adicionadas</div>
          {entries.map((e, i) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid " + T.border, marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>Y{e.origY}×X{e.origX} mm</span>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                  {e.qtyY||1}×Y · {e.qtyX||1}×X = <span style={{ color: T.green, fontWeight: 700 }}>{(e.qtyY||1)*(e.qtyX||1)} peças</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => startEdit(e)} style={{ background: T.greenLight, border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: T.greenDark, fontWeight: 600 }}>Editar</button>
                <button onClick={() => removeEntry(e.id)} style={{ background: T.redLight, border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: T.red, fontWeight: 600 }}>Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryDetail({otimizacao,onVoltar,onReutilizar}){
  const[pecas,setPecas]=useState([])
  const[loading,setLoading]=useState(true)
  const[sheets,setSheets]=useState(null)
  const[currentSheet,setCurrentSheet]=useState(0)
  const[zoomSheet,setZoomSheet]=useState(null)
  const cor=otimizacao.cor

  useEffect(()=>{
    DB.pecas.getByOtimizacao(otimizacao.id).then(d=>{
      setPecas(d)
      setLoading(false)
      if(d.length>0){
        const W=int(otimizacao.chapa_largura)||2200
        const H=int(otimizacao.chapa_altura)||3210
        const fakeChapas=[{id:"h",cor,largura:W,altura:H,quantidade:99}]
        const result=runFullOptimization(d,fakeChapas,[],cor)
        setSheets(result)
      }
    }).catch(()=>setLoading(false))
  },[otimizacao.id])

  return(
    <div>
      {zoomSheet&&<ZoomModal sheet={zoomSheet} cor={cor} onClose={()=>setZoomSheet(null)}/>}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <ArrowLeft size={20} style={{cursor:"pointer",color:T.textMid}} onClick={onVoltar}/>
        <div>
          <div style={{fontSize:18,fontWeight:800,fontFamily:"monospace"}}>{otimizacao.id}</div>
          <div style={{fontSize:12,color:T.textMuted}}>{fmt_date(otimizacao.criado_em||otimizacao.criadoEm)}</div>
        </div>
      </div>
      <div style={{background:T.dark,borderRadius:16,padding:20,marginBottom:16}}>
        <div style={{marginBottom:14}}><Pill cor={cor}/></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {[["Aproveitamento",otimizacao.aproveitamento+"%",T.green],["Chapas",otimizacao.chapas_usadas||otimizacao.chapasUsadas,"#fff"],["Peças",otimizacao.pecas_totais||otimizacao.pecasTotais,"#fff"],["Área total",(otimizacao.area_total||otimizacao.areaTotal)+" m²","#9CA3AF"]].map(([l,v,c])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:"#9CA3AF",marginBottom:4}}>{l}</div>
              <div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Visualização das chapas otimizadas */}
      {sheets&&sheets.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>Mapa de corte — {sheets.length} chapa(s)</div>
          <div style={{display:"flex",gap:8,marginBottom:12,overflowX:"auto",paddingBottom:4}}>
            {sheets.map((sh,i)=>(
              <button key={i} onClick={()=>setCurrentSheet(i)}
                style={{padding:"8px 14px",borderRadius:10,border:"2px solid "+(currentSheet===i?T.green:T.border),background:currentSheet===i?T.green:T.card,color:currentSheet===i?"#fff":T.textMid,fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0,minWidth:80,textAlign:"center"}}>
                Chapa {i+1}<div style={{fontSize:10}}>{sh.efficiency}%</div>
              </button>
            ))}
          </div>
          <div style={{borderRadius:10,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
            <SheetSVG sheet={sheets[currentSheet]} cor={cor}
              maxW={typeof window!=="undefined"?Math.min(500,window.innerWidth-40):460}
              onZoom={()=>setZoomSheet(sheets[currentSheet])}/>
          </div>
        </div>
      )}

      <div style={{background:T.card,borderRadius:16,padding:20,marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>Peças otimizadas</div>
        {loading?<div style={{textAlign:"center",color:T.textMuted,padding:20}}>Carregando...</div>:pecas.length>0?(
          <>
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 50px",gap:8,marginBottom:8}}>
              {["#","Largura","Altura","Qtd"].map(h=><div key={h} style={{fontSize:11,fontWeight:700,color:T.textMuted}}>{h}</div>)}
            </div>
            {pecas.map((p,i)=>(
              <div key={p.id} style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 50px",gap:8,paddingBottom:10,borderBottom:"1px solid "+T.border,marginBottom:10}}>
                <div style={{fontSize:12,color:T.textMuted}}>{i+1}</div>
                <div style={{fontSize:14,fontWeight:700,fontFamily:"monospace"}}>{p.largura}</div>
                <div style={{fontSize:14,fontWeight:700,fontFamily:"monospace"}}>{p.altura}</div>
                <div style={{fontSize:14,fontWeight:700,color:T.green}}>{p.quantidade}×</div>
              </div>
            ))}
          </>
        ):<div style={{textAlign:"center",color:T.textMuted,padding:20,fontSize:13}}>Peças não disponíveis para esta otimização.</div>}
      </div>
      <div style={{display:"flex",gap:12}}>
        <Btn onClick={onVoltar} variant="secondary" size="md" style={{flex:1}} icon={<ArrowLeft size={16}/>}>Voltar</Btn>
        {pecas.length>0&&<Btn onClick={()=>onReutilizar(cor,pecas)} size="md" style={{flex:1}} icon={<RotateCcw size={16}/>}>Reutilizar</Btn>}
      </div>
    </div>
  )
}

function HistoryScreen({data,navigate,onReutilizar}){
  const[detalhe,setDetalhe]=useState(null)
  if(detalhe)return<HistoryDetail otimizacao={detalhe} onVoltar={()=>setDetalhe(null)} onReutilizar={(cor,pecas)=>{onReutilizar(cor,pecas);navigate("new-opt")}}/>
  return(
    <div>
      <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>Histórico</div>
      <div style={{fontSize:13,color:T.textMuted,marginBottom:20}}>Clique para ver detalhes ou reutilizar</div>
      {data.otimizacoes.map(o=>(
        <div key={o.id} onClick={()=>setDetalhe(o)}
          style={{background:T.card,borderRadius:16,padding:"16px 18px",marginBottom:10,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",cursor:"pointer",border:"1px solid "+T.border}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
                <span style={{fontSize:15,fontWeight:800,fontFamily:"monospace"}}>{o.id}</span>
                <Pill cor={o.cor}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                <div><div style={{fontSize:10,color:T.textMuted}}>Aproveitamento</div><div style={{fontSize:18,fontWeight:800,color:T.green}}>{o.aproveitamento}%</div></div>
                <div><div style={{fontSize:10,color:T.textMuted}}>Chapas</div><div style={{fontSize:18,fontWeight:800}}>{o.chapas_usadas||o.chapasUsadas}</div></div>
                <div><div style={{fontSize:10,color:T.textMuted}}>Peças</div><div style={{fontSize:18,fontWeight:800}}>{o.pecas_totais||o.pecasTotais}</div></div>
              </div>
              <div style={{fontSize:11,color:T.textMuted,marginTop:8}}>{fmt_date(o.criado_em||o.criadoEm)}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4,color:T.green,fontSize:12,fontWeight:600,marginLeft:12}}>
              <Eye size={15}/>Ver
            </div>
          </div>
        </div>
      ))}
      {!data.otimizacoes.length&&<div style={{textAlign:"center",padding:"48px 24px",color:T.textMuted}}><Clock size={40} style={{marginBottom:12,opacity:0.4}}/><div style={{fontSize:15,fontWeight:600}}>Nenhuma otimização ainda</div></div>}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// APP SHELL
// ══════════════════════════════════════════════════════
export default function App(){
  const[screen,setScreen]=useState("dashboard")
  const[screenParams,setScreenParams]=useState(null)
  const[data,setData]=useState({chapas:[],retalhos:[],otimizacoes:[],loading:true})
  const[dbError,setDbError]=useState("")
  const[pecasReutilizar,setPecasReutilizar]=useState(null)
  const[menuOpen,setMenuOpen]=useState(false)
  const isMobile=useIsMobile()

  useEffect(()=>{
    DB.loadAll().then(d=>setData({...d,loading:false})).catch(e=>{setDbError(e.message);setData(d=>({...d,loading:false}))})
  },[])
  useEffect(()=>{
    const l=document.createElement("link");l.rel="stylesheet"
    l.href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@700;800&display=swap"
    document.head.appendChild(l)
  },[])

  const handleReutilizar=(cor,pecas)=>{
    setPecasReutilizar({cor,pecas:pecas.map(p=>({id:uid(),largura:String(p.largura),altura:String(p.altura),quantidade:p.quantidade}))})
    handleNavigate("new-opt")
  }
  const handleNavigate=(s,params=null)=>{
    if(s!=="new-opt")setPecasReutilizar(null)
    setScreenParams(params)
    setScreen(s)
    setMenuOpen(false)
  }

  const NAV=[
    {id:"dashboard",icon:<Home size={20}/>,label:"Dashboard"},
    {id:"new-opt",icon:<Plus size={20}/>,label:"Nova Otimização"},
    {id:"manual-opt",icon:<Grid size={20}/>,label:"Manual"},
    {id:"projects",icon:<FolderOpen size={20}/>,label:"Projetos"},
    {id:"projetar",icon:<PenTool size={20}/>,label:"Projetar"},
    {id:"orcamento",icon:<DollarSign size={20}/>,label:"Orçamento"},
    {id:"ferragens",icon:<Wrench size={20}/>,label:"Ferragens"},
    {id:"stock",icon:<Layers size={20}/>,label:"Estoque"},
    {id:"scraps",icon:<Scissors size={20}/>,label:"Retalhos"},
    {id:"history",icon:<Clock size={20}/>,label:"Histórico"},
  ]
  const MOBILE_NAV=[
    {id:"dashboard",icon:<Home size={20}/>,label:"Dashboard"},
    {id:"new-opt",icon:<Plus size={22}/>,label:"Otimizar"},
    {id:"stock",icon:<Layers size={20}/>,label:"Estoque"},
    {id:"scraps",icon:<Scissors size={20}/>,label:"Retalhos"},
    {id:"history",icon:<Clock size={20}/>,label:"Histórico"},
  ]

  if(data.loading)return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:T.dark,flexDirection:"column",gap:16}}>
      <div style={{fontSize:32,fontWeight:800,color:T.green,fontFamily:"'Barlow Condensed',sans-serif"}}>OTM<span style={{color:"#fff"}}>glass</span></div>
      <RefreshCw size={26} color={T.green} style={{animation:"spin 1s linear infinite"}}/>
      <div style={{color:"#6B7280",fontSize:13}}>Conectando ao banco de dados...</div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if(dbError)return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:T.dark,flexDirection:"column",gap:16,padding:32}}>
      <AlertTriangle size={40} color={T.red}/>
      <div style={{color:"#fff",fontSize:18,fontWeight:700}}>Erro de conexão com o banco</div>
      <div style={{background:"#1F2937",borderRadius:8,padding:"12px 16px",color:T.red,fontSize:12,fontFamily:"monospace",maxWidth:400,wordBreak:"break-all"}}>{dbError}</div>
    </div>
  )

  const props={data,setData,navigate:handleNavigate}
  const renderScreen=()=>{
    if(screen==="dashboard")return<Dashboard {...props}/>
    if(screen==="stock")return<StockScreen {...props}/>
    if(screen==="new-opt")return<NewOptimization key={pecasReutilizar?"r":"n"} {...props} pecasPreenchidas={pecasReutilizar}/>
    if(screen==="manual-opt")return<ManualOptimization {...props} retalhoBase={screenParams?.retalhoBase||null}/>
    if(screen==="scraps")return<ScrapsScreen {...props}/>
    if(screen==="history")return<HistoryScreen {...props} onReutilizar={handleReutilizar}/>
    if(screen==="projects")return<ProjectsScreen/>
    if(screen==="orcamento")return<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:"12px"}}><div style={{fontSize:"48px"}}>💰</div><div style={{fontSize:"20px",fontWeight:"700",color:"#888"}}>Orçamento</div><div style={{fontSize:"14px",color:"#555"}}>Em breve</div></div>
    if(screen==="ferragens")return<Ferragens isMobile={isMobile}/>
    if(screen==="projetar")return<Projetar isMobile={isMobile}/>
    return<Dashboard {...props}/>
  }

  // ── PC ──
  if(!isMobile){
    return(
      <div style={{display:"flex",minHeight:"100vh",background:T.bg,fontFamily:"'Barlow',sans-serif"}}>
        <div style={{width:240,background:T.sidebar,display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,height:"100vh",zIndex:50,borderRight:"1px solid #1F2D1F"}}>
          <div style={{padding:"24px 20px 20px",borderBottom:"1px solid #1F2D1F"}}>
            <div style={{fontSize:24,fontWeight:800,color:"#fff",letterSpacing:-0.5,fontFamily:"'Barlow Condensed',sans-serif"}}>OTM<span style={{color:T.green}}>glass</span></div>
            <div style={{fontSize:11,color:"#4ADE8099",marginTop:2}}>Intelligent Glass Optimization</div>
          </div>
          <div style={{flex:1,padding:"12px 0"}}>
            {NAV.map(n=>{
              const active=screen===n.id
              return(
                <button key={n.id} onClick={()=>handleNavigate(n.id)}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",background:active?"#1A2A1A":"none",border:"none",width:"100%",cursor:"pointer",borderLeft:active?"3px solid "+T.green:"3px solid transparent",marginBottom:2}}>
                  <span style={{color:active?T.green:"#6B7280",flexShrink:0}}>{n.icon}</span>
                  <span style={{color:active?"#fff":"#9CA3AF",fontSize:14,fontWeight:600}}>{n.label}</span>
                  {n.id==="scraps"&&data.retalhos.filter(r=>r.status==="ativo").length>0&&(
                    <span style={{marginLeft:"auto",background:T.green,color:"#fff",borderRadius:10,fontSize:10,fontWeight:700,padding:"2px 7px"}}>
                      {data.retalhos.filter(r=>r.status==="ativo").length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div style={{padding:"16px 20px",borderTop:"1px solid #1F2D1F"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:T.greenDark,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:14}}>O</div>
              <div><div style={{color:"#fff",fontSize:13,fontWeight:600}}>Operador</div><div style={{color:"#4ADE80",fontSize:10}}>Online</div></div>
            </div>
            <div style={{fontSize:10,color:"#374151",marginTop:12}}>OTMglass v1.5.0</div>
          </div>
        </div>
        <div style={{marginLeft:240,flex:1,display:"flex",flexDirection:"column"}}>
          <div style={{background:"#fff",borderBottom:"1px solid "+T.border,padding:"14px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:40}}>
            <div style={{fontSize:20,fontWeight:800,color:T.text}}>{NAV.find(n=>n.id===screen)?.label||"Dashboard"}</div>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              {data.chapas.some(c=>c.quantidade<=4)&&(
                <div style={{display:"flex",alignItems:"center",gap:6,background:T.amberLight,borderRadius:8,padding:"6px 12px",fontSize:12,color:T.amber,fontWeight:600}}>
                  <AlertTriangle size={14}/>Estoque baixo
                </div>
              )}
              <div style={{position:"relative"}}>
                <Bell size={20} color={T.textMuted}/>
                {data.chapas.some(c=>c.quantidade<=4)&&<span style={{position:"absolute",top:-4,right:-4,width:14,height:14,background:T.red,borderRadius:"50%",fontSize:9,color:"#fff",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>!</span>}
              </div>
            </div>
          </div>
          <div style={{flex:1,padding:"32px",maxWidth:1100,width:"100%"}}>
            {renderScreen()}
          </div>
        </div>
        <style>{`*{box-sizing:border-box}body{margin:0;background:${T.bg};font-family:'Barlow',sans-serif}input:focus{border-color:${T.green}!important;box-shadow:0 0 0 3px ${T.greenLight}}button:active{opacity:.9}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:4px}`}</style>
      </div>
    )
  }

  // ── MOBILE ──
  return(
    <div style={{maxWidth:560,margin:"0 auto",minHeight:"100vh",background:T.bg,fontFamily:"'Barlow',sans-serif",display:"flex",flexDirection:"column"}}>
      <div style={{background:T.dark,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setMenuOpen(true)} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex",flexDirection:"column",gap:4}}>
            <span style={{display:"block",width:22,height:2.5,background:"#9CA3AF",borderRadius:2}}/>
            <span style={{display:"block",width:22,height:2.5,background:"#9CA3AF",borderRadius:2}}/>
            <span style={{display:"block",width:22,height:2.5,background:"#9CA3AF",borderRadius:2}}/>
          </button>
          <span style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:-0.5,fontFamily:"'Barlow Condensed',sans-serif"}}>OTM<span style={{color:T.green}}>glass</span></span>
        </div>
        <div style={{position:"relative"}}>
          <Bell size={20} color="#9CA3AF"/>
          {data.chapas.some(c=>c.quantidade<=4)&&<span style={{position:"absolute",top:-4,right:-4,width:14,height:14,background:T.red,borderRadius:"50%",fontSize:9,color:"#fff",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>!</span>}
        </div>
      </div>
      {menuOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex"}}>
          <div style={{background:T.sidebar,width:280,height:"100%",display:"flex",flexDirection:"column",boxShadow:"4px 0 24px rgba(0,0,0,.5)"}}>
            <div style={{padding:"24px 20px 20px",borderBottom:"1px solid #1F2D1F",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:22,fontWeight:800,color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>OTM<span style={{color:T.green}}>glass</span></div>
                <div style={{fontSize:11,color:"#4ADE8099"}}>Intelligent Glass Optimization</div>
              </div>
              <X size={20} color="#9CA3AF" style={{cursor:"pointer"}} onClick={()=>setMenuOpen(false)}/>
            </div>
            {NAV.map(n=>{
              const active=screen===n.id
              return(
                <button key={n.id} onClick={()=>handleNavigate(n.id)}
                  style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",background:active?"#1A2A1A":"none",border:"none",width:"100%",cursor:"pointer",borderLeft:active?"3px solid "+T.green:"3px solid transparent"}}>
                  <span style={{color:active?T.green:"#9CA3AF"}}>{n.icon}</span>
                  <span style={{color:active?"#fff":"#9CA3AF",fontSize:14,fontWeight:600}}>{n.label}</span>
                </button>
              )
            })}
            <div style={{marginTop:"auto",padding:"16px 20px",borderTop:"1px solid #1F2D1F",fontSize:10,color:"#4B5563"}}>OTMglass v1.5.0</div>
          </div>
          <div style={{flex:1,background:"rgba(0,0,0,.5)"}} onClick={()=>setMenuOpen(false)}/>
        </div>
      )}
      <div style={{flex:1,padding:"20px 20px 100px",overflowY:"auto"}}>
        {renderScreen()}
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:560,background:T.dark,borderTop:"1px solid #1F2D1F",display:"flex",padding:"10px 0 16px",zIndex:100}}>
        {MOBILE_NAV.map(n=>{
          const active=screen===n.id,isCenter=n.id==="new-opt"
          return(
            <button key={n.id} onClick={()=>handleNavigate(n.id)}
              style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"0 4px"}}>
              {isCenter?<div style={{width:48,height:48,borderRadius:"50%",background:T.green,display:"flex",alignItems:"center",justifyContent:"center",marginTop:-20,boxShadow:"0 0 0 4px "+T.dark}}><span style={{color:"#fff"}}>{n.icon}</span></div>:<span style={{color:active?T.green:"#6B7280"}}>{n.icon}</span>}
              <span style={{fontSize:9,fontWeight:600,color:isCenter?T.green:active?T.green:"#6B7280"}}>{n.label}</span>
            </button>
          )
        })}
      </div>
      <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;background:${T.bg}}input:focus{border-color:${T.green}!important;box-shadow:0 0 0 3px ${T.greenLight}}button:active{opacity:.85;transform:scale(.97)}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#374151;border-radius:4px}`}</style>
    </div>
  )
}
