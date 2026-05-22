import { useState, useEffect } from "react"
import { supabase } from "./supabase.js"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import {
  Home, Plus, Layers, Scissors, Clock, Bell, ChevronRight, Trash2,
  Check, RefreshCw, ArrowLeft, AlertTriangle, X, Zap,
  TrendingUp, Package, Info, CheckCircle, MoreVertical, ChevronLeft,
  RotateCcw, Eye, BarChart2, Menu, ZoomIn,
} from "lucide-react"

// ══════════════════════════════════════════════════════════
// TOKENS
// ══════════════════════════════════════════════════════════
const T = {
  green: "#22C55E", greenDark: "#15803D", greenLight: "#DCFCE7",
  dark: "#111A11", dark2: "#1A2A1A", card: "#FFFFFF", bg: "#F0F4F0",
  border: "#E2E8E2", text: "#111827", textMid: "#4B5563", textMuted: "#9CA3AF",
  red: "#EF4444", redLight: "#FEF2F2", amber: "#F59E0B", amberLight: "#FFFBEB",
  sidebar: "#0D160D",
}

const COR = {
  incolor: { label: "Incolor", bg: "#EFF6FF", dot: "#60A5FA", piece: "#B3D4F0", stroke: "#2563EB", pieceText: "#0F172A", scrapText: "#EF4444" },
  verde:   { label: "Verde",   bg: "#F0FDF4", dot: "#22C55E", piece: "#A8D5A2", stroke: "#16A34A", pieceText: "#0F172A", scrapText: "#EF4444" },
  fume:    { label: "Fumê",    bg: "#1F2937", dot: "#9CA3AF", piece: "#8A8A8A", stroke: "#4B5563", pieceText: "#FFFFFF", scrapText: "#EF4444" },
}

// ══════════════════════════════════════════════════════════
// RESPONSIVE
// ══════════════════════════════════════════════════════════
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])
  return isMobile
}

// ══════════════════════════════════════════════════════════
// DATABASE
// ══════════════════════════════════════════════════════════
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
    async update(id, f) { const { error } = await supabase.from("chapas").update(f).eq("id", id); if (error) throw error },
    async delete(id) { const { error } = await supabase.from("chapas").delete().eq("id", id); if (error) throw error },
  },
  retalhos: {
    async insertMany(rows) {
      if (!rows.length) return
      const { error } = await supabase.from("retalhos").insert(rows.map(r => ({ ...r, criado_em: Date.now() })))
      if (error) throw error
    },
    async update(id, f) { const { error } = await supabase.from("retalhos").update(f).eq("id", id); if (error) throw error },
    async delete(id) { const { error } = await supabase.from("retalhos").delete().eq("id", id); if (error) throw error },
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
    async getByOtimizacao(id) {
      const { data, error } = await supabase.from("otimizacao_pecas").select("*").eq("otimizacao_id", id)
      if (error) throw error
      return data || []
    },
  },
}

// ══════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase()
const genId = () => "#OTM-" + uid()
const area_m2 = (w, h) => ((w * h) / 1e6).toFixed(2)
const int = (v) => parseInt(v, 10) || 0
const fmt_date = (ts) => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
const isToday = (ts) => new Date(ts).toDateString() === new Date().toDateString()

// ══════════════════════════════════════════════════════════
// MAXRECTS ALGORITHM
// ══════════════════════════════════════════════════════════
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return !(ax >= bx + bw || ax + aw <= bx || ay >= by + bh || ay + ah <= by)
}
function isContained(inner, outer) {
  return outer.x <= inner.x && outer.y <= inner.y &&
    outer.x + outer.w >= inner.x + inner.w && outer.y + outer.h >= inner.y + inner.h
}

function packOneSheet(pieces, W, H) {
  let freeRects = [{ x: 0, y: 0, w: W, h: H }]
  const placed = [], notPlaced = []
  for (const piece of pieces) {
    const pw = int(piece.w), ph = int(piece.h)
    if (!pw || !ph) continue
    let best1 = Infinity, best2 = Infinity, bestRect = null, bestRot = false
    for (const rect of freeRects) {
      if (pw <= rect.w && ph <= rect.h) {
        const s1 = Math.min(rect.w - pw, rect.h - ph), s2 = Math.max(rect.w - pw, rect.h - ph)
        if (s1 < best1 || (s1 === best1 && s2 < best2)) { best1 = s1; best2 = s2; bestRect = rect; bestRot = false }
      }
      if (ph <= rect.w && pw <= rect.h) {
        const s1 = Math.min(rect.w - ph, rect.h - pw), s2 = Math.max(rect.w - ph, rect.h - pw)
        if (s1 < best1 || (s1 === best1 && s2 < best2)) { best1 = s1; best2 = s2; bestRect = rect; bestRot = true }
      }
    }
    if (!bestRect) { notPlaced.push(piece); continue }
    const fw = bestRot ? ph : pw, fh = bestRot ? pw : ph
    const px = bestRect.x, py = bestRect.y
    placed.push({ x: px, y: py, pw: fw, ph: fh, rotated: bestRot, ref: piece })
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
    if (p.x + p.pw > W + 1) errors.push("Peça ultrapassa largura")
    if (p.y + p.ph > H + 1) errors.push("Peça ultrapassa altura")
  }
  return errors
}

function buildSheet(placed, freeRects, W, H, extra) {
  const usedArea = placed.reduce((s, p) => s + p.pw * p.ph, 0)
  const totalArea = W * H
  const eff = (usedArea / totalArea) * 100
  const scraps = freeRects.filter(r => r.w >= 50 && r.h >= 50)
  return {
    width: W, height: H, pieces: placed,
    freeRects: freeRects.filter(r => r.w >= 10 && r.h >= 10),
    scraps,
    mainScrap: scraps.reduce((best, r) => (!best || r.w * r.h > best.w * best.h) ? r : best, null),
    efficiency: Math.round(eff * 10) / 10,
    usedArea, totalArea,
    errors: validateSheet(placed, W, H),
    ...extra,
  }
}

function runFullOptimization(pecas, chapas, retalhos, cor) {
  const allPieces = []
  pecas.forEach(p => {
    const W = int(p.largura), H = int(p.altura), Q = int(p.quantidade)
    if (!W || !H || !Q) return
    for (let i = 0; i < Q; i++) allPieces.push({ w: W + 4, h: H + 4, origW: W, origH: H })
  })
  if (allPieces.length === 0) return []
  allPieces.sort((a, b) => b.w * b.h - a.w * a.h)

  const results = []
  let toPlace = [...allPieces]

  // 1. Chapas novas primeiro
  const chapaDaCor = chapas.filter(c => c.cor === cor && c.quantidade > 0)
    .reduce((best, c) => (!best || c.largura * c.altura > best.largura * best.altura) ? c : best, null)

  if (chapaDaCor) {
    let remaining = [...toPlace]
    while (remaining.length > 0) {
      const { placed, notPlaced, freeRects } = packOneSheet(remaining, int(chapaDaCor.largura), int(chapaDaCor.altura))
      if (placed.length === 0) break
      results.push(buildSheet(placed, freeRects, int(chapaDaCor.largura), int(chapaDaCor.altura), { isRetalho: false }))
      remaining = notPlaced
    }
    toPlace = []
  }

  // 2. Retalhos por último — menor que cabe primeiro
  const retalhosDaCor = retalhos.filter(r => r.status === "ativo" && r.cor === cor)
    .sort((a, b) => a.largura * a.altura - b.largura * b.altura)

  for (const retalho of retalhosDaCor) {
    if (toPlace.length === 0) break
    const rW = int(retalho.largura), rH = int(retalho.altura)
    const candidatos = toPlace.filter(p => (p.w <= rW && p.h <= rH) || (p.h <= rW && p.w <= rH))
    if (candidatos.length === 0) continue
    const { placed, notPlaced, freeRects } = packOneSheet(candidatos, rW, rH)
    if (placed.length === 0) continue
    results.push(buildSheet(placed, freeRects, rW, rH, {
      isRetalho: true, retalhoId: retalho.id,
      retalhoLabel: "Retalho " + rW + "×" + rH,
    }))
    const placedRefs = new Set(placed.map(p => p.ref))
    toPlace = toPlace.filter(p => !placedRefs.has(p))
  }

  return results
}

