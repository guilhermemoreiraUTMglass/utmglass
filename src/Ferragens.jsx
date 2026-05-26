// =============================================
// OTMglass — Ferragens.jsx v3.0
// Upload de imagem real + Modal de visualização
// =============================================

import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const CATEGORIAS = [
  { label: "Todas", value: "todas" },
  { label: "Dobradiças", value: "Dobradiças" },
  { label: "Trincos", value: "Trincos" },
  { label: "Puxadores", value: "Puxadores" },
  { label: "Mão amiga", value: "Mão amiga" },
  { label: "Fechaduras", value: "Fechaduras" },
  { label: "Suportes", value: "Suportes" },
  { label: "Outros", value: "Outros" },
];

const ORDENACAO = [
  { label: "Código (A-Z)", value: "codigo_asc" },
  { label: "Código (Z-A)", value: "codigo_desc" },
  { label: "Mais utilizadas", value: "uso_desc" },
  { label: "Recentes", value: "recentes" },
];

const COR_CATEGORIA = {
  "Dobradiças": "#22C55E",
  "Trincos": "#3B82F6",
  "Puxadores": "#F59E0B",
  "Mão amiga": "#EC4899",
  "Fechaduras": "#8B5CF6",
  "Suportes": "#06B6D4",
  "Outros": "#6B7280",
};

const SUPABASE_URL = "https://kejyfnqkffdsepuggmto.supabase.co";

