// =============================================
// OTMglass — Ferragens.jsx
// Biblioteca de gabaritos de recortes e furações
// =============================================

import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const CATEGORIAS = [
  { label: "Todas", value: "todas", icon: "⊞" },
  { label: "Dobradiças", value: "Dobradiças", icon: "🔩" },
  { label: "Trincos", value: "Trincos", icon: "🔒" },
  { label: "Puxadores", value: "Puxadores", icon: "🖐" },
  { label: "Mão amiga", value: "Mão amiga", icon: "✋" },
  { label: "Fechaduras", value: "Fechaduras", icon: "🔑" },
  { label: "Suportes", value: "Suportes", icon: "📐" },
  { label: "Outros", value: "Outros", icon: "···" },
];

const ORDENACAO = [
  { label: "Código (A-Z)", value: "codigo_asc" },
  { label: "Código (Z-A)", value: "codigo_desc" },
  { label: "Mais utilizadas", value: "uso_desc" },
  { label: "Recentes", value: "recentes" },
];

const COR_CATEGORIA = {
  Dobradiças: "#22C55E",
  Trincos: "#3B82F6",
  Puxadores: "#F59E0B",
  "Mão amiga": "#EC4899",
  Fechaduras: "#8B5CF6",
  Suportes: "#06B6D4",
  Outros: "#6B7280",
};

