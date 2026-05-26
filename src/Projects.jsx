import { useState, useEffect, useRef } from "react"
import { supabase } from "./supabase.js"
import {
  ArrowLeft, Plus, Search, X, Check, Trash2, Edit2,
  ChevronRight, Camera, Image, FileText, Clock,
  CheckCircle, AlertCircle, Package, User, Phone,
} from "lucide-react"

// ══════════════════════════════════════════════════════
// TOKENS (mesmo padrão do App.jsx)
// ══════════════════════════════════════════════════════
const T = {
  green: "#22C55E", greenDark: "#15803D", greenLight: "#DCFCE7",
  dark: "#111A11", card: "#FFFFFF", bg: "#F0F4F0",
  border: "#E2E8E2", text: "#111827", textMid: "#4B5563", textMuted: "#9CA3AF",
  red: "#EF4444", redLight: "#FEF2F2", amber: "#F59E0B", amberLight: "#FFFBEB",
}

// ══════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════
const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase()
const int = v => parseInt(v, 10) || 0
const fmt_date = ts => {
  if (!ts) return ""
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return "Hoje"
  const diff = Math.floor((now - d) / 86400000)
  if (diff === 1) return "Ontem"
  if (diff < 7) return diff + " dias atrás"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ══════════════════════════════════════════════════════
// DATABASE — Projetos
// ══════════════════════════════════════════════════════
const PDB = {
  clients: {
    async list() {
      const { data, error } = await supabase.from("clients").select("*").order("criado_em", { ascending: false })
      if (error) throw error
      return data || []
    },
    async insert(row) {
      const { error } = await supabase.from("clients").insert({ ...row, criado_em: Date.now() })
      if (error) throw error
    },
    async update(id, fields) {
      const { error } = await supabase.from("clients").update(fields).eq("id", id)
      if (error) throw error
    },
    async delete(id) {
      const { error } = await supabase.from("clients").delete().eq("id", id)
      if (error) throw error
    },
  },
  projects: {
    async listByClient(clientId) {
      const { data, error } = await supabase.from("projects").select("*").eq("client_id", clientId).order("numero", { ascending: false })
      if (error) throw error
      return data || []
    },
    async insert(row) {
      const { error } = await supabase.from("projects").insert({ ...row, criado_em: Date.now(), atualizado_em: Date.now() })
      if (error) throw error
    },
    async update(id, fields) {
      const { error } = await supabase.from("projects").update({ ...fields, atualizado_em: Date.now() }).eq("id", id)
      if (error) throw error
    },
    async delete(id) {
      const { error } = await supabase.from("projects").delete().eq("id", id)
      if (error) throw error
    },
    async nextNumber(clientId) {
      const { data } = await supabase.from("projects").select("numero").eq("client_id", clientId).order("numero", { ascending: false }).limit(1)
      return data && data.length > 0 ? data[0].numero + 1 : 1
    },
  },
  pieces: {
    async listByProject(projectId) {
      const { data, error } = await supabase.from("project_pieces").select("*").eq("project_id", projectId).order("criado_em", { ascending: true })
      if (error) throw error
      return data || []
    },
    async insert(row) {
      const { error } = await supabase.from("project_pieces").insert({ ...row, criado_em: Date.now() })
      if (error) throw error
    },
    async update(id, fields) {
      const { error } = await supabase.from("project_pieces").update(fields).eq("id", id)
      if (error) throw error
    },
    async delete(id) {
      const { error } = await supabase.from("project_pieces").delete().eq("id", id)
      if (error) throw error
    },
  },
  images: {
    async listByPiece(pieceId) {
      const { data, error } = await supabase.from("piece_images").select("*").eq("piece_id", pieceId)
      if (error) throw error
      return data || []
    },
    async insert(row) {
      const { error } = await supabase.from("piece_images").insert({ ...row, criado_em: Date.now() })
      if (error) throw error
    },
    async delete(id) {
      const { error } = await supabase.from("piece_images").delete().eq("id", id)
      if (error) throw error
    },
    async deleteByPiece(pieceId) {
      const { error } = await supabase.from("piece_images").delete().eq("piece_id", pieceId)
      if (error) throw error
    },
  },
  // Busca global por medida, cliente ou projeto
  async search(query) {
    query = query.trim().toLowerCase()
    if (!query) return []

    // Detecta se é busca por medida (ex: 550x220 ou 550x220)
    const medidaMatch = query.match(/^(\d+)\s*[x×]\s*(\d+)$/)
    const results = []

    if (medidaMatch) {
      const Y = int(medidaMatch[1]), X = int(medidaMatch[2])
      const { data: pieces } = await supabase.from("project_pieces")
        .select("*, projects(*, clients(*))")
        .or(`and(largura_y.eq.${Y},altura_x.eq.${X}),and(largura_y.eq.${X},altura_x.eq.${Y})`)
      if (pieces) {
        pieces.forEach(p => {
          if (p.projects && p.projects.clients) {
            results.push({
              type: "piece",
              client: p.projects.clients.nome,
              project: p.projects.nome,
              projectId: p.project_id,
              clientId: p.projects.client_id,
              piece: `${p.largura_y}×${p.altura_x}`,
              date: p.criado_em,
            })
          }
        })
      }
    }

    // Busca por nome de cliente ou projeto
    const { data: clients } = await supabase.from("clients").select("*").ilike("nome", `%${query}%`)
    if (clients) clients.forEach(c => results.push({ type: "client", client: c.nome, clientId: c.id, date: c.criado_em }))

    const { data: projs } = await supabase.from("projects").select("*, clients(*)").ilike("nome", `%${query}%`)
    if (projs) projs.forEach(p => results.push({ type: "project", client: p.clients?.nome, project: p.nome, projectId: p.id, clientId: p.client_id, date: p.criado_em }))

    return results
  }
}

// ══════════════════════════════════════════════════════
// UI ATOMS
// ══════════════════════════════════════════════════════
function Btn({ children, onClick, variant, size, fullWidth, icon, disabled, style }) {
  const v = variant || "primary"
  const s = size || "md"
  const vs = {
    primary: { background: disabled ? "#9CA3AF" : T.green, color: "#fff", border: "none" },
    secondary: { background: "transparent", color: T.green, border: "2px solid " + T.green },
    ghost: { background: "transparent", color: T.textMid, border: "none" },
    danger: { background: T.redLight, color: T.red, border: "2px solid " + T.red },
  }
  const ps = { sm: "6px 14px", md: "11px 20px", lg: "14px 26px" }
  const fz = { sm: 12, md: 14, lg: 15 }
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...(vs[v] || vs.primary), padding: ps[s] || ps.md, fontSize: fz[s] || fz.md, borderRadius: 10, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: fullWidth ? "100%" : "auto", ...(style || {}) }}>
      {icon && <span style={{ display: "flex" }}>{icon}</span>}
      {children}
    </button>
  )
}