function GabaritoSVG({ codigo, tipo }) {
  const seed = parseInt(codigo, 10) || 1000;
  const r1 = 8 + (seed % 12);
  const r2 = 14 + (seed % 8);
  const isRecorte = tipo === "recorte";
  return (
    <svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", background: "#f8f8f8" }}>
      <defs>
        <pattern id={`g-${codigo}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect width="120" height="90" fill={`url(#g-${codigo})`} />
      {isRecorte ? (
        <>
          <rect x="20" y="55" width="80" height="20" fill="none" stroke="#111" strokeWidth="1.5" />
          <rect x="20" y="20" width="25" height="35" fill="none" stroke="#111" strokeWidth="1.5" />
          <path d={`M45,20 Q45,55 ${45+r1},55`} fill="none" stroke="#111" strokeWidth="1.2" />
          <text x="52" y="38" fontSize="6" fill="#666">R{r1}</text>
          <text x="60" y="12" textAnchor="middle" fontSize="7" fill="#444">{85+(seed%40)}</text>
        </>
      ) : (
        <>
          <circle cx="40" cy="45" r={r1} fill="none" stroke="#111" strokeWidth="1.5" />
          <circle cx="40" cy="45" r="1.5" fill="#111" />
          <circle cx="80" cy="45" r={r2} fill="none" stroke="#111" strokeWidth="1.5" />
          <circle cx="80" cy="45" r="1.5" fill="#111" />
          <line x1="40" y1="20" x2="40" y2="70" stroke="#aaa" strokeWidth="0.5" strokeDasharray="3,2" />
          <line x1="15" y1="45" x2="65" y2="45" stroke="#aaa" strokeWidth="0.5" strokeDasharray="3,2" />
          <line x1="80" y1="20" x2="80" y2="70" stroke="#aaa" strokeWidth="0.5" strokeDasharray="3,2" />
          <line x1="55" y1="45" x2="105" y2="45" stroke="#aaa" strokeWidth="0.5" strokeDasharray="3,2" />
          <text x="40" y="17" textAnchor="middle" fontSize="7" fill="#444">Ø{r1*2}</text>
          <text x="80" y="17" textAnchor="middle" fontSize="7" fill="#444">Ø{r2*2}</text>
        </>
      )}
      <text x="116" y="87" textAnchor="end" fontSize="5" fill="#bbb">{codigo}</text>
    </svg>
  );
}

// ── Upload de imagem para Supabase Storage ──
async function uploadImagem(file, codigo) {
  const ext = file.name.split(".").pop();
  const path = `${codigo}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("ferragens").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("ferragens").getPublicUrl(path);
  return data.publicUrl;
}

// ── Modal de visualização ao clicar na ferragem ──
function ModalVisualizacao({ ferragem, onClose, onEditar }) {
  const cor = COR_CATEGORIA[ferragem.categoria] || "#22C55E";
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#1a1a1a", border: "1px solid #2a2a2a",
        borderRadius: "20px", width: "100%", maxWidth: "420px", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "#111", padding: "16px 20px",
          borderBottom: "1px solid #2a2a2a",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#fff" }}>{ferragem.codigo}</div>
            <div style={{ fontSize: "13px", color: "#888", marginTop: "2px" }}>{ferragem.nome}</div>
          </div>
          <button onClick={onClose} style={{
            background: "#ffffff11", border: "1px solid #333",
            borderRadius: "8px", width: "36px", height: "36px",
            color: "#888", cursor: "pointer", fontSize: "20px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        {/* Imagem grande */}
        <div style={{
          background: "#fff", margin: "20px", borderRadius: "14px",
          overflow: "hidden", minHeight: "240px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {ferragem.imagem_url ? (
            <img src={ferragem.imagem_url} alt={ferragem.codigo}
              style={{ width: "100%", maxHeight: "320px", objectFit: "contain" }} />
          ) : (
            <div style={{ width: "100%", height: "240px" }}>
              <GabaritoSVG codigo={ferragem.codigo} tipo={ferragem.tipo} />
            </div>
          )}
        </div>

        {/* Tags */}
        <div style={{ padding: "0 20px", display: "flex", gap: "8px", marginBottom: "16px" }}>
          <span style={{
            background: `${cor}22`, color: cor, border: `1px solid ${cor}44`,
            borderRadius: "20px", padding: "5px 14px", fontSize: "12px", fontWeight: "600",
          }}>{ferragem.categoria}</span>
          <span style={{
            background: "#ffffff11", color: "#aaa", border: "1px solid #333",
            borderRadius: "20px", padding: "5px 14px", fontSize: "12px",
          }}>Gabarito de {ferragem.tipo}</span>
        </div>

        {ferragem.descricao && (
          <div style={{ padding: "0 20px", marginBottom: "16px", color: "#888", fontSize: "13px", lineHeight: "1.5" }}>
            {ferragem.descricao}
          </div>
        )}

        {/* Botão editar */}
        <div style={{ padding: "0 20px 20px" }}>
          <button onClick={() => { onEditar(ferragem); onClose(); }} style={{
            width: "100%", background: "#22C55E22", border: "1px solid #22C55E",
            borderRadius: "12px", padding: "13px",
            color: "#22C55E", cursor: "pointer", fontSize: "14px", fontWeight: "700",
          }}>✏️ Editar ferragem</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal formulário (Nova + Editar) com upload de imagem ──
function ModalFormFerragem({ ferragem, onClose, onSalvar }) {
  const editando = !!ferragem;
  const [form, setForm] = useState({
    codigo: ferragem?.codigo || "",
    nome: ferragem?.nome || "",
    tipo: ferragem?.tipo || "furação",
    categoria: ferragem?.categoria || "Dobradiças",
    descricao: ferragem?.descricao || "",
    imagem_url: ferragem?.imagem_url || "",
  });
  const [arquivoImagem, setArquivoImagem] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(ferragem?.imagem_url || "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const inputFileRef = useRef(null);

  const handleArquivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArquivoImagem(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSalvar = async () => {
    if (!form.codigo.trim() || !form.nome.trim()) {
      setErro("Código e nome são obrigatórios.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      let imagem_url = form.imagem_url;
      if (arquivoImagem) {
        imagem_url = await uploadImagem(arquivoImagem, form.codigo);
      }
      await onSalvar({ ...form, imagem_url });
      onClose();
    } catch (e) {
      setErro(e.message || "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const inputStyle = {
    width: "100%", background: "#111", border: "1px solid #333",
    borderRadius: "8px", padding: "10px 14px", color: "#fff",
    fontSize: "14px", outline: "none", boxSizing: "border-box",
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#1a1a1a", border: "1px solid #2a2a2a",
        borderRadius: "16px", width: "100%", maxWidth: "440px",
        overflow: "hidden", maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{
          background: "#111", padding: "16px 20px",
          borderBottom: "1px solid #2a2a2a",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0, zIndex: 1,
        }}>
          <span style={{ color: "#fff", fontWeight: "700", fontSize: "16px" }}>
            {editando ? "✏️ Editar Ferragem" : "🔧 Nova Ferragem"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: "20px", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Upload de imagem */}
          <div>
            <label style={{ color: "#888", fontSize: "12px", marginBottom: "8px", display: "block" }}>
              Imagem do gabarito
            </label>
            <div
              onClick={() => inputFileRef.current?.click()}
              style={{
                background: "#111", border: `2px dashed ${previewUrl ? "#22C55E" : "#333"}`,
                borderRadius: "12px", overflow: "hidden",
                cursor: "pointer", minHeight: "160px",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}
            >
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="preview"
                    style={{ width: "100%", maxHeight: "200px", objectFit: "contain", background: "#fff" }} />
                  <div style={{
                    position: "absolute", bottom: "8px", right: "8px",
                    background: "#22C55E", borderRadius: "8px",
                    padding: "4px 10px", fontSize: "11px", color: "#fff", fontWeight: "700",
                  }}>Trocar imagem</div>
                </>
              ) : (
                <div style={{ textAlign: "center", color: "#555", padding: "20px" }}>
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>📷</div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#888" }}>Toque para adicionar imagem</div>
                  <div style={{ fontSize: "12px", marginTop: "4px" }}>JPG, PNG ou PDF</div>
                </div>
              )}
            </div>
            <input ref={inputFileRef} type="file" accept="image/*"
              onChange={handleArquivo} style={{ display: "none" }} />
          </div>

          <div>
            <label style={{ color: "#888", fontSize: "12px", marginBottom: "6px", display: "block" }}>Código *</label>
            <input style={inputStyle} placeholder="ex: 1103" value={form.codigo}
              onChange={e => setForm({ ...form, codigo: e.target.value })} />
          </div>

          <div>
            <label style={{ color: "#888", fontSize: "12px", marginBottom: "6px", display: "block" }}>Nome *</label>
            <input style={inputStyle} placeholder="ex: Dobradiça 180° pivotante" value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ color: "#888", fontSize: "12px", marginBottom: "6px", display: "block" }}>Tipo *</label>
              <select style={{ ...inputStyle, appearance: "none" }} value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value })}>
                <option value="furação">Furação</option>
                <option value="recorte">Recorte</option>
              </select>
            </div>
            <div>
              <label style={{ color: "#888", fontSize: "12px", marginBottom: "6px", display: "block" }}>Categoria *</label>
              <select style={{ ...inputStyle, appearance: "none" }} value={form.categoria}
                onChange={e => setForm({ ...form, categoria: e.target.value })}>
                {CATEGORIAS.filter(c => c.value !== "todas").map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ color: "#888", fontSize: "12px", marginBottom: "6px", display: "block" }}>Descrição técnica</label>
            <textarea style={{ ...inputStyle, minHeight: "72px", resize: "vertical" }}
              placeholder="Detalhes, dimensões, observações..." value={form.descricao}
              onChange={e => setForm({ ...form, descricao: e.target.value })} />
          </div>

          {erro && (
            <div style={{ background: "#ff444422", border: "1px solid #ff4444", borderRadius: "8px", padding: "10px 14px", color: "#ff4444", fontSize: "13px" }}>
              {erro}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "4px" }}>
            <button onClick={onClose} style={{
              background: "#ffffff11", border: "1px solid #333", borderRadius: "10px",
              padding: "13px", color: "#aaa", cursor: "pointer", fontSize: "14px",
            }}>Cancelar</button>
            <button onClick={handleSalvar} disabled={salvando} style={{
              background: salvando ? "#166534" : "#22C55E", border: "none",
              borderRadius: "10px", padding: "13px",
              color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "700",
            }}>{salvando ? "Salvando..." : "Salvar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal confirmar exclusão ──
function ModalConfirmarExclusao({ quantidade, onConfirmar, onCancelar }) {
  const [excluindo, setExcluindo] = useState(false);
  return (
    <div onClick={onCancelar} style={{
      position: "fixed", inset: 0, zIndex: 1001,
      background: "rgba(0,0,0,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#1a1a1a", border: "1px solid #ff444444",
        borderRadius: "16px", width: "100%", maxWidth: "340px",
        padding: "28px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>🗑️</div>
        <div style={{ color: "#fff", fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>
          Excluir {quantidade > 1 ? `${quantidade} ferragens` : "ferragem"}?
        </div>
        <div style={{ color: "#888", fontSize: "13px", marginBottom: "24px" }}>Essa ação não pode ser desfeita.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button onClick={onCancelar} style={{
            background: "#ffffff11", border: "1px solid #333", borderRadius: "10px",
            padding: "12px", color: "#aaa", cursor: "pointer", fontSize: "14px",
          }}>Cancelar</button>
          <button onClick={async () => { setExcluindo(true); await onConfirmar(); }} disabled={excluindo} style={{
            background: excluindo ? "#7f1d1d" : "#EF4444", border: "none", borderRadius: "10px",
            padding: "12px", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "700",
          }}>{excluindo ? "Excluindo..." : "Excluir"}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════
export default function Ferragens({ isMobile }) {
  const [ferragens, setFerragens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("todas");
  const [ordenacao, setOrdenacao] = useState("uso_desc");
  const [viewMode, setViewMode] = useState("grid");
  const [mostrarFavoritos, setMostrarFavoritos] = useState(false);
  const [selecionadas, setSelecionadas] = useState(new Set());
  const [modalVer, setModalVer] = useState(null);
  const [modalForm, setModalForm] = useState(null);
  const [modalExcluir, setModalExcluir] = useState(false);

  const modoSelecao = selecionadas.size > 0;

  useEffect(() => { carregarFerragens(); }, []);

  const carregarFerragens = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("ferragens").select("*").eq("ativo", true).order("uso_count", { ascending: false });
      if (error) throw error;
      setFerragens(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleSelecao = (id) => {
    setSelecionadas(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const ferragensFiltradas = ferragens
    .filter(f => {
      const mb = !busca || f.codigo.toLowerCase().includes(busca.toLowerCase()) || f.nome.toLowerCase().includes(busca.toLowerCase()) || f.categoria.toLowerCase().includes(busca.toLowerCase());
      const mc = categoriaAtiva === "todas" || f.categoria === categoriaAtiva;
      const mf = !mostrarFavoritos || f.favorito;
      return mb && mc && mf;
    })
    .sort((a, b) => {
      if (ordenacao === "codigo_asc") return a.codigo.localeCompare(b.codigo);
      if (ordenacao === "codigo_desc") return b.codigo.localeCompare(a.codigo);
      if (ordenacao === "uso_desc") return (b.uso_count||0)-(a.uso_count||0);
      if (ordenacao === "recentes") return new Date(b.created_at)-new Date(a.created_at);
      return 0;
    });

  const maisUtilizadas = ferragens.filter(f=>(f.uso_count||0)>0).sort((a,b)=>(b.uso_count||0)-(a.uso_count||0)).slice(0,6);
  const todasSelecionadas = selecionadas.size===ferragensFiltradas.length && ferragensFiltradas.length>0;
  const ferragem1Sel = selecionadas.size===1 ? ferragens.find(f=>f.id===[...selecionadas][0]) : null;

  const salvarFerragem = async (form) => {
    if (modalForm && modalForm !== "nova") {
      const { error } = await supabase.from("ferragens").update(form).eq("id", modalForm.id);
      if (error) throw error;
      setFerragens(prev => prev.map(f => f.id===modalForm.id ? {...f,...form} : f));
    } else {
      const { data, error } = await supabase.from("ferragens").insert([{...form, uso_count:0, ativo:true}]).select().single();
      if (error) throw error;
      setFerragens(prev => [data,...prev]);
    }
  };

  const excluirSelecionadas = async () => {
    const ids = [...selecionadas];
    const { error } = await supabase.from("ferragens").delete().in("id", ids);
    if (error) throw error;
    setFerragens(prev => prev.filter(f=>!selecionadas.has(f.id)));
    setSelecionadas(new Set());
    setModalExcluir(false);
  };

  const toggleFavorito = async (f) => {
    const novo = !f.favorito;
    setFerragens(prev => prev.map(x => x.id===f.id ? {...x,favorito:novo} : x));
    await supabase.from("ferragens").update({favorito:novo}).eq("id",f.id);
  };

  const abrirFerragem = (f) => {
    if (modoSelecao) { toggleSelecao(f.id); return; }
    setModalVer(f);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0d0d0d", color:"#fff", fontFamily:"'Barlow',sans-serif", paddingBottom: isMobile?"80px":"40px" }}>

      {/* Header */}
      <div style={{ background:"#111", borderBottom:"1px solid #1e1e1e", padding: isMobile?"14px 16px":"18px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ fontSize:"20px" }}>🔧</span>
          <div>
            <div style={{ fontSize: isMobile?"18px":"22px", fontWeight:"700" }}>Ferragens</div>
            <div style={{ fontSize:"11px", color:"#666" }}>Biblioteca de gabaritos de recortes e furações</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button onClick={()=>setMostrarFavoritos(!mostrarFavoritos)} style={{ background:mostrarFavoritos?"#22C55E22":"#ffffff11", border:`1px solid ${mostrarFavoritos?"#22C55E":"#333"}`, borderRadius:"10px", padding:"8px 14px", color:mostrarFavoritos?"#22C55E":"#aaa", cursor:"pointer", fontSize:"13px", fontWeight:"600" }}>★ Favoritos</button>
          <button onClick={()=>setModalForm("nova")} style={{ background:"#22C55E", border:"none", borderRadius:"10px", padding:"8px 14px", color:"#fff", cursor:"pointer", fontSize:"13px", fontWeight:"700" }}>+ Nova</button>
        </div>
      </div>

      {/* Barra de seleção */}
      {modoSelecao && (
        <div style={{ background:"#1a2a1a", borderBottom:"1px solid #22C55E33", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"10px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <label style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer" }}>
              <input type="checkbox" checked={todasSelecionadas} onChange={()=>{ todasSelecionadas ? setSelecionadas(new Set()) : setSelecionadas(new Set(ferragensFiltradas.map(f=>f.id))) }} style={{ width:"18px", height:"18px", accentColor:"#22C55E", cursor:"pointer" }} />
              <span style={{ color:"#aaa", fontSize:"13px" }}>{selecionadas.size} selecionada{selecionadas.size>1?"s":""}</span>
            </label>
            <button onClick={()=>setSelecionadas(new Set())} style={{ background:"none", border:"none", color:"#666", cursor:"pointer", fontSize:"12px", textDecoration:"underline" }}>Limpar</button>
          </div>
          <div style={{ display:"flex", gap:"8px" }}>
            {selecionadas.size===1 && (
              <button onClick={()=>{ setModalForm(ferragem1Sel); setSelecionadas(new Set()); }} style={{ background:"#22C55E22", border:"1px solid #22C55E", borderRadius:"8px", padding:"8px 16px", color:"#22C55E", cursor:"pointer", fontSize:"13px", fontWeight:"700" }}>✏️ Editar</button>
            )}
            <button onClick={()=>setModalExcluir(true)} style={{ background:"#EF444422", border:"1px solid #EF4444", borderRadius:"8px", padding:"8px 16px", color:"#EF4444", cursor:"pointer", fontSize:"13px", fontWeight:"700" }}>🗑️ Excluir {selecionadas.size>1?`(${selecionadas.size})`:""}</button>
          </div>
        </div>
      )}

      <div style={{ padding: isMobile?"16px":"24px 32px" }}>
        {/* Busca */}
        <div style={{ position:"relative", marginBottom:"8px" }}>
          <span style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", color:"#666" }}>🔍</span>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Pesquisar código ou ferragem..."
            style={{ width:"100%", background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:"12px", padding:"12px 16px 12px 42px", color:"#fff", fontSize:"15px", outline:"none", boxSizing:"border-box" }} />
          {busca && <button onClick={()=>setBusca("")} style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#666", cursor:"pointer", fontSize:"18px" }}>×</button>}
        </div>
        <p style={{ color:"#555", fontSize:"12px", marginBottom:"16px" }}>💡 Exemplos: 1103, 1010, dobradiça, trinco, pino, fechadura...</p>

        {/* Categorias */}
        <div style={{ display:"flex", gap:"8px", overflowX:"auto", paddingBottom:"8px", marginBottom:"24px", scrollbarWidth:"none" }}>
          {CATEGORIAS.map(cat => (
            <button key={cat.value} onClick={()=>setCategoriaAtiva(cat.value)} style={{ flexShrink:0, background:categoriaAtiva===cat.value?"#22C55E22":"#1a1a1a", border:`1.5px solid ${categoriaAtiva===cat.value?"#22C55E":"#2a2a2a"}`, borderRadius:"20px", padding:"7px 16px", color:categoriaAtiva===cat.value?"#22C55E":"#888", cursor:"pointer", fontSize:"13px", fontWeight:categoriaAtiva===cat.value?"700":"400", whiteSpace:"nowrap" }}>{cat.label}</button>
          ))}
        </div>

        {/* Mais utilizadas */}
        {categoriaAtiva==="todas" && !busca && !mostrarFavoritos && !modoSelecao && maisUtilizadas.length>0 && (
          <div style={{ marginBottom:"28px" }}>
            <h2 style={{ margin:"0 0 14px", fontSize:"16px", fontWeight:"700" }}>🔥 Mais utilizadas</h2>
            <div style={{ display:"grid", gridTemplateColumns: isMobile?"repeat(2,1fr)":"repeat(auto-fill,minmax(160px,1fr))", gap:"12px" }}>
              {maisUtilizadas.map(f => <CardFerragem key={f.id} ferragem={f} selecionada={selecionadas.has(f.id)} modoSelecao={modoSelecao} onClick={()=>abrirFerragem(f)} onToggleSelecao={()=>toggleSelecao(f.id)} onFavorito={()=>toggleFavorito(f)} />)}
            </div>
          </div>
        )}

        {/* Lista principal */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px", flexWrap:"wrap", gap:"10px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <label style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer" }}>
                <input type="checkbox" checked={todasSelecionadas} onChange={()=>{ todasSelecionadas ? setSelecionadas(new Set()) : setSelecionadas(new Set(ferragensFiltradas.map(f=>f.id))) }} style={{ width:"16px", height:"16px", accentColor:"#22C55E", cursor:"pointer" }} />
              </label>
              <h2 style={{ margin:0, fontSize:"15px", fontWeight:"700" }}>
                {mostrarFavoritos?"⭐ Favoritas":busca?"Resultados":"Todas as ferragens"}
                <span style={{ marginLeft:"8px", background:"#2a2a2a", borderRadius:"20px", padding:"2px 10px", fontSize:"12px", color:"#888", fontWeight:"400" }}>{ferragensFiltradas.length}</span>
              </h2>
            </div>
            <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
              <select value={ordenacao} onChange={e=>setOrdenacao(e.target.value)} style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:"8px", padding:"6px 10px", color:"#aaa", fontSize:"12px", outline:"none", cursor:"pointer" }}>
                {ORDENACAO.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div style={{ display:"flex", background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:"8px", overflow:"hidden" }}>
                {["grid","list"].map(m=><button key={m} onClick={()=>setViewMode(m)} style={{ background:viewMode===m?"#22C55E22":"none", border:"none", padding:"6px 10px", color:viewMode===m?"#22C55E":"#666", cursor:"pointer", fontSize:"14px" }}>{m==="grid"?"⊞":"☰"}</button>)}
              </div>
            </div>
          </div>

          {loading && <div style={{ textAlign:"center", padding:"60px 0", color:"#666" }}>Carregando ferragens...</div>}

          {!loading && ferragensFiltradas.length===0 && (
            <div style={{ textAlign:"center", padding:"60px 20px", color:"#555" }}>
              <div style={{ fontSize:"40px", marginBottom:"12px" }}>🔧</div>
              <div style={{ fontSize:"16px", marginBottom:"6px" }}>Nenhuma ferragem encontrada</div>
              {!busca && <button onClick={()=>setModalForm("nova")} style={{ marginTop:"16px", background:"#22C55E", border:"none", borderRadius:"10px", padding:"10px 24px", color:"#fff", cursor:"pointer", fontSize:"14px", fontWeight:"700" }}>+ Nova Ferragem</button>}
            </div>
          )}

          {!loading && ferragensFiltradas.length>0 && (
            viewMode==="grid" ? (
              <div style={{ display:"grid", gridTemplateColumns: isMobile?"repeat(2,1fr)":"repeat(auto-fill,minmax(170px,1fr))", gap:"12px" }}>
                {ferragensFiltradas.map(f=><CardFerragem key={f.id} ferragem={f} selecionada={selecionadas.has(f.id)} modoSelecao={modoSelecao} onClick={()=>abrirFerragem(f)} onToggleSelecao={()=>toggleSelecao(f.id)} onFavorito={()=>toggleFavorito(f)} />)}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {ferragensFiltradas.map(f=><ListItemFerragem key={f.id} ferragem={f} selecionada={selecionadas.has(f.id)} modoSelecao={modoSelecao} onClick={()=>abrirFerragem(f)} onToggleSelecao={()=>toggleSelecao(f.id)} onFavorito={()=>toggleFavorito(f)} />)}
              </div>
            )
          )}
        </div>
      </div>

      {/* Modais */}
      {modalVer && <ModalVisualizacao ferragem={modalVer} onClose={()=>setModalVer(null)} onEditar={(f)=>setModalForm(f)} />}
      {modalForm && <ModalFormFerragem ferragem={modalForm==="nova"?null:modalForm} onClose={()=>setModalForm(null)} onSalvar={salvarFerragem} />}
      {modalExcluir && <ModalConfirmarExclusao quantidade={selecionadas.size} onConfirmar={excluirSelecionadas} onCancelar={()=>setModalExcluir(false)} />}
    </div>
  );
}

function CardFerragem({ ferragem, selecionada, modoSelecao, onClick, onToggleSelecao, onFavorito }) {
  const cor = COR_CATEGORIA[ferragem.categoria]||"#22C55E";
  return (
    <div onClick={onClick} style={{ background:selecionada?"#1a2a1a":"#1a1a1a", border:`1.5px solid ${selecionada?"#22C55E":"#2a2a2a"}`, borderRadius:"14px", overflow:"hidden", cursor:"pointer", position:"relative", transition:"border-color 0.15s" }}>
      <div onClick={e=>{e.stopPropagation();onToggleSelecao();}} style={{ position:"absolute", top:"8px", left:"8px", zIndex:3, width:"22px", height:"22px", background:selecionada?"#22C55E":"rgba(0,0,0,0.6)", border:`2px solid ${selecionada?"#22C55E":"#666"}`, borderRadius:"6px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
        {selecionada&&<span style={{ color:"#fff", fontSize:"14px", lineHeight:1 }}>✓</span>}
      </div>
      <button onClick={e=>{e.stopPropagation();onFavorito();}} style={{ position:"absolute", top:"8px", right:"8px", zIndex:2, background:"rgba(0,0,0,0.6)", border:"none", borderRadius:"50%", width:"28px", height:"28px", color:ferragem.favorito?"#22C55E":"#666", cursor:"pointer", fontSize:"14px", display:"flex", alignItems:"center", justifyContent:"center" }}>{ferragem.favorito?"★":"☆"}</button>
      <div style={{ height:"110px", background:"#fff", overflow:"hidden" }}>
        {ferragem.imagem_url ? <img src={ferragem.imagem_url} alt={ferragem.codigo} style={{ width:"100%", height:"100%", objectFit:"contain" }} /> : <GabaritoSVG codigo={ferragem.codigo} tipo={ferragem.tipo} />}
      </div>
      <div style={{ padding:"10px 12px 12px" }}>
        <div style={{ fontSize:"18px", fontWeight:"800", color:"#fff" }}>{ferragem.codigo}</div>
        <div style={{ fontSize:"11px", color:"#666", marginTop:"2px", marginBottom:"8px" }}>Gabarito de {ferragem.tipo}</div>
        <span style={{ background:`${cor}22`, color:cor, border:`1px solid ${cor}33`, borderRadius:"20px", padding:"3px 10px", fontSize:"10px", fontWeight:"600" }}>{ferragem.categoria}</span>
      </div>
    </div>
  );
}

function ListItemFerragem({ ferragem, selecionada, modoSelecao, onClick, onToggleSelecao, onFavorito }) {
  const cor = COR_CATEGORIA[ferragem.categoria]||"#22C55E";
  return (
    <div onClick={onClick} style={{ background:selecionada?"#1a2a1a":"#1a1a1a", border:`1.5px solid ${selecionada?"#22C55E":"#2a2a2a"}`, borderRadius:"12px", padding:"12px 16px", display:"flex", alignItems:"center", gap:"12px", cursor:"pointer" }}>
      <div onClick={e=>{e.stopPropagation();onToggleSelecao();}} style={{ width:"22px", height:"22px", flexShrink:0, background:selecionada?"#22C55E":"transparent", border:`2px solid ${selecionada?"#22C55E":"#444"}`, borderRadius:"6px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
        {selecionada&&<span style={{ color:"#fff", fontSize:"14px" }}>✓</span>}
      </div>
      <div style={{ width:"52px", height:"52px", background:"#fff", borderRadius:"8px", overflow:"hidden", flexShrink:0 }}>
        {ferragem.imagem_url ? <img src={ferragem.imagem_url} alt={ferragem.codigo} style={{ width:"100%", height:"100%", objectFit:"contain" }} /> : <GabaritoSVG codigo={ferragem.codigo} tipo={ferragem.tipo} />}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <span style={{ fontSize:"16px", fontWeight:"800", color:"#fff" }}>{ferragem.codigo}</span>
          <span style={{ background:`${cor}22`, color:cor, border:`1px solid ${cor}33`, borderRadius:"20px", padding:"2px 8px", fontSize:"10px", fontWeight:"600" }}>{ferragem.categoria}</span>
        </div>
        <div style={{ fontSize:"12px", color:"#666", marginTop:"2px" }}>{ferragem.nome} · Gabarito de {ferragem.tipo}</div>
      </div>
      <button onClick={e=>{e.stopPropagation();onFavorito();}} style={{ background:"none", border:"none", color:ferragem.favorito?"#22C55E":"#444", cursor:"pointer", fontSize:"16px" }}>{ferragem.favorito?"★":"☆"}</button>
    </div>
  );
}
