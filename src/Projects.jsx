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
function ProjectDetail({ project, client, onBack, onOpenGallery }) {
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

      {/* Botão Galeria de Produção */}
      {pieces.length > 0 && (
        <button onClick={onOpenGallery}
          style={{ width: "100%", background: "#050505", border: "2px solid " + T.green, borderRadius: 14, padding: "14px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: T.greenLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 20 }}>🖼</span>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.green }}>Ver Galeria de Produção</div>
            <div style={{ fontSize: 12, color: T.textMuted }}>Visualize e marque peças durante o corte</div>
          </div>
          <ChevronRight size={18} color={T.green} style={{ marginLeft: "auto" }} />
        </button>
      )}

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
// ══════════════════════════════════════════════════════
// GALERIA DE PRODUÇÃO
// ══════════════════════════════════════════════════════

// DB helpers para piece_status
const PSdb = {
  async getByProject(projectId) {
    const { data, error } = await supabase.from("piece_status").select("*").eq("project_id", projectId)
    if (error) throw error
    return data || []
  },
  async upsert(projectId, pieceId, isCompleted) {
    const { data: existing } = await supabase.from("piece_status").select("id").eq("piece_id", pieceId).limit(1)
    if (existing && existing.length > 0) {
      await supabase.from("piece_status").update({
        is_completed: isCompleted,
        completed_at: isCompleted ? Date.now() : null,
      }).eq("piece_id", pieceId)
    } else {
      await supabase.from("piece_status").insert({
        id: uid(), project_id: projectId, piece_id: pieceId,
        is_completed: isCompleted, completed_at: isCompleted ? Date.now() : null,
        completed_by: "Operador", criado_em: Date.now(),
      })
    }
  },
}

function ProductionGallery({ project, client, onBack }) {
  const [pieces, setPieces] = useState([])
  const [images, setImages] = useState({})      // pieceId -> [imgs]
  const [status, setStatus] = useState({})       // pieceId -> bool
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [onlyPending, setOnlyPending] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [finishing, setFinishing] = useState(false)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768

  // Swipe
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  useEffect(() => { load() }, [project.id])

  const load = async () => {
    setLoading(true)
    try {
      const { data: pcs } = await supabase.from("project_pieces")
        .select("*").eq("project_id", project.id).order("criado_em", { ascending: true })
      const allPieces = pcs || []
      setPieces(allPieces)
      const imgs = {}, st = {}
      for (const p of allPieces) {
        const { data: pi } = await supabase.from("piece_images").select("*").eq("piece_id", p.id)
        imgs[p.id] = pi || []
        st[p.id] = false
      }
      setImages(imgs)
      const statuses = await PSdb.getByProject(project.id)
      statuses.forEach(s => { st[s.piece_id] = s.is_completed })
      setStatus(st)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const visiblePieces = onlyPending ? pieces.filter(p => !status[p.id]) : pieces
  const safeCurrent = Math.min(current, Math.max(0, visiblePieces.length - 1))
  const piece = visiblePieces[safeCurrent]
  const pImgs = piece ? (images[piece.id] || []) : []
  const completedCount = pieces.filter(p => status[p.id]).length
  const progress = pieces.length > 0 ? Math.round((completedCount / pieces.length) * 100) : 0
  const allDone = completedCount === pieces.length && pieces.length > 0

  const goNext = () => { setZoom(1); setCurrent(i => Math.min(i + 1, visiblePieces.length - 1)) }
  const goPrev = () => { setZoom(1); setCurrent(i => Math.max(i - 1, 0)) }

  const handleTouchStart = e => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = e => {
    touchEndX.current = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 50) { diff > 0 ? goNext() : goPrev() }
  }

  const toggleStatus = async () => {
    if (!piece) return
    const newVal = !status[piece.id]
    setStatus(prev => ({ ...prev, [piece.id]: newVal }))
    await PSdb.upsert(project.id, piece.id, newVal)
    if (newVal && safeCurrent < visiblePieces.length - 1) {
      setTimeout(() => { setZoom(1); setCurrent(i => i + 1) }, 400)
    }
  }

  const handleFinish = async () => {
    setFinishing(true)
    try {
      await supabase.from("projects").update({ status: "concluido", atualizado_em: Date.now() }).eq("id", project.id)
      alert("Pedido finalizado com sucesso!")
      onBack()
    } catch (e) { alert("Erro: " + e.message) }
    setFinishing(false)
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>Carregando galeria...</div>
    </div>
  )

  // ── LAYOUT DESKTOP (3 colunas) ──
  if (!isMobile) {
    return (
      <div style={{ display: "flex", height: "calc(100vh - 72px)", background: "#050505", borderRadius: 16, overflow: "hidden" }}>

        {/* COLUNA ESQUERDA — lista de peças */}
        <div style={{ width: 280, background: "#0B0B0B", borderRight: "1px solid #2A2A2A", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "20px 18px", borderBottom: "1px solid #2A2A2A" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Peças do Pedido</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{pieces.length} peças · {completedCount} concluídas</div>
            <button onClick={() => setOnlyPending(!onlyPending)}
              style={{ marginTop: 10, background: onlyPending ? T.green : "#1A1A1A", border: "1px solid " + (onlyPending ? T.green : "#2A2A2A"), borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 11, color: onlyPending ? "#fff" : "#9CA3AF", fontWeight: 600, width: "100%", textAlign: "left" }}>
              {onlyPending ? "✓ Só pendentes" : "☐ Só pendentes"}
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
            {visiblePieces.map((p, i) => {
              const done = status[p.id]
              const isActive = i === safeCurrent
              const img = images[p.id]?.[0]
              return (
                <div key={p.id} onClick={() => { setCurrent(i); setZoom(1) }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, marginBottom: 6, cursor: "pointer", background: isActive ? "#1A2A1A" : "transparent", border: "1px solid " + (isActive ? T.green : "transparent") }}>
                  {/* Miniatura */}
                  <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#1A1A1A", border: "1px solid #2A2A2A" }}>
                    {img ? <img src={img.data} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 18 }}>🪟</span></div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: isActive ? T.green : "#fff", fontFamily: "monospace" }}>{p.largura_y}×{p.altura_x}</div>
                    <div style={{ fontSize: 10, color: "#6B7280" }}>Peça {i + 1} · Qtd {p.quantidade || 1}</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? T.green : "transparent", border: "2px solid " + (done ? T.green : "#4B5563"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {done && <span style={{ fontSize: 10, color: "#fff" }}>✓</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* COLUNA CENTRO — imagem */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#050505" }}>
          {/* Header centro */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #1A1A1A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button onClick={onBack} style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 8, padding: "7px 12px", cursor: "pointer", color: "#9CA3AF", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                ← Voltar
              </button>
              <div>
                <div style={{ fontSize: 12, color: "#9CA3AF" }}>{client.nome} · {project.nome}</div>
                {piece && <div style={{ fontSize: 22, fontWeight: 900, color: T.green, fontFamily: "monospace", letterSpacing: 1 }}>{piece.largura_y} × {piece.altura_x} mm</div>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>Peça {safeCurrent + 1} de {visiblePieces.length}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>{completedCount} de {pieces.length} concluídas</div>
              {/* Barra progresso */}
              <div style={{ width: 160, height: 6, background: "#1A1A1A", borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
                <div style={{ width: progress + "%", height: "100%", background: T.green, borderRadius: 3, transition: "width .3s" }} />
              </div>
            </div>
          </div>

          {/* Imagem */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
            {pImgs.length > 0 ? (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={pImgs[0].data} alt=""
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 16, transform: `scale(${zoom})`, transition: "transform .2s", cursor: zoom > 1 ? "grab" : "zoom-in" }}
                  onClick={() => setZoom(z => z >= 3 ? 1 : z + 0.5)} />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, color: "#4B5563" }}>
                <div style={{ fontSize: 80 }}>🪟</div>
                <div style={{ fontSize: 20, color: "#6B7280", fontWeight: 600 }}>Sem imagem anexada</div>
                {piece && <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", fontFamily: "monospace" }}>{piece.largura_y} × {piece.altura_x}</div>}
              </div>
            )}
            {/* Overlay concluída */}
            {piece && status[piece.id] && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ fontSize: 80, opacity: 0.4 }}>✓</div>
              </div>
            )}
            {/* Navegação lateral */}
            <button onClick={goPrev} disabled={safeCurrent === 0}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", fontSize: 18, color: safeCurrent === 0 ? "#2A2A2A" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              ‹
            </button>
            <button onClick={goNext} disabled={safeCurrent >= visiblePieces.length - 1}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", fontSize: 18, color: safeCurrent >= visiblePieces.length - 1 ? "#2A2A2A" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              ›
            </button>
            {/* Zoom controls */}
            <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", gap: 8 }}>
              {[["−", () => setZoom(z => Math.max(1, z - 0.5))], ["+", () => setZoom(z => Math.min(4, z + 0.5))], ["↺", () => setZoom(1)]].map(([label, fn]) => (
                <button key={label} onClick={fn} style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 8, width: 36, height: 36, cursor: "pointer", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div style={{ padding: "16px 24px", borderTop: "1px solid #1A1A1A", display: "flex", gap: 12 }}>
            {allDone ? (
              <button onClick={handleFinish} disabled={finishing}
                style={{ flex: 1, background: T.green, border: "none", borderRadius: 14, padding: "16px", cursor: "pointer", fontSize: 16, fontWeight: 800, color: "#fff" }}>
                {finishing ? "Finalizando..." : "✅ Finalizar Pedido"}
              </button>
            ) : (
              <button onClick={toggleStatus}
                style={{ flex: 1, background: piece && status[piece.id] ? "#1A2A1A" : T.green, border: "2px solid " + T.green, borderRadius: 14, padding: "16px", cursor: "pointer", fontSize: 16, fontWeight: 800, color: "#fff" }}>
                {piece && status[piece.id] ? "✓ Peça concluída — Desmarcar" : "Marcar como concluída"}
              </button>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA — informações */}
        <div style={{ width: 300, background: "#0B0B0B", borderLeft: "1px solid #2A2A2A", padding: "24px 20px", overflowY: "auto" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 20 }}>Informações da Peça</div>
          {piece ? (
            <>
              {[["Dimensão Y (largura)", piece.largura_y + " mm"], ["Dimensão X (altura)", piece.altura_x + " mm"], ["Quantidade", piece.quantidade || 1], ["Status", status[piece.id] ? "Concluída ✓" : "Pendente"], ["Observação", piece.observacao || "—"]].map(([l, v]) => (
                <div key={l} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: l === "Status" ? (status[piece.id] ? T.green : T.amber) : "#fff" }}>{v}</div>
                </div>
              ))}
              <div style={{ height: 1, background: "#2A2A2A", margin: "20px 0" }} />
              <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, marginBottom: 10, textTransform: "uppercase" }}>Imagens ({pImgs.length})</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {pImgs.map((img, i) => (
                  <img key={i} src={img.data} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid #2A2A2A", cursor: "pointer" }} onClick={() => {}} />
                ))}
                {pImgs.length === 0 && <div style={{ fontSize: 12, color: "#4B5563" }}>Sem imagens</div>}
              </div>
              <div style={{ height: 1, background: "#2A2A2A", margin: "20px 0" }} />
              <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, marginBottom: 10, textTransform: "uppercase" }}>Progresso Geral</div>
              <div style={{ height: 8, background: "#1A1A1A", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                <div style={{ width: progress + "%", height: "100%", background: T.green, borderRadius: 4, transition: "width .3s" }} />
              </div>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>{completedCount} de {pieces.length} peças ({progress}%)</div>
            </>
          ) : <div style={{ color: "#4B5563" }}>Nenhuma peça selecionada</div>}
        </div>
      </div>
    )
  }

  // ── LAYOUT MOBILE (fullscreen) ──
  return (
    <div style={{ position: "fixed", inset: 0, background: "#050505", zIndex: 200, display: "flex", flexDirection: "column" }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* Header mobile */}
      <div style={{ background: "#0B0B0B", padding: "12px 16px", borderBottom: "1px solid #1A1A1A", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
            ← Voltar
          </button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{client.nome} · {project.nome}</div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>Peça {safeCurrent + 1} de {visiblePieces.length}</div>
          </div>
          <button onClick={() => setOnlyPending(!onlyPending)}
            style={{ background: onlyPending ? T.green : "#1A1A1A", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 10, color: "#fff", fontWeight: 700 }}>
            {onlyPending ? "✓ Pend." : "Pend."}
          </button>
        </div>
        {/* Barra de progresso */}
        <div style={{ height: 4, background: "#1A1A1A", borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
          <div style={{ width: progress + "%", height: "100%", background: T.green, borderRadius: 2, transition: "width .3s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {piece && <div style={{ fontSize: 22, fontWeight: 900, color: T.green, fontFamily: "monospace" }}>{piece.largura_y} × {piece.altura_x}</div>}
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>{completedCount}/{pieces.length} concluídas · {progress}%</div>
        </div>
      </div>

      {/* Imagem — área principal */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "#050505" }}>
        {pImgs.length > 0 ? (
          <img src={pImgs[0].data} alt=""
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transform: `scale(${zoom})`, transition: "transform .2s", touchAction: "manipulation" }}
            onClick={() => setZoom(z => z >= 3 ? 1 : z + 0.75)} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "#4B5563" }}>
            <div style={{ fontSize: 64 }}>🪟</div>
            {piece && <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", fontFamily: "monospace" }}>{piece.largura_y} × {piece.altura_x}</div>}
            <div style={{ fontSize: 13, color: "#6B7280" }}>Sem imagem anexada</div>
          </div>
        )}
        {/* Overlay concluída */}
        {piece && status[piece.id] && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ fontSize: 64, opacity: 0.5 }}>✓</div>
          </div>
        )}
        {/* Botões nav laterais */}
        <button onClick={goPrev} disabled={safeCurrent === 0}
          style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", fontSize: 20, color: safeCurrent === 0 ? "#333" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          ‹
        </button>
        <button onClick={goNext} disabled={safeCurrent >= visiblePieces.length - 1}
          style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", fontSize: 20, color: safeCurrent >= visiblePieces.length - 1 ? "#333" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          ›
        </button>
        {/* Zoom */}
        <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: 6 }}>
          {[["−", () => setZoom(z => Math.max(1, z - 0.5))], ["+", () => setZoom(z => Math.min(4, z + 0.5))], ["↺", () => setZoom(1)]].map(([l, fn]) => (
            <button key={l} onClick={fn} style={{ background: "rgba(0,0,0,0.7)", border: "1px solid #333", borderRadius: 8, width: 34, height: 34, cursor: "pointer", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{l}</button>
          ))}
        </div>
        {/* Indicadores de página */}
        <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
          {visiblePieces.slice(Math.max(0, safeCurrent - 2), safeCurrent + 3).map((_, i) => {
            const realIdx = Math.max(0, safeCurrent - 2) + i
            return <div key={realIdx} style={{ width: realIdx === safeCurrent ? 18 : 6, height: 6, borderRadius: 3, background: realIdx === safeCurrent ? T.green : "#333", transition: "all .2s" }} />
          })}
        </div>
      </div>

      {/* Botão inferior */}
      <div style={{ padding: "12px 16px 24px", background: "#0B0B0B", borderTop: "1px solid #1A1A1A", flexShrink: 0 }}>
        {allDone ? (
          <button onClick={handleFinish} disabled={finishing}
            style={{ width: "100%", background: T.green, border: "none", borderRadius: 16, padding: "18px", cursor: "pointer", fontSize: 18, fontWeight: 900, color: "#fff" }}>
            {finishing ? "Finalizando..." : "✅ Finalizar Pedido"}
          </button>
        ) : (
          <button onClick={toggleStatus}
            style={{ width: "100%", background: piece && status[piece.id] ? "transparent" : T.green, border: "3px solid " + T.green, borderRadius: 16, padding: "18px", cursor: "pointer", fontSize: 17, fontWeight: 900, color: "#fff", transition: "all .2s" }}>
            {piece && status[piece.id] ? "✓ Concluída — Toque para desmarcar" : "Marcar como concluída"}
          </button>
        )}
        {/* Mini lista de peças */}
        <div style={{ display: "flex", gap: 6, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
          {visiblePieces.map((p, i) => (
            <button key={p.id} onClick={() => { setCurrent(i); setZoom(1) }}
              style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 10, border: "2px solid " + (i === safeCurrent ? T.green : status[p.id] ? "#1A3A1A" : "#2A2A2A"), background: i === safeCurrent ? "#1A2A1A" : status[p.id] ? "#0D1A0D" : "#111", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              {images[p.id]?.[0] ? (
                <img src={images[p.id][0].data} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
              ) : (
                <span style={{ fontSize: 9, color: i === safeCurrent ? T.green : "#6B7280", fontWeight: 700, fontFamily: "monospace" }}>{p.largura_y}×{p.altura_x}</span>
              )}
              {status[p.id] && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(34,197,94,0.3)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 14, color: T.green }}>✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// TELA PRINCIPAL — Projects
// ══════════════════════════════════════════════════════
export default function ProjectsScreen() {
  const [screen, setScreen] = useState("clients")
  const [selectedClient, setSelectedClient] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)

  const handleSelectClient = (client, goToProjectId = null) => {
    setSelectedClient(client)
    if (goToProjectId) {
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
          onOpenGallery={() => setScreen("gallery")}
        />
      )}

      {screen === "gallery" && selectedProject && selectedClient && (
        <ProductionGallery
          project={selectedProject}
          client={selectedClient}
          onBack={() => setScreen("detail")}
        />
      )}
    </div>
  )
}