function StatusBadge({ status }) {
  const cfg = status === "concluido"
    ? { bg: T.greenLight, color: T.greenDark, label: "Concluído", icon: <CheckCircle size={11} /> }
    : { bg: T.amberLight, color: "#92400E", label: "Em edição", icon: <Edit2 size={11} /> }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: cfg.bg, color: cfg.color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

// Modal genérico
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: T.card, borderRadius: "20px 20px 0 0", padding: "20px 24px 40px", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: T.border, borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
          <X size={20} style={{ cursor: "pointer", color: T.textMuted }} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// TELA: LISTA DE CLIENTES (principal)
// ══════════════════════════════════════════════════════
function ClientList({ onSelectClient }) {
  const [clients, setClients] = useState([])
  const [projectCounts, setProjectCounts] = useState({})
  const [lastProjects, setLastProjects] = useState({})
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newForm, setNewForm] = useState({ nome: "", telefone: "", observacao: "" })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const searchTimer = useRef(null)

  useEffect(() => { loadClients() }, [])

  const loadClients = async () => {
    setLoading(true)
    try {
      const cs = await PDB.clients.list()
      setClients(cs)
      // Carrega contagem de projetos e último pedido por cliente
      const counts = {}, lasts = {}
      for (const c of cs) {
        const { data } = await supabase.from("projects").select("id, atualizado_em").eq("client_id", c.id)
        counts[c.id] = data ? data.length : 0
        if (data && data.length) {
          const sorted = [...data].sort((a, b) => b.atualizado_em - a.atualizado_em)
          lasts[c.id] = sorted[0].atualizado_em
        }
      }
      setProjectCounts(counts)
      setLastProjects(lasts)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleSearch = async (val) => {
    setSearch(val)
    clearTimeout(searchTimer.current)
    if (!val.trim()) { setSearchResults(null); return }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      const results = await PDB.search(val)
      setSearchResults(results)
      setSearching(false)
    }, 400)
  }

  const handleNewClient = async () => {
    if (!newForm.nome.trim()) return
    setSaving(true)
    try {
      const row = { id: uid(), nome: newForm.nome.trim(), telefone: newForm.telefone.trim(), observacao: newForm.observacao.trim() }
      await PDB.clients.insert(row)
      setClients(prev => [{ ...row, criado_em: Date.now() }, ...prev])
      setProjectCounts(prev => ({ ...prev, [row.id]: 0 }))
      setNewForm({ nome: "", telefone: "", observacao: "" })
      setShowNewClient(false)
    } catch (e) { alert("Erro: " + e.message) }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm("Excluir cliente e todos os projetos?")) return
    try { await PDB.clients.delete(id); setClients(prev => prev.filter(c => c.id !== id)) }
    catch (e) { alert("Erro: " + e.message) }
  }

  const filteredClients = search && !searchResults
    ? clients.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()))
    : clients

  return (
    <div>
      {/* Busca */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.textMuted }} />
        <input value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Pesquisar cliente, projeto ou medida..."
          style={{ width: "100%", padding: "12px 14px 12px 38px", borderRadius: 12, border: "1.5px solid " + T.border, fontSize: 14, outline: "none", boxSizing: "border-box", background: T.card }} />
        {search && <X size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: T.textMuted, cursor: "pointer" }} onClick={() => { setSearch(""); setSearchResults(null) }} />}
      </div>

      {/* Resultados de busca */}
      {searchResults !== null && (
        <div style={{ background: T.card, borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: T.textMid }}>
            {searching ? "Buscando..." : `${searchResults.length} resultado(s) para "${search}"`}
          </div>
          {searchResults.map((r, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid " + T.border, cursor: "pointer" }}
              onClick={() => r.clientId && onSelectClient({ id: r.clientId, nome: r.client }, r.projectId)}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{r.client}</div>
              {r.project && <div style={{ fontSize: 12, color: T.textMuted }}>{r.project}</div>}
              {r.piece && <div style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>Peça: {r.piece}</div>}
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{fmt_date(r.date)}</div>
            </div>
          ))}
          {!searching && searchResults.length === 0 && <div style={{ color: T.textMuted, fontSize: 13 }}>Nenhum resultado encontrado.</div>}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Clientes ({clients.length})</div>
        <Btn onClick={() => setShowNewClient(true)} size="sm" icon={<Plus size={14} />}>Novo Cliente</Btn>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 32, color: T.textMuted }}>Carregando...</div>
      ) : filteredClients.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: T.textMuted }}>
          <User size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>Nenhum cliente cadastrado</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Clique em "Novo Cliente" para começar</div>
        </div>
      ) : (
        filteredClients.map(c => (
          <div key={c.id} onClick={() => onSelectClient(c)}
            style={{ background: T.card, borderRadius: 16, padding: "16px 18px", marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, border: "1px solid " + T.border }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.greenLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: T.greenDark }}>{c.nome.charAt(0).toUpperCase()}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{c.nome}</div>
              <div style={{ fontSize: 12, color: T.textMuted }}>
                {projectCounts[c.id] || 0} projeto(s)
                {lastProjects[c.id] && ` · Último: ${fmt_date(lastProjects[c.id])}`}
              </div>
              {c.telefone && <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>{c.telefone}</div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <ChevronRight size={18} color={T.green} />
              <button onClick={e => { e.stopPropagation(); handleDelete(c.id) }}
                style={{ background: T.redLight, border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
                <Trash2 size={13} color={T.red} />
              </button>
            </div>
          </div>
        ))
      )}

      {/* Modal novo cliente */}
      {showNewClient && (
        <Modal title="Novo Cliente" onClose={() => setShowNewClient(false)}>
          {[["nome", "Nome do cliente *", "Ex: João Silva"], ["telefone", "Telefone (opcional)", "(00) 00000-0000"], ["observacao", "Observação (opcional)", ""]].map(([k, label, ph]) => (
            <div key={k} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 6 }}>{label}</div>
              {k === "observacao"
                ? <textarea value={newForm[k]} onChange={e => setNewForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} rows={3}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + T.border, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#F9FAFB", resize: "none" }} />
                : <input type="text" value={newForm[k]} onChange={e => setNewForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph}
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid " + T.border, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#F9FAFB" }} />
              }
            </div>
          ))}
          <Btn onClick={handleNewClient} fullWidth size="lg" disabled={!newForm.nome.trim() || saving} icon={<Check size={16} />}>
            {saving ? "Salvando..." : "Salvar Cliente"}
          </Btn>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// TELA: PROJETOS DO CLIENTE