// SVG placeholder de gabarito técnico (substituir por imagem real)
function GabaritoSVG({ codigo, tipo, categoria }) {
  const cor = COR_CATEGORIA[categoria] || "#22C55E";
  const seed = parseInt(codigo, 10) || 1000;
  const r1 = 8 + (seed % 12);
  const r2 = 14 + (seed % 8);
  const isRecorte = tipo === "recorte";

  return (
    <svg
      viewBox="0 0 120 90"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", background: "#fff" }}
    >
      {/* Grade de fundo técnica */}
      <defs>
        <pattern id={`grid-${codigo}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect width="120" height="90" fill={`url(#grid-${codigo})`} />

      {isRecorte ? (
        // Gabarito de recorte — forma L ou angular
        <>
          <rect x="20" y="55" width="80" height="20" fill="none" stroke="#111" strokeWidth="1.5" />
          <rect x="20" y="20" width="25" height="35" fill="none" stroke="#111" strokeWidth="1.5" />
          {/* Cotagens */}
          <line x1="20" y1="14" x2="100" y2="14" stroke="#666" strokeWidth="0.6" markerEnd="url(#arr)" />
          <text x="60" y="12" textAnchor="middle" fontSize="7" fill="#444">{85 + (seed % 40)}</text>
          <line x1="10" y1="20" x2="10" y2="75" stroke="#666" strokeWidth="0.6" />
          <text x="7" y="50" textAnchor="middle" fontSize="7" fill="#444" transform="rotate(-90,7,50)">{55 + (seed % 20)}</text>
          {/* Raio */}
          <path d={`M45,20 Q45,55 ${45 + r1},55`} fill="none" stroke="#111" strokeWidth="1.2" />
          <text x="52" y="38" fontSize="6" fill="#666">R{r1}</text>
        </>
      ) : (
        // Gabarito de furação — círculos com cotagens
        <>
          <circle cx="40" cy="45" r={r1} fill="none" stroke="#111" strokeWidth="1.5" />
          <circle cx="40" cy="45" r="1.5" fill="#111" />
          {r2 > 0 && (
            <>
              <circle cx="80" cy="45" r={r2} fill="none" stroke="#111" strokeWidth="1.5" />
              <circle cx="80" cy="45" r="1.5" fill="#111" />
            </>
          )}
          {/* Linhas de centro */}
          <line x1="40" y1="20" x2="40" y2="70" stroke="#666" strokeWidth="0.5" strokeDasharray="3,2" />
          <line x1="15" y1="45" x2="65" y2="45" stroke="#666" strokeWidth="0.5" strokeDasharray="3,2" />
          {r2 > 0 && (
            <>
              <line x1="80" y1="20" x2="80" y2="70" stroke="#666" strokeWidth="0.5" strokeDasharray="3,2" />
              <line x1="55" y1="45" x2="105" y2="45" stroke="#666" strokeWidth="0.5" strokeDasharray="3,2" />
            </>
          )}
          {/* Cotagens */}
          <text x="40" y="18" textAnchor="middle" fontSize="7" fill="#444">Ø{r1 * 2}</text>
          {r2 > 0 && (
            <text x="80" y="18" textAnchor="middle" fontSize="7" fill="#444">Ø{r2 * 2}</text>
          )}
          <line x1="20" y1="82" x2="60" y2="82" stroke="#666" strokeWidth="0.6" />
          <text x="40" y="88" textAnchor="middle" fontSize="6" fill="#666">{60 + (seed % 40)}</text>
        </>
      )}

      {/* Código no canto */}
      <text x="110" y="86" textAnchor="end" fontSize="6" fill="#aaa">{codigo}</text>
    </svg>
  );
}

// Modal de detalhes da ferragem
function ModalDetalhe({ ferragem, onClose, onToggleFavorito }) {
  if (!ferragem) return null;
  const cor = COR_CATEGORIA[ferragem.categoria] || "#22C55E";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "480px",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          background: "#111",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #2a2a2a",
        }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "#fff" }}>
              {ferragem.codigo}
            </div>
            <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
              {ferragem.nome}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => onToggleFavorito(ferragem)}
              style={{
                background: ferragem.favorito ? "#22C55E22" : "#ffffff11",
                border: `1px solid ${ferragem.favorito ? "#22C55E" : "#333"}`,
                borderRadius: "8px",
                padding: "8px 12px",
                color: ferragem.favorito ? "#22C55E" : "#888",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              {ferragem.favorito ? "★" : "☆"}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "#ffffff11",
                border: "1px solid #333",
                borderRadius: "8px",
                padding: "8px 14px",
                color: "#888",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Imagem gabarito */}
        <div style={{
          background: "#fff",
          margin: "20px",
          borderRadius: "12px",
          height: "220px",
          overflow: "hidden",
        }}>
          {ferragem.imagem_url ? (
            <img src={ferragem.imagem_url} alt={ferragem.codigo}
              style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <GabaritoSVG
              codigo={ferragem.codigo}
              tipo={ferragem.tipo}
              categoria={ferragem.categoria}
            />
          )}
        </div>

        {/* Info */}
        <div style={{ padding: "0 20px 20px" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <span style={{
              background: `${cor}22`,
              color: cor,
              border: `1px solid ${cor}44`,
              borderRadius: "20px",
              padding: "4px 12px",
              fontSize: "12px",
              fontWeight: "600",
            }}>
              {ferragem.categoria}
            </span>
            <span style={{
              background: "#ffffff11",
              color: "#aaa",
              border: "1px solid #333",
              borderRadius: "20px",
              padding: "4px 12px",
              fontSize: "12px",
            }}>
              Gabarito de {ferragem.tipo}
            </span>
          </div>

          {ferragem.descricao && (
            <p style={{ color: "#888", fontSize: "13px", lineHeight: "1.5", marginBottom: "16px" }}>
              {ferragem.descricao}
            </p>
          )}

          <div style={{
            background: "#111",
            borderRadius: "10px",
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#22C55E", fontSize: "18px", fontWeight: "700" }}>
                {ferragem.uso_count || 0}
              </div>
              <div style={{ color: "#666", fontSize: "11px" }}>utilizações</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#fff", fontSize: "18px", fontWeight: "700" }}>
                {ferragem.tipo === "furação" ? "🔵" : "⬜"}
              </div>
              <div style={{ color: "#666", fontSize: "11px" }}>tipo</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#fff", fontSize: "18px", fontWeight: "700" }}>8mm</div>
              <div style={{ color: "#666", fontSize: "11px" }}>espessura</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal de nova ferragem
function ModalNovaFerragem({ onClose, onSalvar }) {
  const [form, setForm] = useState({
    codigo: "", nome: "", tipo: "furação",
    categoria: "Dobradiças", descricao: "", imagem_url: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const handleSalvar = async () => {
    if (!form.codigo.trim() || !form.nome.trim()) {
      setErro("Código e nome são obrigatórios.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await onSalvar(form);
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
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "440px",
          overflow: "hidden",
        }}
      >
        <div style={{
          background: "#111", padding: "16px 20px",
          borderBottom: "1px solid #2a2a2a",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ color: "#fff", fontWeight: "700", fontSize: "16px" }}>
            Nova Ferragem
          </span>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#888",
            fontSize: "20px", cursor: "pointer",
          }}>×</button>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ color: "#888", fontSize: "12px", marginBottom: "6px", display: "block" }}>
              Código *
            </label>
            <input
              style={inputStyle}
              placeholder="ex: 1103"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            />
          </div>

          <div>
            <label style={{ color: "#888", fontSize: "12px", marginBottom: "6px", display: "block" }}>
              Nome *
            </label>
            <input
              style={inputStyle}
              placeholder="ex: Dobradiça 180° pivotante"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ color: "#888", fontSize: "12px", marginBottom: "6px", display: "block" }}>
                Tipo *
              </label>
              <select
                style={{ ...inputStyle, appearance: "none" }}
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="furação">Furação</option>
                <option value="recorte">Recorte</option>
              </select>
            </div>
            <div>
              <label style={{ color: "#888", fontSize: "12px", marginBottom: "6px", display: "block" }}>
                Categoria *
              </label>
              <select
                style={{ ...inputStyle, appearance: "none" }}
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              >
                {CATEGORIAS.filter(c => c.value !== "todas").map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ color: "#888", fontSize: "12px", marginBottom: "6px", display: "block" }}>
              URL da imagem (opcional)
            </label>
            <input
              style={inputStyle}
              placeholder="https://..."
              value={form.imagem_url}
              onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
            />
          </div>

          <div>
            <label style={{ color: "#888", fontSize: "12px", marginBottom: "6px", display: "block" }}>
              Descrição técnica
            </label>
            <textarea
              style={{ ...inputStyle, minHeight: "72px", resize: "vertical" }}
              placeholder="Detalhes do gabarito, dimensões, observações..."
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>

          {erro && (
            <div style={{
              background: "#ff444422", border: "1px solid #ff4444",
              borderRadius: "8px", padding: "10px 14px",
              color: "#ff4444", fontSize: "13px",
            }}>
              {erro}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "4px" }}>
            <button
              onClick={onClose}
              style={{
                background: "#ffffff11", border: "1px solid #333",
                borderRadius: "10px", padding: "12px",
                color: "#aaa", cursor: "pointer", fontSize: "14px",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={salvando}
              style={{
                background: salvando ? "#166534" : "#22C55E",
                border: "none", borderRadius: "10px", padding: "12px",
                color: "#fff", cursor: "pointer", fontSize: "14px",
                fontWeight: "700",
              }}
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// COMPONENTE PRINCIPAL — Ferragens
// =============================================
export default function Ferragens({ isMobile }) {
  const [ferragens, setFerragens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("todas");
  const [ordenacao, setOrdenacao] = useState("uso_desc");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [selecionada, setSelecionada] = useState(null);
  const [mostrarNova, setMostrarNova] = useState(false);
  const [mostrarFavoritos, setMostrarFavoritos] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    carregarFerragens();
  }, []);

  const carregarFerragens = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ferragens")
        .select("*")
        .eq("ativo", true)
        .order("uso_count", { ascending: false });
      if (error) throw error;
      setFerragens(data || []);
    } catch (e) {
      console.error("Erro ao carregar ferragens:", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorito = async (ferragem) => {
    const novoValor = !ferragem.favorito;
    setFerragens(prev =>
      prev.map(f => f.id === ferragem.id ? { ...f, favorito: novoValor } : f)
    );
    if (selecionada?.id === ferragem.id) {
      setSelecionada({ ...selecionada, favorito: novoValor });
    }
    await supabase
      .from("ferragens")
      .update({ favorito: novoValor })
      .eq("id", ferragem.id);
  };

  const salvarNovaFerragem = async (form) => {
    const { data, error } = await supabase
      .from("ferragens")
      .insert([{ ...form, uso_count: 0, ativo: true }])
      .select()
      .single();
    if (error) throw error;
    setFerragens(prev => [data, ...prev]);
  };

  const abrirDetalhe = async (ferragem) => {
    setSelecionada(ferragem);
    // Incrementa uso_count
    await supabase
      .from("ferragens")
      .update({ uso_count: (ferragem.uso_count || 0) + 1 })
      .eq("id", ferragem.id);
  };

  // Filtragem e ordenação
  const ferragensFiltradas = ferragens
    .filter(f => {
      const matchBusca = busca === "" ||
        f.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        f.nome.toLowerCase().includes(busca.toLowerCase()) ||
        f.categoria.toLowerCase().includes(busca.toLowerCase());
      const matchCategoria = categoriaAtiva === "todas" || f.categoria === categoriaAtiva;
      const matchFavorito = !mostrarFavoritos || f.favorito;
      return matchBusca && matchCategoria && matchFavorito;
    })
    .sort((a, b) => {
      if (ordenacao === "codigo_asc") return a.codigo.localeCompare(b.codigo);
      if (ordenacao === "codigo_desc") return b.codigo.localeCompare(a.codigo);
      if (ordenacao === "uso_desc") return (b.uso_count || 0) - (a.uso_count || 0);
      if (ordenacao === "recentes") return new Date(b.created_at) - new Date(a.created_at);
      return 0;
    });

  const maisUtilizadas = ferragens
    .filter(f => (f.uso_count || 0) > 0)
    .sort((a, b) => (b.uso_count || 0) - (a.uso_count || 0))
    .slice(0, 6);

  // =============================================
  // RENDER
  // =============================================
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0d0d",
      color: "#fff",
      fontFamily: "'Barlow', 'Barlow Condensed', sans-serif",
      paddingBottom: isMobile ? "80px" : "40px",
    }}>

      {/* Header */}
      <div style={{
        background: "#111",
        borderBottom: "1px solid #1e1e1e",
        padding: isMobile ? "16px" : "20px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>🔧</span>
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? "20px" : "24px", fontWeight: "700" }}>
                Ferragens
              </h1>
              <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
                Biblioteca de gabaritos de recortes e furações
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setMostrarFavoritos(!mostrarFavoritos)}
            style={{
              background: mostrarFavoritos ? "#22C55E22" : "#ffffff11",
              border: `1px solid ${mostrarFavoritos ? "#22C55E" : "#333"}`,
              borderRadius: "10px",
              padding: "8px 16px",
              color: mostrarFavoritos ? "#22C55E" : "#aaa",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            ★ Favoritos
          </button>
          <button
            onClick={() => setMostrarNova(true)}
            style={{
              background: "#22C55E",
              border: "none",
              borderRadius: "10px",
              padding: "8px 16px",
              color: "#fff",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "700",
            }}
          >
            + Nova
          </button>
        </div>
      </div>

      <div style={{ padding: isMobile ? "16px" : "24px 32px" }}>

        {/* Busca */}
        <div style={{ position: "relative", marginBottom: "12px" }}>
          <span style={{
            position: "absolute", left: "14px", top: "50%",
            transform: "translateY(-50%)", color: "#666", fontSize: "16px",
          }}>🔍</span>
          <input
            ref={searchRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar código ou ferragem..."
            style={{
              width: "100%",
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: "12px",
              padding: "12px 16px 12px 42px",
              color: "#fff",
              fontSize: "15px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              style={{
                position: "absolute", right: "12px", top: "50%",
                transform: "translateY(-50%)",
                background: "none", border: "none",
                color: "#666", cursor: "pointer", fontSize: "18px",
              }}
            >×</button>
          )}
        </div>
        <p style={{ color: "#555", fontSize: "12px", marginBottom: "16px" }}>
          💡 Exemplos: 1103, 1010, dobradiça, trinco, pino, fechadura...
        </p>

        {/* Filtros de categoria */}
        <div style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "8px",
          marginBottom: "28px",
          scrollbarWidth: "none",
        }}>
          {CATEGORIAS.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategoriaAtiva(cat.value)}
              style={{
                flexShrink: 0,
                background: categoriaAtiva === cat.value ? "#22C55E22" : "#1a1a1a",
                border: `1.5px solid ${categoriaAtiva === cat.value ? "#22C55E" : "#2a2a2a"}`,
                borderRadius: "20px",
                padding: "7px 16px",
                color: categoriaAtiva === cat.value ? "#22C55E" : "#888",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: categoriaAtiva === cat.value ? "700" : "400",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Seção: Mais utilizadas */}
        {categoriaAtiva === "todas" && !busca && !mostrarFavoritos && maisUtilizadas.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
            }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                🔥 Mais utilizadas
              </h2>
              <span style={{ color: "#22C55E", fontSize: "13px", cursor: "pointer" }}>
                Ver todas →
              </span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "repeat(2, 1fr)"
                : "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "12px",
            }}>
              {maisUtilizadas.map(f => (
                <CardFerragem
                  key={f.id}
                  ferragem={f}
                  onClick={() => abrirDetalhe(f)}
                  onFavorito={() => toggleFavorito(f)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Seção: Todas as ferragens */}
        <div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
            flexWrap: "wrap",
            gap: "10px",
          }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
              {mostrarFavoritos ? "⭐ Favoritas" : busca ? "Resultados" : "Todas as ferragens"}
              <span style={{
                marginLeft: "10px",
                background: "#2a2a2a",
                borderRadius: "20px",
                padding: "2px 10px",
                fontSize: "13px",
                color: "#888",
                fontWeight: "400",
              }}>
                {ferragensFiltradas.length}
              </span>
            </h2>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {/* Ordenação */}
              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value)}
                style={{
                  background: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  color: "#aaa",
                  fontSize: "12px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {ORDENACAO.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* View toggle */}
              <div style={{
                display: "flex",
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: "8px",
                overflow: "hidden",
              }}>
                {["grid", "list"].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      background: viewMode === mode ? "#22C55E22" : "none",
                      border: "none",
                      padding: "6px 10px",
                      color: viewMode === mode ? "#22C55E" : "#666",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    {mode === "grid" ? "⊞" : "☰"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#666" }}>
              Carregando ferragens...
            </div>
          )}

          {/* Vazio */}
          {!loading && ferragensFiltradas.length === 0 && (
            <div style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "#555",
            }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔧</div>
              <div style={{ fontSize: "16px", marginBottom: "6px" }}>
                Nenhuma ferragem encontrada
              </div>
              <div style={{ fontSize: "13px" }}>
                {busca ? `Nenhum resultado para "${busca}"` : "Adicione sua primeira ferragem"}
              </div>
              {!busca && (
                <button
                  onClick={() => setMostrarNova(true)}
                  style={{
                    marginTop: "16px",
                    background: "#22C55E",
                    border: "none",
                    borderRadius: "10px",
                    padding: "10px 24px",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "700",
                  }}
                >
                  + Nova Ferragem
                </button>
              )}
            </div>
          )}

          {/* Grid / List */}
          {!loading && ferragensFiltradas.length > 0 && (
            viewMode === "grid" ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(2, 1fr)"
                  : "repeat(auto-fill, minmax(170px, 1fr))",
                gap: "12px",
              }}>
                {ferragensFiltradas.map(f => (
                  <CardFerragem
                    key={f.id}
                    ferragem={f}
                    onClick={() => abrirDetalhe(f)}
                    onFavorito={() => toggleFavorito(f)}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {ferragensFiltradas.map(f => (
                  <ListItemFerragem
                    key={f.id}
                    ferragem={f}
                    onClick={() => abrirDetalhe(f)}
                    onFavorito={() => toggleFavorito(f)}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Modais */}
      {selecionada && (
        <ModalDetalhe
          ferragem={selecionada}
          onClose={() => setSelecionada(null)}
          onToggleFavorito={toggleFavorito}
        />
      )}
      {mostrarNova && (
        <ModalNovaFerragem
          onClose={() => setMostrarNova(false)}
          onSalvar={salvarNovaFerragem}
        />
      )}
    </div>
  );
}

// =============================================
// Card grid
// =============================================
function CardFerragem({ ferragem, onClick, onFavorito }) {
  const cor = COR_CATEGORIA[ferragem.categoria] || "#22C55E";
  return (
    <div
      onClick={onClick}
      style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: "14px",
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.15s, transform 0.15s",
        position: "relative",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "#22C55E44";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "#2a2a2a";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Botão favorito */}
      <button
        onClick={(e) => { e.stopPropagation(); onFavorito(); }}
        style={{
          position: "absolute", top: "8px", right: "8px", zIndex: 2,
          background: "rgba(0,0,0,0.6)",
          border: "none",
          borderRadius: "50%",
          width: "28px", height: "28px",
          color: ferragem.favorito ? "#22C55E" : "#666",
          cursor: "pointer",
          fontSize: "14px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {ferragem.favorito ? "★" : "☆"}
      </button>

      {/* Imagem gabarito */}
      <div style={{ height: "110px", background: "#fff", overflow: "hidden" }}>
        {ferragem.imagem_url ? (
          <img src={ferragem.imagem_url} alt={ferragem.codigo}
            style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <GabaritoSVG
            codigo={ferragem.codigo}
            tipo={ferragem.tipo}
            categoria={ferragem.categoria}
          />
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ fontSize: "18px", fontWeight: "800", color: "#fff", letterSpacing: "-0.5px" }}>
          {ferragem.codigo}
        </div>
        <div style={{ fontSize: "11px", color: "#666", marginTop: "2px", marginBottom: "8px" }}>
          Gabarito de {ferragem.tipo}
        </div>
        <span style={{
          background: `${cor}22`,
          color: cor,
          border: `1px solid ${cor}33`,
          borderRadius: "20px",
          padding: "3px 10px",
          fontSize: "10px",
          fontWeight: "600",
        }}>
          {ferragem.categoria}
        </span>
      </div>
    </div>
  );
}

// =============================================
// List item
// =============================================
function ListItemFerragem({ ferragem, onClick, onFavorito }) {
  const cor = COR_CATEGORIA[ferragem.categoria] || "#22C55E";
  return (
    <div
      onClick={onClick}
      style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: "12px",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#22C55E44"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a2a"}
    >
      {/* Thumbnail */}
      <div style={{
        width: "56px", height: "56px",
        background: "#fff",
        borderRadius: "8px",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        {ferragem.imagem_url ? (
          <img src={ferragem.imagem_url} alt={ferragem.codigo}
            style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <GabaritoSVG
            codigo={ferragem.codigo}
            tipo={ferragem.tipo}
            categoria={ferragem.categoria}
          />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px", fontWeight: "800", color: "#fff" }}>
            {ferragem.codigo}
          </span>
          <span style={{
            background: `${cor}22`, color: cor,
            border: `1px solid ${cor}33`,
            borderRadius: "20px", padding: "2px 8px",
            fontSize: "10px", fontWeight: "600",
          }}>
            {ferragem.categoria}
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
          {ferragem.nome} · Gabarito de {ferragem.tipo}
        </div>
      </div>

      {/* Favorito + uso */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
        <button
          onClick={(e) => { e.stopPropagation(); onFavorito(); }}
          style={{
            background: "none", border: "none",
            color: ferragem.favorito ? "#22C55E" : "#444",
            cursor: "pointer", fontSize: "16px",
          }}
        >
          {ferragem.favorito ? "★" : "☆"}
        </button>
        {ferragem.uso_count > 0 && (
          <span style={{ fontSize: "11px", color: "#555" }}>
            {ferragem.uso_count}x
          </span>
        )}
      </div>
    </div>
  );
}
