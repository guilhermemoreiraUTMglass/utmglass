import { useState, useEffect } from "react"
import { supabase } from "./supabase.js"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import {
  Home, Plus, Layers, Scissors, Clock, Bell, ChevronRight, Trash2,
  Check, RefreshCw, ArrowLeft, AlertTriangle, X, Zap,
  TrendingUp, Package, Info, CheckCircle, MoreVertical, ChevronLeft, RotateCcw, Eye,
} from "lucide-react"

const T = {
  green: "#22C55E", greenDark: "#15803D", greenLight: "#DCFCE7",
  dark: "#111A11", card: "#FFFFFF", bg: "#F4F6F4",
  border: "#E5E7EB", text: "#111827", textMid: "#4B5563", textMuted: "#9CA3AF",
  red: "#EF4444", redLight: "#FEF2F2", amber: "#F59E0B", amberLight: "#FFFBEB",
}

const COR = {
  incolor: { label: "Incolor", bg: "#EFF6FF", dot: "#60A5FA", piece: "#DBEAFE", stroke: "#3B82F6" },
  verde:   { label: "Verde",   bg: "#F0FDF4", dot: "#22C55E", piece: "#DCFCE7", stroke: "#16A34A" },
  fume:    { label: "Fumê",    bg: "#1F2937", dot: "#9CA3AF", piece: "#374151", stroke: "#6B7280" },
}

const DB = {
  async loadAll() {
    const [{ data: chapas }, { data: retalhos }, { data: otimizacoes }] = await Promise.all([
      supabase.from("chapas").select("*").order("criado_em", { ascending: false }),
      supabase.from("retalhos").select("*").order("criado_em", { ascending: false }),
      supabase.from("otimizacoes").select("*").order("criado_em", { ascending: false }),
    ])
    return { chapas: chapas || [], retalhos: retalhos || [], otimizacoes: otimizacoes || [] }
  },
  chapas: {
    async insert(row) { const { error } = await supabase.from("chapas").insert({ ...row, criado_em: Date.now() }); if (error) throw error },
    async update(id, fields) { const { error } = await supabase.from("chapas").update(fields).eq("id", id); if (error) throw error },
    async delete(id) { const { error } = await supabase.from("chapas").delete().eq("id", id); if (error) throw error },
  },
  retalhos: {
    async insertMany(rows) { if (!rows.length) return; const { error } = await supabase.from("retalhos").insert(rows.map(r => ({ ...r, criado_em: Date.now() }))); if (error) throw error },
    async update(id, fields) { const { error } = await supabase.from("retalhos").update(fields).eq("id", id); if (error) throw error },
  },
  otimizacoes: {
    async insert(row) { const { error } = await supabase.from("otimizacoes").insert({ ...row, criado_em: Date.now() }); if (error) throw error },
  },
  pecas: {
    async insertMany(rows) {
      if (!rows.length) return
      const { error } = await supabase.from("otimizacao_pecas").insert(rows.map(r => ({ ...r, criado_em: Date.now() })))
      if (error) throw error
    },
    async getByOtimizacao(otimizacaoId) {
      const { data, error } = await supabase.from("otimizacao_pecas").select("*").eq("otimizacao_id", otimizacaoId)
      if (error) throw error
      return data || []
    },
  },
}

const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase()
const genId = () => `#OTM-${uid()}`
const area_m2 = (w, h) => ((w * h) / 1e6).toFixed(2)
const fmt_date = ts => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
const int = v => parseInt(v, 10) || 0

// ══════════════════════════════════════════════════════════
// MAXRECTS ALGORITHM
// ══════════════════════════════════════════════════════════
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) { return !(ax >= bx + bw || ax + aw <= bx || ay >= by + bh || ay + ah <= by) }
function isContained(inner, outer) { return outer.x <= inner.x && outer.y <= inner.y && outer.x + outer.w >= inner.x + inner.w && outer.y + outer.h >= inner.y + inner.h }

function packOneSheet(pieces, W, H) {
  let freeRects = [{ x: 0, y: 0, w: W, h: H }]
  const placed = [], notPlaced = []
  for (const piece of pieces) {
    const pw = int(piece.w), ph = int(piece.h)
    if (!pw || !ph) continue
    let bestScore1 = Infinity, bestScore2 = Infinity, bestRect = null, bestRotated = false
    for (const rect of freeRects) {
      if (pw <= rect.w && ph <= rect.h) { const s1 = Math.min(rect.w - pw, rect.h - ph), s2 = Math.max(rect.w - pw, rect.h - ph); if (s1 < bestScore1 || (s1 === bestScore1 && s2 < bestScore2)) { bestScore1 = s1; bestScore2 = s2; bestRect = rect; bestRotated = false } }
      if (ph <= rect.w && pw <= rect.h) { const s1 = Math.min(rect.w - ph, rect.h - pw), s2 = Math.max(rect.w - ph, rect.h - pw); if (s1 < bestScore1 || (s1 === bestScore1 && s2 < bestScore2)) { bestScore1 = s1; bestScore2 = s2; bestRect = rect; bestRotated = true } }
    }
    if (!bestRect) { notPlaced.push(piece); continue }
    const fw = bestRotated ? ph : pw, fh = bestRotated ? pw : ph
    const px = bestRect.x, py = bestRect.y
    placed.push({ x: px, y: py, pw: fw, ph: fh, rotated: bestRotated, ref: piece })
    const newRects = []
    for (const rect of freeRects) {
      if (!rectsOverlap(px, py, fw, fh, rect.x, rect.y, rect.w, rect.h)) { newRects.push(rect); continue }
      if (rect.x < px) newRects.push({ x: rect.x, y: rect.y, w: px - rect.x, h: rect.h })
      if (rect.x + rect.w > px + fw) newRects.push({ x: px + fw, y: rect.y, w: rect.x + rect.w - px - fw, h: rect.h })
      if (rect.y < py) newRects.push({ x: rect.x, y: rect.y, w: rect.w, h: py - rect.y })
      if (rect.y + rect.h > py + fh) newRects.push({ x: rect.x, y: py + fh, w: rect.w, h: rect.y + rect.h - py - fh })
    }
    freeRects = newRects.filter((r, i) => r.w > 0 && r.h > 0 && !newRects.some((o, j) => i !== j && isContained(r, o)))
  }
  return { placed, notPlaced, freeRects }
}

function validateSheet(placed, W, H) {
  const errors = []
  for (const p of placed) {
    if (p.x + p.pw > W + 1) errors.push(`Peça ultrapassa largura`)
    if (p.y + p.ph > H + 1) errors.push(`Peça ultrapassa altura`)
  }
  return errors
}