// ══════════════════════════════════════════════════════════
// SVG DA CHAPA — profissional com texto rotacionado
// ══════════════════════════════════════════════════════════
function SheetSVG({ sheet, cor, maxW, onZoom }) {
  const W = maxW || 480
  const scaleX = W / sheet.width
  const svgH = Math.min(sheet.height * scaleX, 560)
  const scaleY = svgH / sheet.height
  const sx = v => Math.round(v * scaleX)
  const sy = v => Math.round(v * scaleY)

  const c = COR[cor] || COR.incolor
  const pieceColor = c.piece
  const pieceStroke = c.stroke
  const pieceTextColor = c.pieceText
  const scrapFill = "#D1D5DB"       // cinza claro
  const scrapTextColor = "#EF4444"  // vermelho
  const scrapLabelColor = "#9CA3AF" // cinza médio
  const bgColor = "#0D1A0D"
  const gridColor = "#142014"
  const whiteText = "#FFFFFF"

  // Retalhos significativos numerados
  const sigScraps = [...sheet.freeRects]
    .filter(r => r.w >= 60 && r.h >= 60)
    .sort((a, b) => b.w * b.h - a.w * a.h)

  // Função para renderizar texto — vertical ou horizontal baseado na proporção
  function renderText(x, y, w, h, lines, color, fontWeight) {
    if (w < 12 || h < 12) return null
    const isVertical = h > w * 1.3 // mais alto que largo → texto vertical
    const fontSize = Math.max(8, Math.min(13, Math.min(w, h) * 0.14))
    const lineH = fontSize + 3
    const totalH = lines.length * lineH
    const cx = x + w / 2
    const cy = y + h / 2

    if (isVertical) {
      return (
        <g>
          {lines.map((line, i) => (
            <text key={i}
              x={cx}
              y={cy - ((lines.length - 1) / 2 - i) * lineH}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={fontSize}
              fill={color}
              fontFamily="monospace"
              fontWeight={fontWeight || "700"}
              transform={"rotate(-90," + cx + "," + cy + ")"}
              style={{ userSelect: "none" }}>
              {line}
            </text>
          ))}
        </g>
      )
    }
    return (
      <g>
        {lines.map((line, i) => (
          <text key={i}
            x={cx}
            y={cy - ((lines.length - 1) / 2 - i) * lineH}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={fontSize}
            fill={color}
            fontFamily="monospace"
            fontWeight={fontWeight || "700"}
            style={{ userSelect: "none" }}>
            {line}
          </text>
        ))}
      </g>
    )
  }

  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "#0D1A0D", padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "monospace" }}>
          MAPA DE CORTE · {sheet.width} × {sheet.height} mm
          {sheet.isRetalho && <span style={{ color: T.amber, marginLeft: 8 }}>RETALHO</span>}
        </span>
        {onZoom && (
          <button onClick={onZoom}
            style={{ background: "#1A2A1A", border: "1px solid #2A3A2A", borderRadius: 6, padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: "#9CA3AF", fontSize: 11 }}>
            <ZoomIn size={13} /> Ampliar
          </button>
        )}
      </div>

      <svg width={W} height={svgH} style={{ display: "block", background: bgColor }}>
        {/* Fundo */}
        <rect width={W} height={svgH} fill={bgColor} />

        {/* Grid */}
        {Array.from({ length: 25 }, (_, i) => (
          <line key={"gv" + i} x1={Math.round(W * i / 25)} y1={0} x2={Math.round(W * i / 25)} y2={svgH} stroke={gridColor} strokeWidth={0.5} />
        ))}
        {Array.from({ length: 20 }, (_, i) => (
          <line key={"gh" + i} x1={0} y1={Math.round(svgH * i / 20)} x2={W} y2={Math.round(svgH * i / 20)} stroke={gridColor} strokeWidth={0.5} />
        ))}

        {/* Área total da chapa (borda) */}
        <rect x={1} y={1} width={W - 2} height={svgH - 2} fill="none" stroke="#2A3A2A" strokeWidth={2} />

        {/* Retalhos (cinza claro com texto vermelho) */}
        {sheet.freeRects.map((r, i) => {
          const rw = sx(r.w), rh = sy(r.h)
          if (rw < 4 || rh < 4) return null
          const scrapIdx = sigScraps.findIndex(s => s === r)
          const isSig = scrapIdx >= 0
          const lines = isSig && rw > 35 && rh > 35
            ? ["Retalho " + (scrapIdx + 1), Math.round(r.w) + "×" + Math.round(r.h), area_m2(r.w, r.h) + " m²"]
            : []
          return (
            <g key={"f" + i}>
              <rect x={sx(r.x)} y={sy(r.y)} width={rw} height={rh}
                fill={scrapFill} fillOpacity={isSig ? 0.18 : 0.08}
                stroke={isSig ? "#9CA3AF" : "#3A4A3A"}
                strokeWidth={isSig ? 1.5 : 0.8}
                strokeDasharray={isSig ? "7 3" : "3 3"} />
              {lines.length > 0 && renderText(sx(r.x), sy(r.y), rw, rh,
                ["Retalho " + (scrapIdx + 1), Math.round(r.w) + "×" + Math.round(r.h), area_m2(r.w, r.h) + " m²"],
                scrapTextColor, "700")}
            </g>
          )
        })}

        {/* Peças */}
        {sheet.pieces.map((p, i) => {
          const pw = sx(p.pw), ph = sy(p.ph)
          const origW = p.ref ? p.ref.origW : p.pw - 4
          const origH = p.ref ? p.ref.origH : p.ph - 4
          const lines = pw > 22 && ph > 18
            ? [p.pw + "×" + p.ph, "(" + origW + "×" + origH + ")"]
            : []
          return (
            <g key={"p" + i}>
              <rect x={sx(p.x) + 1} y={sy(p.y) + 1} width={pw - 2} height={ph - 2}
                fill={pieceColor} stroke={pieceStroke} strokeWidth={2} rx={2} />
              {/* Número da peça no canto */}
              {pw > 20 && ph > 16 && (
                <text x={sx(p.x) + 5} y={sy(p.y) + 11}
                  fontSize={9} fill={pieceTextColor + "88"} fontFamily="monospace" fontWeight="600">
                  {i + 1}
                </text>
              )}
              {lines.length > 0 && renderText(sx(p.x) + 1, sy(p.y) + 1, pw - 2, ph - 2, lines, pieceTextColor, "800")}
            </g>
          )
        })}

        {/* Dimensão Y (largura) — eixo inferior, texto branco */}
        <line x1={10} y1={svgH - 8} x2={W - 10} y2={svgH - 8} stroke="#4B5563" strokeWidth={1} />
        <text x={W / 2} y={svgH - 1} textAnchor="middle" fontSize={10} fill={whiteText} fontFamily="monospace" fontWeight="600">
          Y = {sheet.width} mm
        </text>
        {/* Dimensão X (comprimento) — eixo lateral, texto branco rotacionado */}
        <line x1={8} y1={10} x2={8} y2={svgH - 18} stroke="#4B5563" strokeWidth={1} />
        <text x={14} y={svgH / 2} fontSize={10} fill={whiteText} fontFamily="monospace" fontWeight="600"
          transform={"rotate(-90,14," + (svgH / 2) + ")"} textAnchor="middle">
          X = {sheet.height} mm
        </text>
      </svg>

      {/* Legenda */}
      <div style={{ background: "#0D1A0D", padding: "8px 14px", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9CA3AF" }}>
          <div style={{ width: 14, height: 10, background: pieceColor, border: "2px solid " + pieceStroke, borderRadius: 2 }} />
          Peça cortada
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9CA3AF" }}>
          <div style={{ width: 14, height: 10, background: scrapFill + "30", border: "1.5px dashed #9CA3AF", borderRadius: 2 }} />
          <span style={{ color: scrapTextColor }}>Retalho/Sobra</span>
        </div>
        {sigScraps.length > 0 && (
          <span style={{ fontSize: 11, color: T.amber, fontWeight: 600, marginLeft: "auto" }}>
            {sigScraps.length} retalho(s) gerado(s)
          </span>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// ZOOM MODAL FULLSCREEN
// ══════════════════════════════════════════════════════════
function ZoomModal({ sheet, cor, onClose }) {
  const screenW = typeof window !== "undefined" ? window.innerWidth : 800
  const screenH = typeof window !== "undefined" ? window.innerHeight : 600
  const padding = 32
  const maxW = screenW - padding * 2

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(0,0,0,0.95)",
      display: "flex", flexDirection: "column",
      overflow: "auto",
    }}>
      {/* Botão fechar */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 20px", flexShrink: 0 }}>
        <button onClick={onClose}
          style={{ background: "#1A2A1A", border: "1px solid #2A3A2A", borderRadius: 10, padding: "8px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 14, fontWeight: 700 }}>
          <X size={16} /> Fechar
        </button>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "0 " + padding + "px " + padding + "px", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: Math.min(maxW, 1200) }}>
          <SheetSVG sheet={sheet} cor={cor} maxW={Math.min(maxW, 1200)} />
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// UI ATOMS
// ══════════════════════════════════════════════════════════
function Pill({ cor }) {
  const c = COR[cor] || { label: cor, bg: "#F3F4F6", dot: "#9CA3AF" }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: c.bg, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: T.text }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  )
}

function StatCard({ icon, label, value, sub, subColor, accent }) {
  return (
    <div style={{ background: T.card, borderRadius: 16, padding: "18px 20px", flex: 1, minWidth: 0, boxShadow: "0 1px 6px rgba(0,0,0,0.08)", borderLeft: accent ? "4px solid " + accent : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: accent || T.green }}>{icon}</span>
        <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: T.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: subColor || T.green, marginTop: 5, fontWeight: 500 }}>{sub}</div>}
    </div>
  )
}