// ══════════════════════════════════════════════════════
function ClientProjects({ client, onBack, onSelectProject }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newNome, setNewNome] = useState("")
  const [saving, setSaving] = useState(false)
  const [pieceCounts, setPieceCounts] = useState({})
  const [projectPieces, setProjectPieces] = useState({})
  const [projectImages, setProjectImages] = useState({})

  useEffect(() => { loadProjects() }, [client.id])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const ps = await PDB.projects.listByClient(client.id)
      setProjects(ps)
      const counts = {}, pcsMap = {}, imgs = {}
      for (const p of ps) {
        const { data: pcs } = await supabase.from("project_pieces")
          .select("id, largura_y, altura_x, quantidade")
          .eq("project_id", p.id)
          .order("criado_em", { ascending: true })
        counts[p.id] = pcs ? pcs.length : 0
        pcsMap[p.id] = pcs || []
        if (pcs && pcs.length > 0) {
          const pieceImgs = {}
          for (const pc of pcs) {
            const { data: img } = await supabase.from("piece_images").select("data").eq("piece_id", pc.id).limit(1)
            if (img && img.length > 0) pieceImgs[pc.id] = img[0].data
          }
          imgs[p.id] = pieceImgs
        }
      }
      setPieceCounts(counts)
      setProjectPieces(pcsMap)
      setProjectImages(imgs)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleNew = async () => {
    setSaving(true)
    try {
      const num = await PDB.projects.nextNumber(client.id)
      const nome = newNome.trim() || `Pedido #${String(num).padStart(3, "0")}`
      const row = { id: uid(), client_id: client.id, nome, numero: num, status: "em_edicao" }
      await PDB.projects.insert(row)
      setProjects(prev => [{ ...row, criado_em: Date.now(), atualizado_em: Date.now() }, ...prev])
      setPieceCounts(prev => ({ ...prev, [row.id]: 0 }))
      setNewNome(""); setShowNew(false)
    } catch (e) { alert("Erro: " + e.message) }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm("Excluir este pedido e todas as peças?")) return
    try { await PDB.projects.delete(id); setProjects(prev => prev.filter(p => p.id !== id)) }
    catch (e) { alert("Erro: " + e.message) }
  }

  const handleToggleStatus = async (p) => {
    const novoStatus = p.status === "concluido" ? "em_edicao" : "concluido"
    try {
      await PDB.projects.update(p.id, { status: novoStatus })
      setProjects(prev => prev.map(x => x.id === p.id ? { ...x, status: novoStatus } : x))
    } catch (e) { alert("Erro: " + e.message) }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <ArrowLeft size={20} style={{ cursor: "pointer", color: T.textMid }} onClick={onBack} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{client.nome}</div>
          <div style={{ fontSize: 13, color: T.textMuted }}>{projects.length} projeto(s)</div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Btn onClick={() => setShowNew(true)} size="sm" icon={<Plus size={14} />}>Novo Pedido</Btn>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 32, color: T.textMuted }}>Carregando...</div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: T.textMuted }}>
          <FileText size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>Nenhum pedido ainda</div>
        </div>
      ) : (
        projects.map(p => {
          const pcs = projectPieces[p.id] || []
          const imgs = projectImages[p.id] || {}
          return (
            <div key={p.id} style={{ background: T.card, borderRadius: 16, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", border: "1px solid " + T.border, overflow: "hidden" }}>
              {/* Header do pedido */}
              <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div onClick={() => onSelectProject(p)} style={{ flex: 1, cursor: "pointer" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{p.nome}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <StatusBadge status={p.status} />
                    <span style={{ fontSize: 11, color: T.textMuted }}>{pieceCounts[p.id] || 0} peça(s) · {fmt_date(p.atualizado_em)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleToggleStatus(p)}
                    style={{ background: T.greenLight, border: "none", borderRadius: 8, padding: "5px 9px", cursor: "pointer", fontSize: 11, color: T.greenDark, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {p.status === "concluido" ? "Reabrir" : "Concluir"}
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    style={{ background: T.redLight, border: "none", borderRadius: 8, padding: "5px 9px", cursor: "pointer" }}>
                    <Trash2 size={13} color={T.red} />
                  </button>
                </div>
              </div>

              {/* GALERIA DE PEÇAS */}
              {pcs.length > 0 && (
                <div style={{ borderTop: "1px solid " + T.border }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 1, background: T.border }}>
                    {pcs.map((pc, idx) => {
                      const img = imgs[pc.id]
                      return (
                        <div key={pc.id} onClick={() => onSelectProject(p)}
                          style={{ position: "relative", background: T.bg, cursor: "pointer", aspectRatio: "1", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                          {/* Imagem ou placeholder */}
                          {img ? (
                            <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          ) : (
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F8FAF8", gap: 4 }}>
                              <div style={{ width: 36, height: 44, background: T.greenLight, border: "2px solid " + T.green, borderRadius: 4 }} />
                            </div>
                          )}
                          {/* Label com dimensão sobreposta */}
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.72)", padding: "4px 6px" }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: "#fff", fontFamily: "monospace", lineHeight: 1.2 }}>
                              {pc.largura_y}×{pc.altura_x}
                            </div>
                            {pc.quantidade > 1 && (
                              <div style={{ fontSize: 9, color: T.green, fontWeight: 600 }}>{pc.quantidade}×</div>
                            )}
                          </div>
                          {/* Número da peça */}
                          <div style={{ position: "absolute", top: 5, left: 5, width: 18, height: 18, borderRadius: "50%", background: T.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 9, fontWeight: 800, color: "#fff" }}>{idx + 1}</span>
                          </div>
                        </div>
                      )
                    })}
                    {/* Card de adicionar */}
                    <div onClick={() => onSelectProject(p)}
                      style={{ background: T.bg, cursor: "pointer", aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Plus size={20} color={T.green} />
                      <span style={{ fontSize: 10, color: T.green, fontWeight: 700 }}>Editar</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Botão abrir se sem peças */}
              {pcs.length === 0 && (
                <div style={{ padding: "0 16px 14px" }}>
                  <button onClick={() => onSelectProject(p)}
                    style={{ width: "100%", background: T.bg, border: "1px solid " + T.border, borderRadius: 10, padding: "10px 14px", cursor: "pointer", textAlign: "left", fontSize: 13, color: T.green, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <Plus size={14} />Adicionar peças <ChevronRight size={14} style={{ marginLeft: "auto" }} />
                  </button>
                </div>
              )}
            </div>
          )
        })
      )}

      {showNew && (
        <Modal title="Novo Pedido" onClose={() => setShowNew(false)}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 6 }}>Nome do pedido (opcional)</div>
            <input type="text" value={newNome} onChange={e => setNewNome(e.target.value)}
              placeholder='Ex: "Box banheiro", "Porta de vidro"...'
              style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid " + T.border, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#F9FAFB" }} />
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>Se vazio, será gerado automaticamente: Pedido #001</div>
          </div>
          <Btn onClick={handleNew} fullWidth size="lg" disabled={saving} icon={<Plus size={16} />}>
            {saving ? "Criando..." : "Criar Pedido"}
          </Btn>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// TELA: PEÇAS DO PROJETO
// ══════════════════════════════════════════════════════
function ProjectDetail({ project, client, onBack }) {
  const [pieces, setPieces] = useState([])
  const [images, setImages] = useState({}) // pieceId -> [img]
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ y: "", x: "", quantidade: "1", observacao: "" })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [expandedPiece, setExpandedPiece] = useState(null)
  const fileRef = useRef(null)
  const [pendingImagePieceId, setPendingImagePieceId] = useState(null)

  useEffect(() => { loadPieces() }, [project.id])

  const loadPieces = async () => {
    setLoading(true)
    try {
      const ps = await PDB.pieces.listByProject(project.id)
      setPieces(ps)
      const imgs = {}
      for (const p of ps) {
        const pi = await PDB.images.listByPiece(p.id)
        imgs[p.id] = pi
      }
      setImages(imgs)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleSavePiece = async () => {
    const Y = int(form.y), X = int(form.x), Q = int(form.quantidade) || 1
    if (!Y || !X) return
    setSaving(true)
    try {
      if (editId) {
        await PDB.pieces.update(editId, { largura_y: Y, altura_x: X, quantidade: Q, observacao: form.observacao })
        setPieces(prev => prev.map(p => p.id === editId ? { ...p, largura_y: Y, altura_x: X, quantidade: Q, observacao: form.observacao } : p))
        setEditId(null)
      } else {
        const row = { id: uid(), project_id: project.id, largura_y: Y, altura_x: X, quantidade: Q, observacao: form.observacao }
        await PDB.pieces.insert(row)
        setPieces(prev => [...prev, { ...row, criado_em: Date.now() }])
        setImages(prev => ({ ...prev, [row.id]: [] }))
      }
      setForm({ y: "", x: "", quantidade: "1", observacao: "" })
      await PDB.projects.update(project.id, { atualizado_em: Date.now() })
    } catch (e) { alert("Erro: " + e.message) }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta peça?")) return
    try {
      await PDB.images.deleteByPiece(id)
      await PDB.pieces.delete(id)
      setPieces(prev => prev.filter(p => p.id !== id))
    } catch (e) { alert("Erro: " + e.message) }
  }

  const startEdit = (p) => {
    setEditId(p.id)
    setForm({ y: String(p.largura_y), x: String(p.altura_x), quantidade: String(p.quantidade || 1), observacao: p.observacao || "" })
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !pendingImagePieceId) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      const row = { id: uid(), piece_id: pendingImagePieceId, data: base64, nome: file.name }
      try {
        await PDB.images.insert(row)
        setImages(prev => ({ ...prev, [pendingImagePieceId]: [...(prev[pendingImagePieceId] || []), { ...row, criado_em: Date.now() }] }))
      } catch (e) { alert("Erro ao salvar imagem: " + e.message) }
    }
    reader.readAsDataURL(file)
    e.target.value = ""
    setPendingImagePieceId(null)
  }

  const handleDeleteImage = async (pieceId, imgId) => {
    try {
      await PDB.images.delete(imgId)
      setImages(prev => ({ ...prev, [pieceId]: (prev[pieceId] || []).filter(i => i.id !== imgId) }))
    } catch (e) { alert("Erro: " + e.message) }
  }

  const totalPecas = pieces.reduce((s, p) => s + (p.quantidade || 1), 0)

  return (
    <div>
      <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={handleImageUpload} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <ArrowLeft size={20} style={{ cursor: "pointer", color: T.textMid }} onClick={onBack} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{project.nome}</div>
          <div style={{ fontSize: 12, color: T.textMuted }}>{client.nome} · {totalPecas} peças</div>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {/* Dica futura integração */}
      <div style={{ background: T.dark, borderRadius: 12, padding: "10px 14px", marginBottom: 18, display: "flex", gap: 10, alignItems: "center" }}>
        <Package size={16} color={T.green} style={{ flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>
          Em breve: <span style={{ color: T.green, fontWeight: 600 }}>Enviar para Otimização</span> — todas as peças serão enviadas automaticamente.
        </div>
      </div>

      {/* Formulário — fica sempre visível */}
      <div style={{ background: T.card, borderRadius: 16, padding: 18, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
          {editId ? "Editar peça" : "Adicionar peça"}
          {editId && <button onClick={() => { setEditId(null); setForm({ y: "", x: "", quantidade: "1", observacao: "" }) }} style={{ background: "none", border: "none", cursor: "pointer", color: T.red, fontSize: 12, marginLeft: 8, fontWeight: 600 }}>Cancelar</button>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 10, marginBottom: 10 }}>
          {[["y", "Y — Largura"], ["x", "X — Altura"], ["quantidade", "Qtd."]].map(([k, label]) => (
            <div key={k}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textMid, marginBottom: 5 }}>{label}</div>
              <input type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                style={{ width: "100%", padding: "10px 10px", borderRadius: 8, border: "1.5px solid " + T.border, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#F9FAFB" }} />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.textMid, marginBottom: 5 }}>Observação (opcional)</div>
          <input type="text" value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
            placeholder="Ex: temperado, laminado..."
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid " + T.border, fontSize: 13, outline: "none", boxSizing: "border-box", background: "#F9FAFB" }} />
        </div>
        <Btn onClick={handleSavePiece} fullWidth size="md"
          icon={editId ? <Check size={15} /> : <Plus size={15} />}
          disabled={!int(form.y) || !int(form.x) || saving}>
          {saving ? "Salvando..." : editId ? "Salvar alterações" : "+ Adicionar peça"}
        </Btn>
      </div>

      {/* Lista de peças */}
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
        Peças ({pieces.length})
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 24, color: T.textMuted }}>Carregando...</div>
      ) : pieces.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 24px", color: T.textMuted }}>
          <div style={{ fontSize: 14 }}>Nenhuma peça adicionada ainda</div>
        </div>
      ) : (
        pieces.map((p, idx) => {
          const pImgs = images[p.id] || []
          const isExpanded = expandedPiece === p.id
          return (
            <div key={p.id} style={{ background: T.card, borderRadius: 14, marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              {/* Linha principal */}
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.greenLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: T.greenDark }}>{idx + 1}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setExpandedPiece(isExpanded ? null : p.id)}>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>
                    Y{p.largura_y} × X{p.altura_x} mm
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                    Qtd: {p.quantidade || 1}
                    {p.observacao && ` · ${p.observacao}`}
                    {pImgs.length > 0 && <span style={{ color: T.amber, marginLeft: 6 }}>📎 {pImgs.length} imagem(ns)</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => startEdit(p)} style={{ background: T.greenLight, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 11, color: T.greenDark }}>
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} style={{ background: T.redLight, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
                    <Trash2 size={13} color={T.red} />
                  </button>
                </div>
              </div>

              {/* Expandido: imagens */}
              {isExpanded && (
                <div style={{ padding: "0 16px 14px", borderTop: "1px solid " + T.border }}>
                  <div style={{ paddingTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, marginBottom: 10 }}>Imagens da peça</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                      {pImgs.map(img => (
                        <div key={img.id} style={{ position: "relative" }}>
                          <img src={img.data} alt={img.nome} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1.5px solid " + T.border }} />
                          <button onClick={() => handleDeleteImage(p.id, img.id)}
                            style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: T.red, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <X size={11} color="#fff" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => { setPendingImagePieceId(p.id); fileRef.current?.click() }}
                        style={{ width: 80, height: 80, borderRadius: 8, border: "2px dashed " + T.border, background: T.bg, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <Camera size={20} color={T.textMuted} />
                        <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>Adicionar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Botão salvar projeto */}
      {pieces.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <Btn onClick={async () => {
            await PDB.projects.update(project.id, { atualizado_em: Date.now() })
            alert("Projeto salvo com sucesso!")
          }} fullWidth size="lg" icon={<CheckCircle size={16} />}>
            Salvar Projeto
          </Btn>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — Projects
// ══════════════════════════════════════════════════════
export default function ProjectsScreen() {
  // screen: "clients" | "projects" | "detail"
  const [screen, setScreen] = useState("clients")
  const [selectedClient, setSelectedClient] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)

  const handleSelectClient = (client, goToProjectId = null) => {
    setSelectedClient(client)
    if (goToProjectId) {
      // Vai direto para o projeto específico
      setSelectedProject({ id: goToProjectId })
      setScreen("detail")
    } else {
      setScreen("projects")
    }
  }

  const handleSelectProject = (project) => {
    setSelectedProject(project)
    setScreen("detail")
  }

  return (
    <div>
      {screen === "clients" && (
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Projetos</div>
          <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>Gerenciar clientes e pedidos</div>
          <ClientList onSelectClient={handleSelectClient} />
        </div>
      )}

      {screen === "projects" && selectedClient && (
        <ClientProjects
          client={selectedClient}
          onBack={() => setScreen("clients")}
          onSelectProject={handleSelectProject}
        />
      )}

      {screen === "detail" && selectedProject && selectedClient && (
        <ProjectDetail
          project={selectedProject}
          client={selectedClient}
          onBack={() => setScreen("projects")}
        />
      )}
    </div>
  )
}