function runOptimization(pecas, sheetW, sheetH) {
  const all = []
  pecas.forEach(p => {
    const W = int(p.largura), H = int(p.altura), Q = int(p.quantidade)
    if (!W || !H || !Q) return
    for (let i = 0; i < Q; i++) all.push({ w: W + 4, h: H + 4, origW: W, origH: H })
  })
  if (all.length === 0) return []
  all.sort((a, b) => b.w * b.h - a.w * a.h)
  const results = []
  let remaining = [...all]
  while (remaining.length > 0) {
    const { placed, notPlaced, freeRects } = packOneSheet(remaining, sheetW, sheetH)
    if (placed.length === 0) break
    const usedArea = placed.reduce((s, p) => s + p.pw * p.ph, 0)
    const totalArea = sheetW * sheetH
    const eff = (usedArea / totalArea) * 100
    const scraps = freeRects.filter(r => r.w >= 10 && r.h >= 10)
    const mainScrap = scraps.reduce((best, r) => (!best || r.w * r.h > best.w * best.h) ? r : best, null)
    results.push({ id: results.length + 1, width: sheetW, height: sheetH, pieces: placed, freeRects: scraps, mainScrap, efficiency: Math.round(eff * 10) / 10, usedArea, totalArea, waste: totalArea - usedArea, errors: validateSheet(placed, sheetW, sheetH) })
    remaining = notPlaced
  }
  return results
}

// ══════════════════════════════════════════════════════════
// SVG DA CHAPA
// ══════════════════════════════════════════════════════════
function SheetSVG({ sheet, maxW = 360 }) {
  const scaleX = maxW / sheet.width
  const svgH = Math.min(sheet.height * scaleX, 480)
  const scaleY = svgH / sheet.height
  const sx = v => Math.round(v * scaleX)
  const sy = v => Math.round(v * scaleY)
  const fontSize = v => Math.max(8, Math.min(14, v))
  return (
    <svg width={maxW} height={svgH} style={{ display: "block", borderRadius: 8, background: "#141A14" }}>
      <rect width={maxW} height={svgH} fill="#1A261A" />
      {sheet.freeRects.map((r, i) => { const rw = sx(r.w), rh = sy(r.h); if (rw < 2 || rh < 2) return null; return (<g key={`f${i}`}><rect x={sx(r.x)} y={sy(r.y)} width={rw} height={rh} fill="#2D3B2D" stroke="#4B5563" strokeWidth={1} strokeDasharray="5 3" opacity={0.85} />{rw > 40 && rh > 28 && <text x={sx(r.x) + rw / 2} y={sy(r.y) + rh / 2} textAnchor="middle" dominantBaseline="middle" fontSize={fontSize(Math.min(rw, rh) * 0.14)} fill="#6B7280" fontFamily="monospace" fontWeight="600">{Math.round(r.w)}×{Math.round(r.h)}</text>}</g>) })}
      {sheet.pieces.map((p, i) => {
        const pw = sx(p.pw), ph = sy(p.ph)
        const showSize = pw > 50 && ph > 34
        const cutW = p.pw, cutH = p.ph
        const finW = p.ref?.origW ?? p.pw - 4, finH = p.ref?.origH ?? p.ph - 4
        const fs = fontSize(Math.min(pw, ph) * 0.17), fsS = Math.max(6, fs * 0.7)
        const midX = sx(p.x) + pw / 2, midY = sy(p.y) + ph / 2
        return (<g key={`p${i}`}><rect x={sx(p.x) + 1} y={sy(p.y) + 1} width={pw - 2} height={ph - 2} fill="#DCFCE7" stroke="#16A34A" strokeWidth={1.5} rx={2} />{showSize && (<><text x={midX} y={midY - (ph > 38 ? fsS + 1 : 0)} textAnchor="middle" dominantBaseline="middle" fontSize={fs} fill="#15803D" fontFamily="monospace" fontWeight="800">{cutW}×{cutH}</text>{ph > 38 && <text x={midX} y={midY + fs + 1} textAnchor="middle" dominantBaseline="middle" fontSize={fsS} fill="#166534" fontFamily="monospace" opacity={0.7}>({finW}×{finH})</text>}{p.rotated && ph > 52 && <text x={midX} y={midY + fs + fsS + 4} textAnchor="middle" dominantBaseline="middle" fontSize={fsS} fill="#22C55E" opacity={0.8}>↺</text>}</>)}</g>)
      })}
      <text x={maxW / 2} y={svgH - 5} textAnchor="middle" fontSize="9" fill="#6B7280" fontFamily="monospace">{sheet.width} × {sheet.height} mm</text>
    </svg>
  )
}


  const steps = [...[...xCuts].sort((a, b) => a - b).map(x => ({ tipo: "Corte vertical", val: `${x} mm` })), ...[...yCuts].sort((a, b) => a - b).map(y => ({ tipo: "Corte horizontal", val: `${y} mm` })), ...sheet.pieces.map(p => ({ tipo: "Separar peça", val: `${p.ref?.origW ?? p.pw - 4}×${p.ref?.origH ?? p.ph - 4} mm` }))]
  return (<div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{steps.map((c, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 22, height: 22, borderRadius: "50%", background: T.green, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div><span style={{ fontSize: 13, color: T.textMid, flex: 1 }}>{c.tipo}</span><span style={{ fontSize: 13, fontWeight: 600, color: T.green, fontFamily: "monospace" }}>{c.val}</span></div>))}{steps.length === 0 && <div style={{ color: T.textMuted, fontSize: 13 }}>Sem cortes.</div>}</div>)
}