function Btn({ children, onClick, variant, size, fullWidth, icon, disabled, style }) {
  const v = variant || "primary"
  const s = size || "md"
  const vs = {
    primary:   { background: disabled ? "#9CA3AF" : T.green, color: "#fff", border: "none" },
    secondary: { background: "transparent", color: T.green, border: "2px solid " + T.green },
    ghost:     { background: "transparent", color: T.textMid, border: "none" },
    danger:    { background: T.redLight, color: T.red, border: "2px solid " + T.red },
  }
  const ps = { sm: "6px 14px", md: "11px 20px", lg: "14px 26px" }
  const fz = { sm: 12, md: 14, lg: 15 }
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...(vs[v] || vs.primary), padding: ps[s] || ps.md, fontSize: fz[s] || fz.md, borderRadius: 10, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: fullWidth ? "100%" : "auto", transition: "all .15s", ...(style || {}) }}>
      {icon && <span style={{ display: "flex" }}>{icon}</span>}
      {children}
    </button>
  )
}

// ══════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════
function Dashboard({ data, navigate }) {
  const [chartFilter, setChartFilter] = useState("semanal")

  const totalChapas = data.chapas.reduce((s, c) => s + c.quantidade, 0)
  const retalhoAtivos = data.retalhos.filter(r => r.status === "ativo").length
  const hoje = data.otimizacoes.filter(o => isToday(o.criado_em || o.criadoEm))
  const metragemHoje = hoje.reduce((s, o) => s + (o.area_total || o.areaTotal || 0), 0).toFixed(2)
  const otimizacoesHoje = hoje.length

  const buildChartData = () => {
    const days = chartFilter === "semanal" ? 7 : 30
    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
      const total = data.otimizacoes
        .filter(o => new Date(o.criado_em || o.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) === key)
        .reduce((s, o) => s + (o.area_total || o.areaTotal || 0), 0)
      result.push({ d: key, v: parseFloat(total.toFixed(2)) })
    }
    return result
  }

  const chartData = buildChartData()
  const totalProduzido = chartData.reduce((s, d) => s + d.v, 0).toFixed(2)
  const pieData = ["incolor", "verde", "fume"].map(cor => ({ name: COR[cor].label, value: data.chapas.filter(c => c.cor === cor).reduce((s, c) => s + c.quantidade, 0) }))
  const pieColors = ["#60A5FA", "#22C55E", "#6B7280"]
  const lowStock = data.chapas.filter(c => c.quantidade <= 4)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ background: T.dark, borderRadius: 18, padding: "22px 24px" }}>
        <div style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 4 }}>Resumo operacional em tempo real</div>
        <div style={{ color: "#fff", fontSize: 24, fontWeight: 800 }}>Bem-vindo, <span style={{ color: T.green }}>Operador</span></div>
        <Btn onClick={() => navigate("new-opt")} size="md" style={{ marginTop: 16 }} icon={<Plus size={16} />}>Nova Otimização</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        <StatCard icon={<Package size={18} />} label="Chapas em estoque" value={totalChapas} sub="total no estoque" accent={T.green} />
        <StatCard icon={<Scissors size={18} />} label="Retalhos úteis" value={retalhoAtivos} sub="disponíveis para uso" accent="#60A5FA" />
        <StatCard icon={<TrendingUp size={18} />} label="Metragem hoje" value={metragemHoje + " m²"} sub="área otimizada hoje" accent={T.green} />
        <StatCard icon={<BarChart2 size={18} />} label="Otimizações hoje" value={otimizacoesHoje} sub="realizadas hoje" accent={T.amber} />
      </div>

      <div style={{ background: T.dark, borderRadius: 18, padding: "20px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Produção de vidro</div>
            <div style={{ color: "#9CA3AF", fontSize: 12 }}>Total: {totalProduzido} m²</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["semanal", "mensal"].map(f => (
              <button key={f} onClick={() => setChartFilter(f)}
                style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: chartFilter === f ? T.green : "#1F2F1F", color: chartFilter === f ? "#fff" : "#9CA3AF", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={chartData} barSize={chartFilter === "semanal" ? 28 : 12}>
            <XAxis dataKey="d" tick={{ fill: "#9CA3AF", fontSize: 9 }} axisLine={false} tickLine={false} interval={chartFilter === "mensal" ? 4 : 0} />
            <YAxis tick={{ fill: "#9CA3AF", fontSize: 9 }} axisLine={false} tickLine={false} unit=" m²" />
            <Tooltip contentStyle={{ background: "#1F2937", border: "none", borderRadius: 8, color: "#fff" }} formatter={v => [v + " m²", "Produzido"]} />
            <Bar dataKey="v" fill={T.green} radius={[4, 4, 0, 0]} opacity={0.9} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: T.card, borderRadius: 16, padding: 18, boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Chapas por cor</div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <PieChart width={100} height={80}>
              <Pie data={pieData} cx={50} cy={40} innerRadius={26} outerRadius={40} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
              </Pie>
            </PieChart>
          </div>
          {pieData.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: pieColors[i], flexShrink: 0 }} />
              <span style={{ color: T.textMid, flex: 1 }}>{d.name}</span>
              <span style={{ fontWeight: 700 }}>{d.value}</span>
            </div>
          ))}
        </div>
        <div style={{ background: T.card, borderRadius: 16, padding: 18, boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Últimas otimizações</div>
          {data.otimizacoes.slice(0, 4).map(o => (
            <div key={o.id} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid " + T.border }}>
              <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: T.textMid }}>{o.id}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                <Pill cor={o.cor} />
                <span style={{ fontSize: 14, fontWeight: 800, color: T.green }}>{o.aproveitamento}%</span>
              </div>
            </div>
          ))}
          {data.otimizacoes.length === 0 && <div style={{ color: T.textMuted, fontSize: 12 }}>Nenhuma ainda</div>}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Alertas de estoque</div>
          {lowStock.map(c => (
            <div key={c.id} style={{ background: T.amberLight, border: "1px solid #FCD34D", borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <AlertTriangle size={18} color={T.amber} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Estoque baixo</div>
                <div style={{ fontSize: 12, color: T.textMid }}>Chapa {COR[c.cor]?.label} {c.largura}×{c.altura}</div>
                <div style={{ fontSize: 12, color: T.amber, fontWeight: 600 }}>Restam {c.quantidade} unidades</div>
              </div>
            </div>
          ))}
        </div>
      )}
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
    } catch (e) { alert("Erro: " + e.message) }
    setSaving(false)
  }

  const handleRemove = async (id) => {
    if (!confirm("Remover esta chapa?")) return
    try { await DB.chapas.delete(id); setData(d => ({ ...d, chapas: d.chapas.filter(c => c.id !== id) })) }
    catch (e) { alert("Erro: " + e.message) }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Estoque de Chapas</div>
          <div style={{ fontSize: 13, color: T.textMuted }}>Espessura 8mm</div>
        </div>
        <Btn onClick={() => setShowAdd(true)} size="sm" icon={<Plus size={14} />}>Adicionar</Btn>
      </div>

      {showAdd && (
        <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 16, padding: 22, marginBottom: 22, boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Nova Chapa</div>
            <X size={18} style={{ cursor: "pointer", color: T.textMuted }} onClick={() => setShowAdd(false)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 8 }}>Cor do vidro</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["incolor", "verde", "fume"].map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, cor: c }))}
                  style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: "2px solid " + (form.cor === c ? T.green : T.border), background: form.cor === c ? T.greenLight : "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", color: form.cor === c ? T.greenDark : T.textMid }}>
                  {COR[c].label}
                </button>
              ))}
            </div>
          </div>
          {[["largura", "Largura (mm)"], ["altura", "Altura (mm)"], ["quantidade", "Quantidade"]].map(([k, label]) => (
            <div key={k} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 6 }}>{label}</div>
              <input type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid " + T.border, fontSize: 15, outline: "none", boxSizing: "border-box", background: "#F9FAFB" }} />
            </div>
          ))}
          <Btn onClick={handleAdd} fullWidth disabled={saving} icon={saving ? <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={15} />}>
            {saving ? "Salvando..." : "Salvar no Estoque"}
          </Btn>
        </div>
      )}

      {["incolor", "verde", "fume"].map(cor => {
        const items = data.chapas.filter(c => c.cor === cor)
        if (!items.length) return null
        return (
          <div key={cor} style={{ marginBottom: 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Pill cor={cor} />
              <span style={{ fontSize: 13, color: T.textMuted }}>{items.reduce((s, c) => s + c.quantidade, 0)} unidades</span>
            </div>
            {items.map(c => (
              <div key={c.id} style={{ background: T.card, borderRadius: 14, padding: "14px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "monospace" }}>{c.largura} × {c.altura} mm</div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>8mm · {area_m2(c.largura, c.altura)} m²/unidade</div>
                </div>
                <div style={{ textAlign: "center", minWidth: 54 }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: c.quantidade <= 4 ? T.red : T.text }}>{c.quantidade}</div>
                  <div style={{ fontSize: 10, color: T.textMuted }}>unid.</div>
                </div>
                <Trash2 size={17} color={T.textMuted} style={{ cursor: "pointer" }} onClick={() => handleRemove(c.id)} />
              </div>
            ))}
          </div>
        )
      })}

      {data.chapas.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 24px", color: T.textMuted }}>
          <Package size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>Nenhuma chapa em estoque</div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// NOVA OTIMIZAÇÃO
// ══════════════════════════════════════════════════════════
function NewOptimization({ data, setData, navigate, pecasPreenchidas }) {
  const [step, setStep] = useState(pecasPreenchidas ? 2 : 1)
  const [cor, setCor] = useState(pecasPreenchidas ? pecasPreenchidas.cor : "incolor")
  const [pecas, setPecas] = useState(pecasPreenchidas ? pecasPreenchidas.pecas : [{ id: uid(), largura: "", altura: "", quantidade: "" }])
  const [result, setResult] = useState(null)
  const [currentSheet, setCurrentSheet] = useState(0)
  const [cortadas, setCortadas] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [zoomSheet, setZoomSheet] = useState(null)
  const isMobile = useIsMobile()

  const totalPecas = pecas.reduce((s, p) => s + (int(p.quantidade) || 0), 0)
  const areaTotal = pecas.reduce((s, p) => s + int(p.largura) * int(p.altura) * int(p.quantidade), 0)

  const addPeca = () => setPecas(p => [...p, { id: uid(), largura: "", altura: "", quantidade: "" }])
  const removePeca = id => setPecas(p => p.filter(x => x.id !== id))
  const updatePeca = (id, field, val) => setPecas(p => p.map(x => x.id === id ? { ...x, [field]: val } : x))

  const handleOptimize = () => {
    setError("")
    const valid = pecas.filter(p => int(p.largura) > 0 && int(p.altura) > 0 && int(p.quantidade) > 0)
    if (!valid.length) { setError("Adicione ao menos uma peça com medidas e quantidade válidas."); return }
    const temChapa = data.chapas.some(c => c.cor === cor && c.quantidade > 0)
    const temRetalho = data.retalhos.some(r => r.status === "ativo" && r.cor === cor)
    if (!temChapa && !temRetalho) { setError("Sem chapas ou retalhos de " + (COR[cor]?.label || cor) + " em estoque."); return }
    setLoading(true)
    setTimeout(() => {
      const sheets = runFullOptimization(valid, data.chapas, data.retalhos, cor)
      if (!sheets.length) { setError("Nenhuma peça coube. Verifique as medidas."); setLoading(false); return }
      setResult(sheets); setCurrentSheet(0); setCortadas(new Set()); setStep(4); setLoading(false)
    }, 600)
  }

  const handleFinalize = async () => {
    if (!result) return
    const id = genId()
    const chapasNaoRet = result.filter(s => !s.isRetalho)
    const avgEff = result.reduce((s, r) => s + r.efficiency, 0) / result.length
    const novosRetalhos = result.map(s => s.mainScrap).filter(Boolean)
      .map(r => ({ id: uid(), cor, largura: Math.round(r.w), altura: Math.round(r.h), area: parseFloat(area_m2(r.w, r.h)), origem: id, status: "ativo" }))
    const retalhoUsadosIds = result.filter(s => s.isRetalho && s.retalhoId).map(s => s.retalhoId)
    const novaOtm = { id, cor, chapas_usadas: chapasNaoRet.length, aproveitamento: Math.round(avgEff * 10) / 10, desperdicio: Math.round((100 - avgEff) * 10) / 10, pecas_totais: totalPecas, area_total: parseFloat((areaTotal / 1e6).toFixed(2)) }
    const pecasParaSalvar = pecas.filter(p => int(p.largura) && int(p.altura) && int(p.quantidade)).map(p => ({ id: uid(), otimizacao_id: id, largura: int(p.largura), altura: int(p.altura), quantidade: int(p.quantidade) }))
    try {
      const chapaDaCor = data.chapas.filter(c => c.cor === cor && c.quantidade > 0).reduce((best, c) => (!best || c.largura * c.altura > best.largura * best.altura) ? c : best, null)
      if (chapaDaCor && chapasNaoRet.length > 0) await DB.chapas.update(chapaDaCor.id, { quantidade: Math.max(0, chapaDaCor.quantidade - chapasNaoRet.length) })
      for (const rid of retalhoUsadosIds) await DB.retalhos.update(rid, { status: "usado" })
      await DB.retalhos.insertMany(novosRetalhos)
      await DB.otimizacoes.insert(novaOtm)
      await DB.pecas.insertMany(pecasParaSalvar)
      const novasChapas = data.chapas.map(c => (chapaDaCor && c.id === chapaDaCor.id) ? { ...c, quantidade: Math.max(0, c.quantidade - chapasNaoRet.length) } : c)
      const novosRet = [...data.retalhos.map(r => retalhoUsadosIds.includes(r.id) ? { ...r, status: "usado" } : r), ...novosRetalhos.map(r => ({ ...r, criado_em: Date.now() }))]
      setData(d => ({ ...d, chapas: novasChapas, retalhos: novosRet, otimizacoes: [{ ...novaOtm, chapasUsadas: novaOtm.chapas_usadas, pecasTotais: novaOtm.pecas_totais, areaTotal: novaOtm.area_total, criadoEm: Date.now() }, ...d.otimizacoes] }))
      navigate("history")
    } catch (e) { alert("Erro ao finalizar: " + e.message) }
  }

  const STEPS = ["Configuração", "Peças", "Resumo", "Resultado"]

  return (
    <div>
      {zoomSheet && <ZoomModal sheet={zoomSheet} cor={cor} onClose={() => setZoomSheet(null)} />}

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 26 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: i + 1 < step ? T.green : i + 1 === step ? T.green : T.border, color: i + 1 <= step ? "#fff" : T.textMuted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                {i + 1 < step ? <Check size={14} /> : i + 1}
              </div>
              <span style={{ fontSize: 10, color: i + 1 <= step ? T.greenDark : T.textMuted, fontWeight: 600, whiteSpace: "nowrap" }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i + 1 < step ? T.green : T.border, margin: "0 6px", marginBottom: 18 }} />}
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Nova Otimização</div>
          <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 24 }}>Selecione a cor da chapa</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 28 }}>
            {["incolor", "verde", "fume"].map(c => {
              const stock = data.chapas.filter(ch => ch.cor === c).reduce((s, ch) => s + ch.quantidade, 0)
              const ret = data.retalhos.filter(r => r.cor === c && r.status === "ativo").length
              return (
                <button key={c} onClick={() => setCor(c)}
                  style={{ padding: "18px 10px", borderRadius: 14, border: "2px solid " + (cor === c ? T.green : T.border), background: cor === c ? T.greenLight : "#fff", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: COR[c].bg, border: "2px solid " + COR[c].stroke, margin: "0 auto 10px" }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{COR[c].label}</div>
                  <div style={{ fontSize: 11, color: stock > 0 ? T.green : T.textMuted, fontWeight: 600 }}>{stock} chapas</div>
                  {ret > 0 && <div style={{ fontSize: 10, color: T.amber, fontWeight: 600 }}>{ret} retalhos</div>}
                </button>
              )
            })}
          </div>
          <div style={{ background: T.greenLight, borderRadius: 12, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 10 }}>
            <Info size={16} color={T.green} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: T.greenDark }}><strong>+2mm por lado (+4mm total)</strong>. Chapas são otimizadas primeiro, retalhos por último.</div>
          </div>
          <Btn onClick={() => setStep(2)} fullWidth size="lg" icon={<ChevronRight size={18} />}>Continuar</Btn>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <ArrowLeft size={20} style={{ cursor: "pointer", color: T.textMid }} onClick={() => setStep(1)} />
            <div><div style={{ fontSize: 20, fontWeight: 800 }}>Adicionar Peças</div><Pill cor={cor} /></div>
          </div>
          {pecasPreenchidas && <div style={{ background: T.greenLight, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: T.greenDark }}>Peças da otimização anterior carregadas.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px 36px", gap: 8, padding: "0 2px", marginBottom: 8 }}>
            {["Largura (mm)", "Altura (mm)", "Quantidade", ""].map((h, i) => <div key={i} style={{ fontSize: 11, fontWeight: 700, color: T.textMuted }}>{h}</div>)}
          </div>
          {pecas.map(p => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px 36px", gap: 8, marginBottom: 8, alignItems: "center" }}>
              {["largura", "altura"].map(field => (
                <input key={field} type="number" value={p[field]} onChange={e => updatePeca(p.id, field, e.target.value)}
                  style={{ padding: "11px 12px", borderRadius: 8, border: "1.5px solid " + T.border, fontSize: 14, outline: "none", background: "#F9FAFB", width: "100%", boxSizing: "border-box" }} />
              ))}
              <input type="number" value={p.quantidade} onChange={e => updatePeca(p.id, "quantidade", e.target.value)}
                style={{ padding: "11px 8px", borderRadius: 8, border: "1.5px solid " + T.border, fontSize: 14, outline: "none", background: "#F9FAFB", textAlign: "center", width: "100%", boxSizing: "border-box" }} />
              <button onClick={() => removePeca(p.id)} style={{ background: T.redLight, border: "none", borderRadius: 8, width: 36, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Trash2 size={14} color={T.red} />
              </button>
            </div>
          ))}
          <Btn onClick={addPeca} variant="secondary" size="sm" style={{ marginTop: 8, marginBottom: 20 }} icon={<Plus size={14} />}>Adicionar linha</Btn>
          <div style={{ background: T.greenLight, borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div><div style={{ fontSize: 11, color: T.textMuted }}>Total de peças</div><div style={{ fontSize: 22, fontWeight: 800, color: T.greenDark }}>{totalPecas}</div></div>
              <div><div style={{ fontSize: 11, color: T.textMuted }}>Área total</div><div style={{ fontSize: 20, fontWeight: 800, color: T.greenDark }}>{(areaTotal / 1e6).toFixed(2)} m²</div></div>
              <div><div style={{ fontSize: 11, color: T.textMuted }}>Acréscimo</div><div style={{ fontSize: 14, fontWeight: 700, color: T.green }}>+4mm/peça</div></div>
            </div>
          </div>
          <Btn onClick={() => setStep(3)} fullWidth size="lg" disabled={totalPecas === 0} icon={<ChevronRight size={18} />}>Continuar para Resumo</Btn>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <ArrowLeft size={20} style={{ cursor: "pointer", color: T.textMid }} onClick={() => setStep(2)} />
            <div style={{ fontSize: 20, fontWeight: 800 }}>Confirmar Otimização</div>
          </div>
          <div style={{ background: T.card, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[["Cor", <Pill cor={cor} />], ["Peças", <span style={{ fontSize: 18, fontWeight: 800 }}>{totalPecas}</span>], ["Área total", <span style={{ fontSize: 16, fontWeight: 700 }}>{(areaTotal / 1e6).toFixed(2)} m²</span>], ["Acréscimo", <span style={{ fontSize: 14, fontWeight: 700, color: T.green }}>+4mm/peça</span>]].map(([l, v], i) => (
                <div key={i}><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{l}</div>{v}</div>
              ))}
            </div>
          </div>
          <div style={{ background: T.card, borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Peças a otimizar</div>
            <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr 50px", gap: 8, marginBottom: 8 }}>
              {["#", "Largura", "Altura", "Qtd"].map(h => <div key={h} style={{ fontSize: 11, fontWeight: 700, color: T.textMuted }}>{h}</div>)}
            </div>
            {pecas.filter(p => int(p.largura) && int(p.altura) && int(p.quantidade)).map((p, i) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr 50px", gap: 8, paddingBottom: 10, borderBottom: "1px solid " + T.border, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: T.textMuted }}>{i + 1}</div>
                <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace" }}>{p.largura}</div>
                <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace" }}>{p.altura}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.green }}>{p.quantidade}×</div>
              </div>
            ))}
          </div>
          {error && <div style={{ background: T.redLight, border: "1px solid " + T.red, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: T.red }}>{error}</div>}
          <Btn onClick={handleOptimize} fullWidth size="lg" disabled={loading}
            icon={loading ? <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={18} />}>
            {loading ? "Calculando..." : "Iniciar Otimização"}
          </Btn>
        </div>
      )}

      {/* STEP 4 - Resultado */}
      {step === 4 && result && (() => {
        const s = result[currentSheet]
        const qtdChapas = result.filter(sh => !sh.isRetalho).length
        const qtdRet = result.filter(sh => sh.isRetalho).length
        const areaUsada = (s.usedArea / 1e6).toFixed(2)
        const svgMaxW = isMobile
          ? Math.min(500, (typeof window !== "undefined" ? window.innerWidth : 360) - 40)
          : Math.min(600, (typeof window !== "undefined" ? window.innerWidth - 340 : 600))

        return (
          <div>
            <div style={{ background: T.greenLight, borderRadius: 14, padding: "14px 18px", marginBottom: 18, display: "flex", gap: 12, alignItems: "center" }}>
              <CheckCircle size={22} color={T.green} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.greenDark }}>Otimização concluída!</div>
                <div style={{ fontSize: 12, color: T.greenDark }}>
                  {qtdChapas > 0 && qtdChapas + " chapa(s) · "}
                  {qtdRet > 0 && qtdRet + " retalho(s) · "}
                  {result.reduce((t, sh) => t + sh.pieces.length, 0)} peças distribuídas
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
              {result.map((sh, i) => (
                <button key={i} onClick={() => setCurrentSheet(i)}
                  style={{ padding: "8px 16px", borderRadius: 10, border: "2px solid " + (currentSheet === i ? (sh.isRetalho ? T.amber : T.green) : T.border), background: currentSheet === i ? (sh.isRetalho ? T.amber : T.green) : T.card, color: currentSheet === i ? "#fff" : T.textMid, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, minWidth: 90, textAlign: "center" }}>
                  {sh.isRetalho ? "Retalho" : ("Chapa " + (i + 1))}
                  <div style={{ fontSize: 10, marginTop: 2 }}>{sh.efficiency}%</div>
                </button>
              ))}
            </div>

            {/* SVG com zoom */}
            <div style={{ marginBottom: 14, borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
              <SheetSVG
                sheet={s}
                cor={cor}
                maxW={svgMaxW}
                onZoom={() => setZoomSheet(s)}
              />
            </div>

            {/* KPI — só Área utilizada */}
            <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {s.isRetalho ? (s.retalhoLabel || "Retalho") : ("Chapa " + (currentSheet + 1) + " de " + result.length)}
                  <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 400, marginLeft: 8 }}>{s.width}×{s.height} mm</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: cortadas.has(currentSheet) ? T.green : T.amber }}>
                  {cortadas.has(currentSheet) ? "✓ Cortada" : "Pendente"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Área utilizada</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.green }}>{areaUsada} m²</div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>{s.efficiency}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Peças</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{s.pieces.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Retalhos</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.amber }}>{s.scraps ? s.scraps.length : 0}</div>
                </div>
              </div>
              {s.errors.length > 0 && <div style={{ background: T.redLight, borderRadius: 8, padding: "8px 12px", marginTop: 10 }}>{s.errors.map((e, i) => <div key={i} style={{ color: T.red, fontSize: 12 }}>⚠ {e}</div>)}</div>}
            </div>

            {/* Botões */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {currentSheet > 0 && <Btn onClick={() => setCurrentSheet(i => i - 1)} variant="ghost" size="sm" icon={<ChevronLeft size={16} />}>Anterior</Btn>}
              {!cortadas.has(currentSheet) && (
                <Btn onClick={() => setCortadas(prev => new Set([...prev, currentSheet]))} variant="secondary" size="sm" icon={<Check size={16} />} style={{ flex: 1 }}>
                  Marcar cortada
                </Btn>
              )}
              {currentSheet < result.length - 1
                ? <Btn onClick={() => setCurrentSheet(i => i + 1)} size="sm" icon={<ChevronRight size={16} />} style={{ flex: 1 }}>Próxima</Btn>
                : <Btn onClick={handleFinalize} size="sm" icon={<CheckCircle size={16} />} style={{ flex: 1 }}>Finalizar e salvar</Btn>
              }
            </div>
          </div>
        )
      })()}
      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// HISTÓRICO
// ══════════════════════════════════════════════════════════
function HistoryDetail({ otimizacao, onVoltar, onReutilizar }) {
  const [pecas, setPecas] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    DB.pecas.getByOtimizacao(otimizacao.id).then(d => { setPecas(d); setLoading(false) }).catch(() => setLoading(false))
  }, [otimizacao.id])

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <ArrowLeft size={20} style={{ cursor: "pointer", color: T.textMid }} onClick={onVoltar} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace" }}>{otimizacao.id}</div>
          <div style={{ fontSize: 12, color: T.textMuted }}>{fmt_date(otimizacao.criado_em || otimizacao.criadoEm)}</div>
        </div>
      </div>
      <div style={{ background: T.dark, borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ marginBottom: 14 }}><Pill cor={otimizacao.cor} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[["Aproveitamento", otimizacao.aproveitamento + "%", T.green], ["Desperdício", otimizacao.desperdicio + "%", "#FCA5A5"], ["Chapas", otimizacao.chapas_usadas || otimizacao.chapasUsadas, "#fff"], ["Peças", otimizacao.pecas_totais || otimizacao.pecasTotais, "#fff"], ["Área total", (otimizacao.area_total || otimizacao.areaTotal) + " m²", "#9CA3AF"]].map(([l, v, c]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: T.card, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Peças otimizadas</div>
        {loading ? <div style={{ textAlign: "center", color: T.textMuted, padding: 20 }}>Carregando...</div> : pecas.length > 0 ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr 50px", gap: 8, marginBottom: 8 }}>
              {["#", "Largura", "Altura", "Qtd"].map(h => <div key={h} style={{ fontSize: 11, fontWeight: 700, color: T.textMuted }}>{h}</div>)}
            </div>
            {pecas.map((p, i) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr 50px", gap: 8, paddingBottom: 10, borderBottom: "1px solid " + T.border, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: T.textMuted }}>{i + 1}</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>{p.largura}</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>{p.altura}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.green }}>{p.quantidade}×</div>
              </div>
            ))}
          </>
        ) : <div style={{ textAlign: "center", color: T.textMuted, padding: 20, fontSize: 13 }}>Peças não disponíveis.</div>}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <Btn onClick={onVoltar} variant="secondary" size="md" style={{ flex: 1 }} icon={<ArrowLeft size={16} />}>Voltar</Btn>
        {pecas.length > 0 && <Btn onClick={() => onReutilizar(otimizacao.cor, pecas)} size="md" style={{ flex: 1 }} icon={<RotateCcw size={16} />}>Reutilizar</Btn>}
      </div>
    </div>
  )
}