// ══════════════════════════════════════════════════════════
// UI ATOMS
// ══════════════════════════════════════════════════════════
const Pill = ({ cor }) => (<span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: COR[cor]?.bg, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: T.text }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: COR[cor]?.dot, flexShrink: 0 }} />{COR[cor]?.label}</span>)
const StatCard = ({ icon, label, value, sub, subColor }) => (<div style={{ background: T.card, borderRadius: 16, padding: "16px 18px", flex: 1, minWidth: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span style={{ color: T.green }}>{icon}</span><span style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>{label}</span></div><div style={{ fontSize: 26, fontWeight: 800, color: T.text, lineHeight: 1 }}>{value}</div>{sub && <div style={{ fontSize: 11, color: subColor || T.green, marginTop: 4, fontWeight: 500 }}>{sub}</div>}</div>)
const Btn = ({ children, onClick, variant = "primary", size = "md", fullWidth, icon, disabled, style }) => {
  const vs = { primary: { background: disabled ? "#9CA3AF" : T.green, color: "#fff", border: "none" }, secondary: { background: "transparent", color: T.green, border: `2px solid ${T.green}` }, ghost: { background: "transparent", color: T.textMid, border: "none" }, danger: { background: T.redLight, color: T.red, border: `2px solid ${T.red}` } }
  const ps = { sm: "6px 14px", md: "12px 22px", lg: "16px 28px" }
  const fs = { sm: 13, md: 15, lg: 16 }
  return (<button onClick={onClick} disabled={disabled} style={{ ...vs[variant], padding: ps[size], fontSize: fs[size], borderRadius: 12, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: fullWidth ? "100%" : "auto", transition: "all .15s", ...style }}>{icon && <span style={{ display: "flex" }}>{icon}</span>}{children}</button>)
}

// ══════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════
function Dashboard({ data, navigate }) {
  const totalChapas = data.chapas.reduce((s, c) => s + c.quantidade, 0)
  const retalhoAtivos = data.retalhos.filter(r => r.status === "ativo").length
  const avg = data.otimizacoes.length ? (data.otimizacoes.reduce((s, o) => s + o.aproveitamento, 0) / data.otimizacoes.length).toFixed(1) : "—"
  const desp = data.otimizacoes.length ? (data.otimizacoes.reduce((s, o) => s + o.desperdicio, 0) / data.otimizacoes.length).toFixed(1) : "—"
  const chartData = [{ d: "Seg", v: 85 }, { d: "Ter", v: 87 }, { d: "Qua", v: 83 }, { d: "Qui", v: 90 }, { d: "Sex", v: parseFloat(avg) || 92 }]
  const pieData = ["incolor", "verde", "fume"].map(cor => ({ name: COR[cor].label, value: data.chapas.filter(c => c.cor === cor).reduce((s, c) => s + c.quantidade, 0) }))
  const pieColors = ["#60A5FA", "#22C55E", "#6B7280"]
  const lowStock = data.chapas.filter(c => c.quantidade <= 4)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: T.dark, borderRadius: 20, padding: "20px 20px 18px" }}>
        <div style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 4 }}>Resumo operacional em tempo real</div>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>Bem-vindo, <span style={{ color: T.green }}>Operador</span></div>
        <Btn onClick={() => navigate("new-opt")} size="md" style={{ marginTop: 16 }} icon={<Plus size={16} />}>Nova Otimização</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <StatCard icon={<Package size={18} />} label="Chapas em estoque" value={totalChapas} sub="↑ atualizado agora" />
        <StatCard icon={<Scissors size={18} />} label="Retalhos úteis" value={retalhoAtivos} sub="disponíveis" />
        <StatCard icon={<TrendingUp size={18} />} label="Aproveitamento médio" value={`${avg}%`} sub="todas as otimizações" />
        <StatCard icon={<Trash2 size={18} />} label="Desperdício médio" value={`${desp}%`} sub="todas as otimizações" subColor={T.green} />
      </div>
      <div style={{ background: T.dark, borderRadius: 16, padding: "18px 16px" }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Aproveitamento semanal</div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData}>
            <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={0.5} /><stop offset="100%" stopColor={T.green} stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="d" tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[70, 100]} tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#1F2937", border: "none", borderRadius: 8, color: "#fff" }} />
            <Area type="monotone" dataKey="v" stroke={T.green} fill="url(#ag)" strokeWidth={2.5} dot={{ fill: T.green, r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: T.card, borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Uso por cor</div>
          <PieChart width={110} height={90} style={{ margin: "0 auto" }}><Pie data={pieData} cx={55} cy={45} innerRadius={28} outerRadius={44} dataKey="value">{pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}</Pie></PieChart>
          {pieData.map((d, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginTop: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: pieColors[i], flexShrink: 0 }} /><span style={{ color: T.textMid, flex: 1 }}>{d.name}</span><span style={{ fontWeight: 700 }}>{d.value}</span></div>))}
        </div>
        <div style={{ background: T.card, borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Últimas otimizações</div>
          {data.otimizacoes.slice(0, 3).map(o => (<div key={o.id} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${T.border}` }}><div style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{o.id}</div><Pill cor={o.cor} /><div style={{ fontSize: 15, fontWeight: 800, color: T.green, marginTop: 2 }}>{o.aproveitamento}%</div></div>))}
          {data.otimizacoes.length === 0 && <div style={{ color: T.textMuted, fontSize: 12 }}>Nenhuma ainda</div>}
        </div>
      </div>
      {lowStock.length > 0 && (<div><div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>⚠ Alertas</div>{lowStock.map(c => (<div key={c.id} style={{ background: T.amberLight, border: `1px solid #FCD34D`, borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}><AlertTriangle size={18} color={T.amber} /><div><div style={{ fontSize: 13, fontWeight: 700 }}>Estoque baixo</div><div style={{ fontSize: 12, color: T.textMid }}>Chapa {COR[c.cor]?.label} {c.largura}×{c.altura}</div><div style={{ fontSize: 12, color: T.amber, fontWeight: 600 }}>Restam {c.quantidade} unidades</div></div></div>))}</div>)}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// ESTOQUE
// ══════════════════════════════════════════════════════════
function StockScreen({ data, setData }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ cor: "incolor", largura: "", altura: "", quantidade: "" })
  const [saving, setSaving] = useState(false)
  const handleAdd = async () => {
    const W = int(form.largura), H = int(form.altura), Q = int(form.quantidade)
    if (!W || !H || !Q) return
    setSaving(true)
    try {
      const row = { id: uid(), cor: form.cor, largura: W, altura: H, quantidade: Q }
      await DB.chapas.insert(row)
      setData(d => ({ ...d, chapas: [{ ...row, criado_em: Date.now() }, ...d.chapas] }))
      setForm({ cor: "incolor", largura: "", altura: "", quantidade: "" }); setShowAdd(false)
    } catch (e) { alert("Erro ao salvar: " + e.message) }
    setSaving(false)
  }
  const handleRemove = async id => {
    if (!confirm("Remover esta chapa do estoque?")) return
    try { await DB.chapas.delete(id); setData(d => ({ ...d, chapas: d.chapas.filter(c => c.id !== id) })) }
    catch (e) { alert("Erro: " + e.message) }
  }
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div><div style={{ fontSize: 22, fontWeight: 800 }}>Estoque de Chapas</div><div style={{ fontSize: 13, color: T.textMuted }}>8mm · Gerenciar chapas disponíveis</div></div>
        <Btn onClick={() => setShowAdd(true)} size="sm" icon={<Plus size={14} />}>Adicionar</Btn>
      </div>
      {showAdd && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Nova Chapa</div>
            <X size={20} style={{ cursor: "pointer", color: T.textMuted }} onClick={() => setShowAdd(false)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 8 }}>Cor do vidro</div>
            <div style={{ display: "flex", gap: 8 }}>{["incolor", "verde", "fume"].map(c => (<button key={c} onClick={() => setForm(f => ({ ...f, cor: c }))} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, border: `2px solid ${form.cor === c ? T.green : T.border}`, background: form.cor === c ? T.greenLight : "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", color: form.cor === c ? T.greenDark : T.textMid }}>{COR[c]?.label}</button>))}</div>
          </div>
          {[["largura", "Largura (mm)", "Ex: 2200"], ["altura", "Altura (mm)", "Ex: 3210"], ["quantidade", "Quantidade", "Ex: 10"]].map(([k, label, ph]) => (<div key={k} style={{ marginBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 6 }}>{label}</div><input type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 15, outline: "none", boxSizing: "border-box", background: "#F9FAFB" }} /></div>))}
          <Btn onClick={handleAdd} fullWidth disabled={saving} icon={saving ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={16} />}>{saving ? "Salvando..." : "Salvar no Estoque"}</Btn>
        </div>
      )}
      {["incolor", "verde", "fume"].map(cor => {
        const items = data.chapas.filter(c => c.cor === cor)
        if (!items.length) return null
        return (<div key={cor} style={{ marginBottom: 24 }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><Pill cor={cor} /><span style={{ fontSize: 13, color: T.textMuted }}>{items.reduce((s, c) => s + c.quantidade, 0)} unidades</span></div>{items.map(c => (<div key={c.id} style={{ background: T.card, borderRadius: 14, padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}><div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>{c.largura} × {c.altura} mm</div><div style={{ fontSize: 12, color: T.textMuted }}>8mm · {area_m2(c.largura, c.altura)} m²/unidade</div></div><div style={{ textAlign: "center", minWidth: 52 }}><div style={{ fontSize: 24, fontWeight: 800, color: c.quantidade <= 4 ? T.red : T.text }}>{c.quantidade}</div><div style={{ fontSize: 10, color: T.textMuted }}>unid.</div></div><Trash2 size={18} color={T.textMuted} style={{ cursor: "pointer" }} onClick={() => handleRemove(c.id)} /></div>))}</div>)
      })}
      {data.chapas.length === 0 && (<div style={{ textAlign: "center", padding: "48px 24px", color: T.textMuted }}><Package size={40} style={{ marginBottom: 12, opacity: 0.4 }} /><div style={{ fontSize: 15, fontWeight: 600 }}>Nenhuma chapa em estoque</div></div>)}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// NOVA OTIMIZAÇÃO
// ══════════════════════════════════════════════════════════
function NewOptimization({ data, setData, navigate, pecasPreenchidas }) {
  const [step, setStep] = useState(pecasPreenchidas ? 2 : 1)
  const [cor, setCor] = useState(pecasPreenchidas?.cor || "incolor")
  const [pecas, setPecas] = useState(pecasPreenchidas?.pecas || [{ id: uid(), largura: "", altura: "", quantidade: 1 }])
  const [result, setResult] = useState(null)
  const [sheetInfo, setSheetInfo] = useState(null)
  const [currentSheet, setCurrentSheet] = useState(0)
  const [cortadas, setCortadas] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const totalPecas = pecas.reduce((s, p) => s + (int(p.quantidade) || 0), 0)
  const areaTotal = pecas.reduce((s, p) => s + int(p.largura) * int(p.altura) * int(p.quantidade), 0)
  const addPeca = () => setPecas(p => [...p, { id: uid(), largura: "", altura: "", quantidade: 1 }])
  const removePeca = id => setPecas(p => p.filter(x => x.id !== id))
  const updatePeca = (id, field, val) => setPecas(p => p.map(x => x.id === id ? { ...x, [field]: val } : x))

  const handleOptimize = () => {
    setError("")
    const valid = pecas.filter(p => int(p.largura) > 0 && int(p.altura) > 0 && int(p.quantidade) > 0)
    if (!valid.length) { setError("Adicione ao menos uma peça com medidas válidas."); return }
    setLoading(true)
    setTimeout(() => {
      const disponiveis = data.chapas.filter(c => c.cor === cor && c.quantidade > 0)
      const chapa = disponiveis.reduce((best, c) => (!best || c.largura * c.altura > best.largura * best.altura) ? c : best, null)
      if (!chapa) { setError(`Sem chapas de ${COR[cor]?.label} em estoque.`); setLoading(false); return }

      // ── Retalhos disponíveis da mesma cor ──────────────────────────────────
      const retalhosDaCor = data.retalhos.filter(r => r.status === "ativo" && r.cor === cor)
        .sort((a, b) => b.largura * b.altura - a.largura * a.altura) // maiores primeiro

      // ── Distribui peças: tenta retalhos antes de chapas novas ─────────────
      const allSheets = []
      let remaining = []

      // Expande peças com +4mm
      const pecasExpanded = []
      valid.forEach(p => {
        const W = int(p.largura), H = int(p.altura), Q = int(p.quantidade)
        if (!W || !H || !Q) return
        for (let i = 0; i < Q; i++) pecasExpanded.push({ w: W + 4, h: H + 4, origW: W, origH: H })
      })
      pecasExpanded.sort((a, b) => b.w * b.h - a.w * a.h)

      let toPlace = [...pecasExpanded]

      // Tenta cada retalho disponível
      for (const retalho of retalhosDaCor) {
        if (toPlace.length === 0) break
        const rW = int(retalho.largura), rH = int(retalho.altura)
        // Verifica se alguma peça cabe neste retalho
        const cabem = toPlace.filter(p => (p.w <= rW && p.h <= rH) || (p.h <= rW && p.w <= rH))
        if (cabem.length === 0) continue

        const { placed, notPlaced: naoCouberam, freeRects } = packOneSheet(cabem, rW, rH)
        if (placed.length === 0) continue

        const usedArea = placed.reduce((s, p) => s + p.pw * p.ph, 0)
        const totalArea = rW * rH
        const eff = (usedArea / totalArea) * 100
        const scraps = freeRects.filter(r => r.w >= 10 && r.h >= 10)
        const mainScrap = scraps.reduce((best, r) => (!best || r.w * r.h > best.w * best.h) ? r : best, null)

        allSheets.push({
          id: allSheets.length + 1,
          width: rW, height: rH,
          pieces: placed,
          freeRects: scraps,
          mainScrap,
          efficiency: Math.round(eff * 10) / 10,
          usedArea, totalArea,
          waste: totalArea - usedArea,
          errors: validateSheet(placed, rW, rH),
          isRetalho: true,
          retalhoId: retalho.id,
          retalhoLabel: `Retalho ${rW}×${rH}`,
        })

        // Remove peças já alocadas do toPlace
        const placedRefs = new Set(placed.map(p => p.ref))
        const cabemIds = new Set(cabem)
        toPlace = toPlace.filter(p => {
          if (!cabemIds.has(p)) return true
          const idx = placed.findIndex(pl => pl.ref === p)
          return idx === -1
        })
        // Simpler: rebuild toPlace = pieces not placed in this sheet
        const placedPieces = placed.map(p => p.ref)
        const notInSheet = [...naoCouberam]
        // pieces that were candidates but not placed
        toPlace = toPlace.filter(p => !placedPieces.includes(p)).concat(notInSheet.filter(p => !toPlace.includes(p)))
      }

      // Peças restantes vão para chapas novas
      if (toPlace.length > 0) {
        let remainingForSheets = [...toPlace]
        while (remainingForSheets.length > 0) {
          const { placed, notPlaced, freeRects } = packOneSheet(remainingForSheets, int(chapa.largura), int(chapa.altura))
          if (placed.length === 0) break
          const usedArea = placed.reduce((s, p) => s + p.pw * p.ph, 0)
          const totalArea = int(chapa.largura) * int(chapa.altura)
          const eff = (usedArea / totalArea) * 100
          const scraps = freeRects.filter(r => r.w >= 10 && r.h >= 10)
          const mainScrap = scraps.reduce((best, r) => (!best || r.w * r.h > best.w * best.h) ? r : best, null)
          allSheets.push({
            id: allSheets.length + 1,
            width: int(chapa.largura), height: int(chapa.altura),
            pieces: placed, freeRects: scraps, mainScrap,
            efficiency: Math.round(eff * 10) / 10,
            usedArea, totalArea, waste: totalArea - usedArea,
            errors: validateSheet(placed, int(chapa.largura), int(chapa.altura)),
            isRetalho: false,
          })
          remainingForSheets = notPlaced
        }
      }

      if (!allSheets.length) { setError("Nenhuma peça coube na chapa. Verifique as medidas."); setLoading(false); return }
      setSheetInfo(chapa); setResult(allSheets); setCurrentSheet(0); setCortadas(new Set()); setStep(4); setLoading(false)
    }, 600)
  }

  const handleFinalize = async () => {
    if (!result || !sheetInfo) return
    const id = genId()
    const chapasUsadas = result.length
    const avgEff = result.reduce((s, r) => s + r.efficiency, 0) / result.length
    const novosRetalhos = result.map(s => s.mainScrap).filter(Boolean).map(r => ({ id: uid(), cor, largura: Math.round(r.w), altura: Math.round(r.h), area: parseFloat(area_m2(r.w, r.h)), origem: id, status: "ativo" }))
    const novaOtm = { id, cor, chapas_usadas: chapasUsadas, aproveitamento: Math.round((result.reduce((s, r) => s + r.efficiency, 0) / result.length) * 10) / 10, desperdicio: Math.round((100 - avgEff) * 10) / 10, pecas_totais: totalPecas, area_total: parseFloat((areaTotal / 1e6).toFixed(2)) }
    // Salvar peças da otimização para reutilização futura
    const pecasParaSalvar = pecas.filter(p => int(p.largura) && int(p.altura) && int(p.quantidade)).map(p => ({ id: uid(), otimizacao_id: id, largura: int(p.largura), altura: int(p.altura), quantidade: int(p.quantidade) }))
    try {
      for (const c of data.chapas) { if (c.cor === cor) await DB.chapas.update(c.id, { quantidade: Math.max(0, c.quantidade - chapasUsadas) }) }
      await DB.retalhos.insertMany(novosRetalhos)
      await DB.otimizacoes.insert(novaOtm)
      await DB.pecas.insertMany(pecasParaSalvar)
      const novasChapas = data.chapas.map(c => c.cor === cor ? { ...c, quantidade: Math.max(0, c.quantidade - chapasUsadas) } : c)
      const otmLocal = { ...novaOtm, chapasUsadas, pecasTotais: novaOtm.pecas_totais, areaTotal: novaOtm.area_total, criadoEm: Date.now() }
      setData(d => ({ ...d, chapas: novasChapas, retalhos: [...d.retalhos, ...novosRetalhos.map(r => ({ ...r, criado_em: Date.now() }))], otimizacoes: [otmLocal, ...d.otimizacoes] }))
      navigate("history")
    } catch (e) { alert("Erro ao finalizar: " + e.message) }
  }

  const STEPS = ["Configuração", "Peças", "Resumo", "Resultado"]
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
        {STEPS.map((s, i) => (<div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><div style={{ width: 28, height: 28, borderRadius: "50%", background: i + 1 < step ? T.green : i + 1 === step ? T.green : T.border, color: i + 1 <= step ? "#fff" : T.textMuted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1 < step ? <Check size={13} /> : i + 1}</div><span style={{ fontSize: 9, color: i + 1 <= step ? T.greenDark : T.textMuted, fontWeight: 600, whiteSpace: "nowrap" }}>{s}</span></div>{i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i + 1 < step ? T.green : T.border, margin: "0 4px", marginBottom: 16 }} />}</div>))}
      </div>

      {step === 1 && (
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Nova Otimização</div>
          <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 24 }}>Selecione a cor da chapa</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
            {["incolor", "verde", "fume"].map(c => { const stock = data.chapas.filter(ch => ch.cor === c).reduce((s, ch) => s + ch.quantidade, 0); return (<button key={c} onClick={() => setCor(c)} style={{ padding: "16px 8px", borderRadius: 14, border: `2px solid ${cor === c ? T.green : T.border}`, background: cor === c ? T.greenLight : "#fff", cursor: "pointer", textAlign: "center" }}><div style={{ width: 36, height: 36, borderRadius: 6, background: COR[c]?.bg, border: `2px solid ${COR[c]?.stroke}`, margin: "0 auto 8px" }} /><div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{COR[c]?.label}</div><div style={{ fontSize: 11, color: stock > 0 ? T.green : T.red, fontWeight: 600 }}>{stock} chapas</div></button>) })}
          </div>
          <div style={{ background: T.greenLight, borderRadius: 12, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 10 }}><Info size={16} color={T.green} style={{ flexShrink: 0, marginTop: 2 }} /><div style={{ fontSize: 13, color: T.greenDark }}><strong>+2mm por lado (+4mm total)</strong> aplicado automaticamente.</div></div>
          <Btn onClick={() => setStep(2)} fullWidth size="lg" icon={<ChevronRight size={18} />}>Continuar — Adicionar Peças</Btn>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <ArrowLeft size={20} style={{ cursor: "pointer", color: T.textMid }} onClick={() => setStep(1)} />
            <div><div style={{ fontSize: 20, fontWeight: 800 }}>Adicionar Peças</div><Pill cor={cor} /></div>
          </div>
          {pecasPreenchidas && <div style={{ background: T.greenLight, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: T.greenDark }}>✓ Peças da otimização anterior carregadas. Edite se necessário.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 72px 36px", gap: 8, padding: "0 2px", marginBottom: 6 }}>{["Largura (mm)", "Altura (mm)", "Qtd.", ""].map((h, i) => <div key={i} style={{ fontSize: 11, fontWeight: 700, color: T.textMuted }}>{h}</div>)}</div>
          {pecas.map(p => (<div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 72px 36px", gap: 8, marginBottom: 8, alignItems: "center" }}>{["largura", "altura"].map(field => (<input key={field} type="number" value={p[field]} onChange={e => updatePeca(p.id, field, e.target.value)} placeholder={field === "largura" ? "500" : "980"} style={{ padding: "10px 10px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 14, outline: "none", background: "#F9FAFB", width: "100%", boxSizing: "border-box" }} />))}<input type="number" value={p.quantidade} min={1} onChange={e => updatePeca(p.id, "quantidade", Math.max(1, parseInt(e.target.value) || 1))} style={{ padding: "10px 8px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 14, outline: "none", background: "#F9FAFB", textAlign: "center", width: "100%", boxSizing: "border-box" }} /><button onClick={() => removePeca(p.id)} style={{ background: T.redLight, border: "none", borderRadius: 8, width: 36, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={14} color={T.red} /></button></div>))}
          <Btn onClick={addPeca} variant="secondary" size="sm" style={{ marginTop: 8, marginBottom: 20 }} icon={<Plus size={14} />}>Adicionar linha</Btn>
          <div style={{ background: T.greenLight, borderRadius: 12, padding: "14px 16px", marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><div style={{ fontSize: 11, color: T.textMuted }}>Total de peças</div><div style={{ fontSize: 22, fontWeight: 800, color: T.greenDark }}>{totalPecas} itens</div></div>
            <div><div style={{ fontSize: 11, color: T.textMuted }}>Área total</div><div style={{ fontSize: 22, fontWeight: 800, color: T.greenDark }}>{(areaTotal / 1e6).toFixed(2)} m²</div></div>
          </div>
          <Btn onClick={() => setStep(3)} fullWidth size="lg" disabled={totalPecas === 0} icon={<ChevronRight size={18} />}>Continuar para Resumo</Btn>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}><ArrowLeft size={20} style={{ cursor: "pointer", color: T.textMid }} onClick={() => setStep(2)} /><div style={{ fontSize: 20, fontWeight: 800 }}>Confirmar Otimização</div></div>
          <div style={{ background: T.card, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[["Cor", <Pill cor={cor} />], ["Peças", <span style={{ fontSize: 18, fontWeight: 800 }}>{totalPecas}</span>], ["Área total", <span style={{ fontSize: 16, fontWeight: 700 }}>{(areaTotal / 1e6).toFixed(2)} m²</span>], ["Acréscimo", <span style={{ fontSize: 14, fontWeight: 700, color: T.green }}>+4mm/peça</span>]].map(([l, v], i) => (<div key={i}><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{l}</div>{v}</div>))}
            </div>
          </div>
          <div style={{ background: T.card, borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Peças</div>
            <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr 44px", gap: 6, marginBottom: 6 }}>{["#", "Largura", "Altura", "Qtd"].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.textMuted }}>{h}</div>)}</div>
            {pecas.filter(p => int(p.largura) && int(p.altura)).map((p, i) => (<div key={p.id} style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr 44px", gap: 6, paddingBottom: 8, borderBottom: `1px solid ${T.border}`, marginBottom: 8 }}><div style={{ fontSize: 12, color: T.textMuted }}>{i + 1}</div><div style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>{p.largura}</div><div style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>{p.altura}</div><div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>{p.quantidade}×</div></div>))}
          </div>
          {error && <div style={{ background: T.redLight, border: `1px solid ${T.red}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: T.red }}>{error}</div>}
          <Btn onClick={handleOptimize} fullWidth size="lg" disabled={loading} icon={loading ? <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={18} />}>{loading ? "Calculando..." : "Iniciar Otimização"}</Btn>
        </div>
      )}

      {step === 4 && result && (() => {
        const s = result[currentSheet]
        return (
          <div>
            <div style={{ background: T.greenLight, borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
              <CheckCircle size={22} color={T.green} />
              <div><div style={{ fontSize: 15, fontWeight: 700, color: T.greenDark }}>Otimização concluída!</div><div style={{ fontSize: 12, color: T.greenDark }}>{result.length} chapa(s) · {result.reduce((t, sh) => t + sh.pieces.length, 0)} peças · {sheetInfo?.largura}×{sheetInfo?.altura} mm</div></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
              {result.map((sh, i) => (<button key={i} onClick={() => setCurrentSheet(i)} style={{ padding: "8px 14px", borderRadius: 10, border: `2px solid ${currentSheet === i ? (sh.isRetalho ? T.amber : T.green) : T.border}`, background: currentSheet === i ? (sh.isRetalho ? T.amber : T.green) : T.card, color: currentSheet === i ? "#fff" : T.textMid, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0, minWidth: 80, textAlign: "center" }}>{sh.isRetalho ? "📦 Retalho" : `Chapa ${i + 1}`}<div style={{ fontSize: 10 }}>{sh.efficiency}%</div></button>))}
            </div>
            <div style={{ background: T.dark, borderRadius: 14, padding: "14px 14px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#9CA3AF", fontSize: 12, marginBottom: 10 }}>
                <span>
                  {s.isRetalho
                    ? <span style={{ color: "#FCD34D", fontWeight: 700 }}>📦 {s.retalhoLabel}</span>
                    : <span>Chapa {currentSheet + 1} de {result.length} · {s.width}×{s.height} mm</span>
                  }
                </span>
                <span style={{ color: cortadas.has(currentSheet) ? T.green : T.amber, fontWeight: 700 }}>{cortadas.has(currentSheet) ? "✓ Cortada" : "Pendente"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                {[["Peças", s.pieces.length, "#fff"], ["Aproveit.", `${s.efficiency}%`, T.green], ["Desperdício", `${(100 - s.efficiency).toFixed(1)}%`, "#FCA5A5"], ["Retalhos", s.freeRects.length, "#9CA3AF"]].map(([l, v, c]) => (<div key={l} style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: "#9CA3AF" }}>{l}</div><div style={{ fontSize: 15, fontWeight: 800, color: c }}>{v}</div></div>))}
              </div>
              {s.errors.length > 0 && <div style={{ background: "#7F1D1D", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>{s.errors.map((e, i) => <div key={i} style={{ color: "#FCA5A5", fontSize: 12 }}>⚠ {e}</div>)}</div>}
              <div style={{ overflowX: "auto" }}><SheetSVG sheet={s} maxW={Math.min(380, window.innerWidth - 60)} /></div>
              <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9CA3AF" }}><div style={{ width: 14, height: 10, background: "#DCFCE7", border: "1.5px solid #16A34A", borderRadius: 2 }} /> Peça cortada</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9CA3AF" }}><div style={{ width: 14, height: 10, background: "#2D3B2D", border: "1.5px dashed #4B5563", borderRadius: 2 }} /> Sobra / Borda</div>
              </div>
            </div>

            {s.mainScrap && (<div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Maior retalho — Chapa {currentSheet + 1}</div><div style={{ display: "flex", gap: 12, alignItems: "center" }}><div style={{ width: 44, height: 54, background: T.greenLight, border: `2px dashed ${T.green}`, borderRadius: 6, flexShrink: 0 }} /><div><div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>{Math.round(s.mainScrap.w)} × {Math.round(s.mainScrap.h)} mm</div><div style={{ fontSize: 12, color: T.textMuted }}>Área: {area_m2(s.mainScrap.w, s.mainScrap.h)} m²</div><div style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>Salvo em Retalhos ao finalizar</div></div></div></div>)}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {currentSheet > 0 && <Btn onClick={() => setCurrentSheet(i => i - 1)} variant="ghost" size="sm" icon={<ChevronLeft size={16} />}>Anterior</Btn>}
              {!cortadas.has(currentSheet) && <Btn onClick={() => setCortadas(prev => new Set([...prev, currentSheet]))} variant="secondary" size="sm" icon={<Check size={16} />} style={{ flex: 1 }}>Marcar cortada</Btn>}
              {currentSheet < result.length - 1 ? <Btn onClick={() => setCurrentSheet(i => i + 1)} size="sm" icon={<ChevronRight size={16} />} style={{ flex: 1 }}>Próxima chapa</Btn> : <Btn onClick={handleFinalize} size="sm" icon={<CheckCircle size={16} />} style={{ flex: 1 }}>Finalizar e salvar</Btn>}
            </div>
          </div>
        )
      })()}
      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// DETALHE DA OTIMIZAÇÃO (Histórico → clica → abre aqui)
// ══════════════════════════════════════════════════════════
function HistoryDetail({ otimizacao, onVoltar, onReutilizar }) {
  const [pecas, setPecas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    DB.pecas.getByOtimizacao(otimizacao.id)
      .then(data => { setPecas(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [otimizacao.id])

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <ArrowLeft size={20} style={{ cursor: "pointer", color: T.textMid }} onClick={onVoltar} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace" }}>{otimizacao.id}</div>
          <div style={{ fontSize: 12, color: T.textMuted }}>{fmt_date(otimizacao.criado_em ?? otimizacao.criadoEm)}</div>
        </div>
      </div>

      {/* Resumo */}
      <div style={{ background: T.dark, borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Pill cor={otimizacao.cor} />
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>8mm</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[["Aproveitamento", `${otimizacao.aproveitamento}%`, T.green], ["Desperdício", `${otimizacao.desperdicio}%`, "#FCA5A5"], ["Chapas usadas", otimizacao.chapas_usadas ?? otimizacao.chapasUsadas, "#fff"], ["Peças totais", otimizacao.pecas_totais ?? otimizacao.pecasTotais, "#fff"], ["Área total", `${otimizacao.area_total ?? otimizacao.areaTotal} m²`, "#9CA3AF"]].map(([l, v, c]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Peças */}
      <div style={{ background: T.card, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Peças otimizadas</div>
        {loading ? (
          <div style={{ textAlign: "center", color: T.textMuted, padding: 20 }}>Carregando peças...</div>
        ) : pecas.length > 0 ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
              {["#", "Largura", "Altura", "Qtd"].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.textMuted }}>{h}</div>)}
            </div>
            {pecas.map((p, i) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, paddingBottom: 10, borderBottom: `1px solid ${T.border}`, marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: T.textMuted }}>{i + 1}</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>{p.largura}</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>{p.altura}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.green }}>{p.quantidade}×</div>
              </div>
            ))}
          </>
        ) : (
          <div style={{ textAlign: "center", color: T.textMuted, padding: 20 }}>
            <div style={{ fontSize: 13 }}>Peças não disponíveis para esta otimização.</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Otimizações futuras salvarão as peças automaticamente.</div>
          </div>
        )}
      </div>

      {/* Botões */}
      <div style={{ display: "flex", gap: 12 }}>
        <Btn onClick={onVoltar} variant="secondary" size="md" style={{ flex: 1 }} icon={<ArrowLeft size={16} />}>Voltar</Btn>
        {pecas.length > 0 && (
          <Btn onClick={() => onReutilizar(otimizacao.cor, pecas)} size="md" style={{ flex: 1 }} icon={<RotateCcw size={16} />}>
            Reutilizar
          </Btn>
        )}
      </div>

      {pecas.length > 0 && (
        <div style={{ background: T.greenLight, borderRadius: 10, padding: "10px 14px", marginTop: 12, fontSize: 12, color: T.greenDark }}>
          💡 Clique em <strong>Reutilizar</strong> para abrir uma nova otimização com as mesmas peças já preenchidas.
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// HISTÓRICO
// ══════════════════════════════════════════════════════════
function HistoryScreen({ data, navigate, onReutilizar }) {
  const [detalhe, setDetalhe] = useState(null)

  if (detalhe) {
    return (
      <HistoryDetail
        otimizacao={detalhe}
        onVoltar={() => setDetalhe(null)}
        onReutilizar={(cor, pecas) => { onReutilizar(cor, pecas); navigate("new-opt") }}
      />
    )
  }

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Histórico</div>
      <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>Clique em uma otimização para ver detalhes ou reutilizar</div>
      {data.otimizacoes.map(o => (
        <div key={o.id} onClick={() => setDetalhe(o)}
          style={{ background: T.card, borderRadius: 16, padding: "16px 18px", marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", cursor: "pointer", border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 800, fontFamily: "monospace" }}>{o.id}</span>
                <Pill cor={o.cor} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div><div style={{ fontSize: 10, color: T.textMuted }}>Aproveitamento</div><div style={{ fontSize: 18, fontWeight: 800, color: T.green }}>{o.aproveitamento}%</div></div>
                <div><div style={{ fontSize: 10, color: T.textMuted }}>Chapas</div><div style={{ fontSize: 18, fontWeight: 800 }}>{o.chapas_usadas ?? o.chapasUsadas}</div></div>
                <div><div style={{ fontSize: 10, color: T.textMuted }}>Peças</div><div style={{ fontSize: 18, fontWeight: 800 }}>{o.pecas_totais ?? o.pecasTotais}</div></div>
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8 }}>{fmt_date(o.criado_em ?? o.criadoEm)}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.green, fontSize: 13, fontWeight: 600, marginLeft: 12 }}>
              <Eye size={16} /> Ver
            </div>
          </div>
        </div>
      ))}
      {!data.otimizacoes.length && (<div style={{ textAlign: "center", padding: "48px 24px", color: T.textMuted }}><Clock size={40} style={{ marginBottom: 12, opacity: 0.4 }} /><div style={{ fontSize: 15, fontWeight: 600 }}>Nenhuma otimização ainda</div></div>)}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// RETALHOS
// ══════════════════════════════════════════════════════════
function ScrapsScreen({ data, setData }) {
  const ativos = data.retalhos.filter(r => r.status === "ativo")
  const descartados = data.retalhos.filter(r => r.status === "descartado")
  const updateStatus = async (id, status) => {
    try { await DB.retalhos.update(id, { status }); setData(d => ({ ...d, retalhos: d.retalhos.map(r => r.id === id ? { ...r, status } : r) })) }
    catch (e) { alert("Erro: " + e.message) }
  }
  const RetalhoCard = ({ r }) => (<div style={{ background: T.card, borderRadius: 14, padding: "14px 16px", marginBottom: 8, display: "flex", gap: 12, alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}><div style={{ width: 40, height: 50, background: COR[r.cor]?.piece || T.greenLight, border: `2px dashed ${COR[r.cor]?.stroke || T.green}`, borderRadius: 6, flexShrink: 0 }} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>{r.largura} × {r.altura} mm</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}><Pill cor={r.cor} /><span style={{ fontSize: 12, color: T.textMuted }}>{r.area} m²</span></div><div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>de {r.origem}</div></div>{r.status === "ativo" ? <button onClick={() => updateStatus(r.id, "descartado")} style={{ background: T.redLight, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.red, fontWeight: 600 }}><Trash2 size={13} /> Descartar</button> : <button onClick={() => updateStatus(r.id, "ativo")} style={{ background: T.greenLight, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.greenDark, fontWeight: 600 }}><RotateCcw size={13} /> Restaurar</button>}</div>)
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Retalhos</div>
      <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 16 }}>Gerados automaticamente após cada otimização</div>
      <div style={{ background: T.card, borderRadius: 16, padding: "14px 18px", marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div><div style={{ fontSize: 22, fontWeight: 800, color: T.green }}>{ativos.length}</div><div style={{ fontSize: 11, color: T.textMuted }}>Ativos</div></div>
        <div><div style={{ fontSize: 22, fontWeight: 800 }}>{descartados.length}</div><div style={{ fontSize: 11, color: T.textMuted }}>Descartados</div></div>
        <div><div style={{ fontSize: 18, fontWeight: 800, color: T.textMid }}>{ativos.reduce((s, r) => s + r.area, 0).toFixed(2)} m²</div><div style={{ fontSize: 11, color: T.textMuted }}>Área ativa</div></div>
      </div>
      {ativos.length > 0 && <><div style={{ fontSize: 14, fontWeight: 700, color: T.green, marginBottom: 10 }}>✓ Ativos</div>{ativos.map(r => <RetalhoCard key={r.id} r={r} />)}</>}
      {descartados.length > 0 && <><div style={{ fontSize: 14, fontWeight: 700, color: T.textMuted, marginTop: 20, marginBottom: 10 }}>✗ Descartados</div>{descartados.map(r => <RetalhoCard key={r.id} r={r} />)}</>}
      {!data.retalhos.length && <div style={{ textAlign: "center", padding: "48px 24px", color: T.textMuted }}><Scissors size={40} style={{ marginBottom: 12, opacity: 0.4 }} /><div style={{ fontSize: 15, fontWeight: 600 }}>Nenhum retalho ainda</div></div>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// APP SHELL
// ══════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("dashboard")
  const [data, setData] = useState({ chapas: [], retalhos: [], otimizacoes: [], loading: true })
  const [menuOpen, setMenuOpen] = useState(false)
  const [dbError, setDbError] = useState("")
  const [pecasReutilizar, setPecasReutilizar] = useState(null) // { cor, pecas }

  useEffect(() => {
    DB.loadAll().then(d => setData({ ...d, loading: false })).catch(e => { setDbError(e.message); setData(d => ({ ...d, loading: false })) })
  }, [])

  useEffect(() => {
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&display=swap"; document.head.appendChild(l)
  }, [])

  const handleReutilizar = (cor, pecas) => {
    setPecasReutilizar({ cor, pecas: pecas.map(p => ({ id: uid(), largura: String(p.largura), altura: String(p.altura), quantidade: p.quantidade })) })
    setScreen("new-opt")
  }

  const handleNavigate = (screen) => {
    if (screen !== "new-opt") setPecasReutilizar(null)
    setScreen(screen)
  }

  const NAV = [
    { id: "dashboard", icon: <Home size={20} />, label: "Dashboard" },
    { id: "new-opt", icon: <Plus size={22} />, label: "Otimizar" },
    { id: "stock", icon: <Layers size={20} />, label: "Estoque" },
    { id: "scraps", icon: <Scissors size={20} />, label: "Retalhos" },
    { id: "history", icon: <Clock size={20} />, label: "Histórico" },
  ]

  if (data.loading) return (<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.dark, flexDirection: "column", gap: 16 }}><div style={{ fontSize: 30, fontWeight: 800, color: T.green }}>OTM<span style={{ color: "#fff" }}>glass</span></div><RefreshCw size={26} color={T.green} style={{ animation: "spin 1s linear infinite" }} /><style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style></div>)
  if (dbError) return (<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.dark, flexDirection: "column", gap: 16, padding: 32 }}><AlertTriangle size={40} color="#EF4444" /><div style={{ color: "#fff", fontSize: 18, fontWeight: 700, textAlign: "center" }}>Erro de conexão com o banco</div><div style={{ background: "#1F2937", borderRadius: 8, padding: "12px 16px", color: "#EF4444", fontSize: 12, fontFamily: "monospace", maxWidth: 400, wordBreak: "break-all" }}>{dbError}</div></div>)

  const props = { data, setData, navigate: handleNavigate }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", minHeight: "100vh", background: T.bg, fontFamily: "'Barlow', sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ background: T.dark, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {screen !== "dashboard" ? <ArrowLeft size={20} color="#9CA3AF" style={{ cursor: "pointer" }} onClick={() => handleNavigate("dashboard")} /> : <MoreVertical size={20} color="#9CA3AF" style={{ cursor: "pointer" }} onClick={() => setMenuOpen(true)} />}
          <span style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>OTM<span style={{ color: T.green }}>glass</span></span>
        </div>
        <div style={{ position: "relative" }}>
          <Bell size={20} color="#9CA3AF" />
          {data.chapas.some(c => c.quantidade <= 4) && <span style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, background: T.red, borderRadius: "50%", fontSize: 9, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>!</span>}
        </div>
      </div>

      {menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }}>
          <div style={{ background: T.dark, width: 280, height: "100%", display: "flex", flexDirection: "column", boxShadow: "4px 0 24px rgba(0,0,0,.5)" }}>
            <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid #1F2D1F", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>OTM<span style={{ color: T.green }}>glass</span></div><div style={{ fontSize: 11, color: "#4ADE80" }}>Intelligent Glass Optimization</div></div>
              <X size={20} color="#9CA3AF" style={{ cursor: "pointer" }} onClick={() => setMenuOpen(false)} />
            </div>
            {NAV.map(n => (<button key={n.id} onClick={() => { handleNavigate(n.id); setMenuOpen(false) }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", background: screen === n.id ? "#1A2A1A" : "none", border: "none", width: "100%", cursor: "pointer", borderLeft: screen === n.id ? `3px solid ${T.green}` : "3px solid transparent" }}><span style={{ color: screen === n.id ? T.green : "#9CA3AF" }}>{n.icon}</span><span style={{ color: screen === n.id ? "#fff" : "#9CA3AF", fontSize: 14, fontWeight: 600 }}>{n.label}</span></button>))}
            <div style={{ marginTop: "auto", padding: "16px 24px", borderTop: "1px solid #1F2D1F", fontSize: 11, color: "#4B5563", textAlign: "center" }}>OTMglass v1.2.0 · Supabase + Vercel</div>
          </div>
          <div style={{ flex: 1, background: "rgba(0,0,0,.5)" }} onClick={() => setMenuOpen(false)} />
        </div>
      )}

      <div style={{ flex: 1, padding: "20px 20px 100px", overflowY: "auto" }}>
        {screen === "dashboard" && <Dashboard {...props} />}
        {screen === "stock" && <StockScreen {...props} />}
        {screen === "new-opt" && <NewOptimization key={pecasReutilizar ? "reutilizar" : "novo"} {...props} pecasPreenchidas={pecasReutilizar} />}
        {screen === "scraps" && <ScrapsScreen {...props} />}
        {screen === "history" && <HistoryScreen {...props} onReutilizar={handleReutilizar} />}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 560, background: T.dark, borderTop: "1px solid #1F2D1F", display: "flex", padding: "10px 0 16px", zIndex: 100 }}>
        {NAV.map(n => {
          const active = screen === n.id, isCenter = n.id === "new-opt"
          return (<button key={n.id} onClick={() => handleNavigate(n.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "0 4px" }}>{isCenter ? <div style={{ width: 48, height: 48, borderRadius: "50%", background: T.green, display: "flex", alignItems: "center", justifyContent: "center", marginTop: -20, boxShadow: `0 0 0 4px ${T.dark}` }}><span style={{ color: "#fff" }}>{n.icon}</span></div> : <span style={{ color: active ? T.green : "#6B7280" }}>{n.icon}</span>}<span style={{ fontSize: 10, fontWeight: 600, color: isCenter ? T.green : active ? T.green : "#6B7280" }}>{n.label}</span></button>)
        })}
      </div>

      <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;background:${T.bg}}input:focus{border-color:${T.green}!important;box-shadow:0 0 0 3px ${T.greenLight}}button:active{opacity:.85;transform:scale(.97)}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#374151;border-radius:4px}`}</style>
    </div>
  )
}