function HistoryScreen({ data, navigate, onReutilizar }) {
  const [detalhe, setDetalhe] = useState(null)
  if (detalhe) return <HistoryDetail otimizacao={detalhe} onVoltar={() => setDetalhe(null)} onReutilizar={(cor, pecas) => { onReutilizar(cor, pecas); navigate("new-opt") }} />
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Histórico</div>
      <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>Clique para ver detalhes ou reutilizar</div>
      {data.otimizacoes.map(o => (
        <div key={o.id} onClick={() => setDetalhe(o)}
          style={{ background: T.card, borderRadius: 16, padding: "16px 18px", marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", cursor: "pointer", border: "1px solid " + T.border }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 800, fontFamily: "monospace" }}>{o.id}</span>
                <Pill cor={o.cor} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div><div style={{ fontSize: 10, color: T.textMuted }}>Aproveitamento</div><div style={{ fontSize: 18, fontWeight: 800, color: T.green }}>{o.aproveitamento}%</div></div>
                <div><div style={{ fontSize: 10, color: T.textMuted }}>Chapas</div><div style={{ fontSize: 18, fontWeight: 800 }}>{o.chapas_usadas || o.chapasUsadas}</div></div>
                <div><div style={{ fontSize: 10, color: T.textMuted }}>Peças</div><div style={{ fontSize: 18, fontWeight: 800 }}>{o.pecas_totais || o.pecasTotais}</div></div>
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8 }}>{fmt_date(o.criado_em || o.criadoEm)}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: T.green, fontSize: 12, fontWeight: 600, marginLeft: 12 }}>
              <Eye size={15} /> Ver
            </div>
          </div>
        </div>
      ))}
      {!data.otimizacoes.length && <div style={{ textAlign: "center", padding: "48px 24px", color: T.textMuted }}><Clock size={40} style={{ marginBottom: 12, opacity: 0.4 }} /><div style={{ fontSize: 15, fontWeight: 600 }}>Nenhuma otimização ainda</div></div>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// RETALHOS
// ══════════════════════════════════════════════════════════
function ScrapsScreen({ data, setData }) {
  const ativos = [...data.retalhos.filter(r => r.status === "ativo")].sort((a, b) => b.largura * b.altura - a.largura * a.altura)
  const descartados = [...data.retalhos.filter(r => r.status === "descartado")].sort((a, b) => b.largura * b.altura - a.largura * a.altura)

  const updateStatus = async (id, status) => {
    try { await DB.retalhos.update(id, { status }); setData(d => ({ ...d, retalhos: d.retalhos.map(r => r.id === id ? { ...r, status } : r) })) }
    catch (e) { alert("Erro: " + e.message) }
  }
  const deleteRetalho = async (id) => {
    if (!confirm("Deletar permanentemente? Não pode ser desfeito.")) return
    try { await DB.retalhos.delete(id); setData(d => ({ ...d, retalhos: d.retalhos.filter(r => r.id !== id) })) }
    catch (e) { alert("Erro: " + e.message) }
  }

  function RetalhoCard({ r }) {
    const c = COR[r.cor] || { piece: "#DCFCE7", stroke: T.green }
    return (
      <div style={{ background: T.card, borderRadius: 14, padding: "14px 18px", marginBottom: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 42, height: 52, background: "#D1D5DB33", border: "2px dashed #9CA3AF", borderRadius: 6, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>{r.largura} × {r.altura} mm</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}><Pill cor={r.cor} /><span style={{ fontSize: 12, color: T.textMuted }}>{r.area} m²</span></div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>de {r.origem}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {r.status === "descartado" ? (
              <>
                <button onClick={() => updateStatus(r.id, "ativo")} style={{ background: T.greenLight, border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.greenDark, fontWeight: 600, whiteSpace: "nowrap" }}>
                  <RotateCcw size={12} /> Restaurar
                </button>
                <button onClick={() => deleteRetalho(r.id)} style={{ background: T.redLight, border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.red, fontWeight: 600, whiteSpace: "nowrap" }}>
                  <Trash2 size={12} /> Deletar
                </button>
              </>
            ) : (
              <button onClick={() => updateStatus(r.id, "descartado")} style={{ background: T.redLight, border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.red, fontWeight: 600, whiteSpace: "nowrap" }}>
                <Trash2 size={12} /> Descartar
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Retalhos</div>
      <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 16 }}>Ordenados do maior para o menor</div>
      <div style={{ background: T.card, borderRadius: 16, padding: "14px 18px", marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div><div style={{ fontSize: 24, fontWeight: 800, color: T.green }}>{ativos.length}</div><div style={{ fontSize: 11, color: T.textMuted }}>Ativos</div></div>
        <div><div style={{ fontSize: 24, fontWeight: 800 }}>{descartados.length}</div><div style={{ fontSize: 11, color: T.textMuted }}>Descartados</div></div>
        <div><div style={{ fontSize: 18, fontWeight: 800, color: T.textMid }}>{ativos.reduce((s, r) => s + r.area, 0).toFixed(2)} m²</div><div style={{ fontSize: 11, color: T.textMuted }}>Área ativa</div></div>
      </div>
      {ativos.length > 0 && <><div style={{ fontSize: 14, fontWeight: 700, color: T.green, marginBottom: 10 }}>Ativos — do maior para o menor</div>{ativos.map(r => <RetalhoCard key={r.id} r={r} />)}</>}
      {descartados.length > 0 && <><div style={{ fontSize: 14, fontWeight: 700, color: T.textMuted, marginTop: 20, marginBottom: 10 }}>Descartados</div>{descartados.map(r => <RetalhoCard key={r.id} r={r} />)}</>}
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
  const [dbError, setDbError] = useState("")
  const [pecasReutilizar, setPecasReutilizar] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    DB.loadAll().then(d => setData({ ...d, loading: false })).catch(e => { setDbError(e.message); setData(d => ({ ...d, loading: false })) })
  }, [])

  useEffect(() => {
    const l = document.createElement("link"); l.rel = "stylesheet"
    l.href = "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@700;800&display=swap"
    document.head.appendChild(l)
  }, [])

  const handleReutilizar = (cor, pecas) => {
    setPecasReutilizar({ cor, pecas: pecas.map(p => ({ id: uid(), largura: String(p.largura), altura: String(p.altura), quantidade: p.quantidade })) })
    handleNavigate("new-opt")
  }
  const handleNavigate = (s) => { if (s !== "new-opt") setPecasReutilizar(null); setScreen(s); setMenuOpen(false) }

  const NAV = [
    { id: "dashboard", icon: <Home size={20} />,    label: "Dashboard" },
    { id: "new-opt",   icon: <Plus size={20} />,    label: "Nova Otimização" },
    { id: "stock",     icon: <Layers size={20} />,  label: "Estoque" },
    { id: "scraps",    icon: <Scissors size={20} />,label: "Retalhos" },
    { id: "history",   icon: <Clock size={20} />,   label: "Histórico" },
  ]

  if (data.loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.dark, flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 32, fontWeight: 800, color: T.green, fontFamily: "'Barlow Condensed', sans-serif" }}>OTM<span style={{ color: "#fff" }}>glass</span></div>
      <RefreshCw size={26} color={T.green} style={{ animation: "spin 1s linear infinite" }} />
      <div style={{ color: "#6B7280", fontSize: 13 }}>Conectando ao banco de dados...</div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (dbError) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.dark, flexDirection: "column", gap: 16, padding: 32 }}>
      <AlertTriangle size={40} color={T.red} />
      <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Erro de conexão com o banco</div>
      <div style={{ background: "#1F2937", borderRadius: 8, padding: "12px 16px", color: T.red, fontSize: 12, fontFamily: "monospace", maxWidth: 400, wordBreak: "break-all" }}>{dbError}</div>
    </div>
  )

  const props = { data, setData, navigate: handleNavigate }

  // ── LAYOUT PC ──
  if (!isMobile) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: "'Barlow', sans-serif" }}>
        <div style={{ width: 240, background: T.sidebar, display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 50, borderRight: "1px solid #1F2D1F" }}>
          <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #1F2D1F" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -0.5, fontFamily: "'Barlow Condensed', sans-serif" }}>OTM<span style={{ color: T.green }}>glass</span></div>
            <div style={{ fontSize: 11, color: "#4ADE8099", marginTop: 2 }}>Intelligent Glass Optimization</div>
          </div>
          <div style={{ flex: 1, padding: "12px 0" }}>
            {NAV.map(n => {
              const active = screen === n.id
              return (
                <button key={n.id} onClick={() => handleNavigate(n.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: active ? "#1A2A1A" : "none", border: "none", width: "100%", cursor: "pointer", borderLeft: active ? "3px solid " + T.green : "3px solid transparent", marginBottom: 2 }}>
                  <span style={{ color: active ? T.green : "#6B7280", flexShrink: 0 }}>{n.icon}</span>
                  <span style={{ color: active ? "#fff" : "#9CA3AF", fontSize: 14, fontWeight: 600 }}>{n.label}</span>
                  {n.id === "scraps" && data.retalhos.filter(r => r.status === "ativo").length > 0 && (
                    <span style={{ marginLeft: "auto", background: T.green, color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "2px 7px" }}>
                      {data.retalhos.filter(r => r.status === "ativo").length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div style={{ padding: "16px 20px", borderTop: "1px solid #1F2D1F" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.greenDark, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>O</div>
              <div><div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Operador</div><div style={{ color: "#4ADE80", fontSize: 10 }}>Online</div></div>
            </div>
            <div style={{ fontSize: 10, color: "#374151", marginTop: 12 }}>OTMglass v1.4.0</div>
          </div>
        </div>
        <div style={{ marginLeft: 240, flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ background: "#fff", borderBottom: "1px solid " + T.border, padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{NAV.find(n => n.id === screen)?.label || "Dashboard"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {data.chapas.some(c => c.quantidade <= 4) && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: T.amberLight, borderRadius: 8, padding: "6px 12px", fontSize: 12, color: T.amber, fontWeight: 600 }}>
                  <AlertTriangle size={14} /> Estoque baixo
                </div>
              )}
              <div style={{ position: "relative" }}>
                <Bell size={20} color={T.textMuted} />
                {data.chapas.some(c => c.quantidade <= 4) && <span style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, background: T.red, borderRadius: "50%", fontSize: 9, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>!</span>}
              </div>
            </div>
          </div>
          <div style={{ flex: 1, padding: "32px", maxWidth: 1100, width: "100%" }}>
            {screen === "dashboard" && <Dashboard {...props} />}
            {screen === "stock"     && <StockScreen {...props} />}
            {screen === "new-opt"   && <NewOptimization key={pecasReutilizar ? "r" : "n"} {...props} pecasPreenchidas={pecasReutilizar} />}
            {screen === "scraps"    && <ScrapsScreen {...props} />}
            {screen === "history"   && <HistoryScreen {...props} onReutilizar={handleReutilizar} />}
          </div>
        </div>
        <style>{`* { box-sizing: border-box; } body { margin: 0; background: ${T.bg}; font-family: 'Barlow', sans-serif; } input:focus { border-color: ${T.green} !important; box-shadow: 0 0 0 3px ${T.greenLight}; } button:active { opacity: .9; } @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} } ::-webkit-scrollbar { width: 6px; height: 6px; } ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }`}</style>
      </div>
    )
  }

  // ── LAYOUT MOBILE ──
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", minHeight: "100vh", background: T.bg, fontFamily: "'Barlow', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header mobile com hamburger */}
      <div style={{ background: T.dark, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setMenuOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ display: "block", width: 22, height: 2.5, background: "#9CA3AF", borderRadius: 2 }} />
            <span style={{ display: "block", width: 22, height: 2.5, background: "#9CA3AF", borderRadius: 2 }} />
            <span style={{ display: "block", width: 22, height: 2.5, background: "#9CA3AF", borderRadius: 2 }} />
          </button>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5, fontFamily: "'Barlow Condensed', sans-serif" }}>
            OTM<span style={{ color: T.green }}>glass</span>
          </span>
        </div>
        <div style={{ position: "relative" }}>
          <Bell size={20} color="#9CA3AF" />
          {data.chapas.some(c => c.quantidade <= 4) && <span style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, background: T.red, borderRadius: "50%", fontSize: 9, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>!</span>}
        </div>
      </div>

      {/* Menu lateral mobile */}
      {menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }}>
          <div style={{ background: T.sidebar, width: 280, height: "100%", display: "flex", flexDirection: "column", boxShadow: "4px 0 24px rgba(0,0,0,.5)" }}>
            <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #1F2D1F", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "'Barlow Condensed', sans-serif" }}>OTM<span style={{ color: T.green }}>glass</span></div>
                <div style={{ fontSize: 11, color: "#4ADE8099" }}>Intelligent Glass Optimization</div>
              </div>
              <X size={20} color="#9CA3AF" style={{ cursor: "pointer" }} onClick={() => setMenuOpen(false)} />
            </div>
            {NAV.map(n => {
              const active = screen === n.id
              return (
                <button key={n.id} onClick={() => handleNavigate(n.id)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", background: active ? "#1A2A1A" : "none", border: "none", width: "100%", cursor: "pointer", borderLeft: active ? "3px solid " + T.green : "3px solid transparent" }}>
                  <span style={{ color: active ? T.green : "#9CA3AF" }}>{n.icon}</span>
                  <span style={{ color: active ? "#fff" : "#9CA3AF", fontSize: 14, fontWeight: 600 }}>{n.label}</span>
                </button>
              )
            })}
            <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: "1px solid #1F2D1F", fontSize: 10, color: "#4B5563" }}>OTMglass v1.4.0</div>
          </div>
          <div style={{ flex: 1, background: "rgba(0,0,0,.5)" }} onClick={() => setMenuOpen(false)} />
        </div>
      )}

      <div style={{ flex: 1, padding: "20px 20px 100px", overflowY: "auto" }}>
        {screen === "dashboard" && <Dashboard {...props} />}
        {screen === "stock"     && <StockScreen {...props} />}
        {screen === "new-opt"   && <NewOptimization key={pecasReutilizar ? "r" : "n"} {...props} pecasPreenchidas={pecasReutilizar} />}
        {screen === "scraps"    && <ScrapsScreen {...props} />}
        {screen === "history"   && <HistoryScreen {...props} onReutilizar={handleReutilizar} />}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 560, background: T.dark, borderTop: "1px solid #1F2D1F", display: "flex", padding: "10px 0 16px", zIndex: 100 }}>
        {NAV.map(n => {
          const active = screen === n.id, isCenter = n.id === "new-opt"
          return (
            <button key={n.id} onClick={() => handleNavigate(n.id)}
              style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "0 4px" }}>
              {isCenter
                ? <div style={{ width: 48, height: 48, borderRadius: "50%", background: T.green, display: "flex", alignItems: "center", justifyContent: "center", marginTop: -20, boxShadow: "0 0 0 4px " + T.dark }}><span style={{ color: "#fff" }}>{n.icon}</span></div>
                : <span style={{ color: active ? T.green : "#6B7280" }}>{n.icon}</span>
              }
              <span style={{ fontSize: 9, fontWeight: 600, color: isCenter ? T.green : active ? T.green : "#6B7280" }}>{n.label}</span>
            </button>
          )
        })}
      </div>

      <style>{`* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; } body { margin: 0; background: ${T.bg}; } input:focus { border-color: ${T.green} !important; box-shadow: 0 0 0 3px ${T.greenLight}; } button:active { opacity: .85; transform: scale(.97); } @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} } ::-webkit-scrollbar { width: 4px; height: 4px; } ::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }`}</style>
    </div>
  )
}
