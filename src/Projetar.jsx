// =============================================
// OTMglass — Projetar.jsx v1.0
// Mini CAD para vidraçaria
// =============================================
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";

// ── Paleta ──
const C = {
  bg: "#0d0d0d", card: "#1a1a1a", border: "#2a2a2a",
  green: "#22C55E", greenDim: "#22C55E22",
  blue: "#60A5FA", blueDim: "#93C5FD55", blueBg: "#1e3a5f",
  text: "#fff", muted: "#888", dim: "#444",
  red: "#EF4444", amber: "#F59E0B",
};

// ── Tipos de projeto ──
const TIPOS = [
  { id: "janela", label: "Janela", desc: "Janelas 2 ou 4 folhas, maxim-ar, basculante e outras.", icon: "🪟" },
  { id: "box", label: "Box de Banheiro", desc: "Projetos de boxes com portas, fixos e recortes para ferragens.", icon: "🚿" },
  { id: "porta", label: "Porta", desc: "Portas de abrir, pivotantes, de correr e com ferragens.", icon: "🚪" },
  { id: "peca-fixa", label: "Peça Fixa", desc: "Peças fixas, painéis e vidros sem ferragens.", icon: "🧱" },
  { id: "kit-pia", label: "Kit Pia / Cozinha", desc: "Projetos de vidros para pias, tampos e cozinhas.", icon: "🍽️" },
  { id: "livre", label: "Projeto Livre", desc: "Crie um projeto do zero com medidas personalizadas.", icon: "✏️" },
];

const SUBTIPOS = {
  janela: [
    { id: "janela-4-folhas", label: "Janela 4 folhas", desc: "2 fixas + 2 móveis", pecas: ["Fixa 1","Móvel 1","Móvel 2","Fixa 2"], moveis: [1,2] },
    { id: "janela-2-folhas", label: "Janela 2 folhas", desc: "1 fixa + 1 móvel", pecas: ["Fixa 1","Móvel 1"], moveis: [1] },
    { id: "maxim-ar", label: "Maxim-ar", desc: "Abertura para fora", pecas: ["Maxim-ar"], moveis: [] },
    { id: "basculante", label: "Basculante", desc: "Abertura para dentro", pecas: ["Basculante"], moveis: [] },
    { id: "janela-fixa", label: "Janela Fixa", desc: "Sem abertura", pecas: ["Fixa"], moveis: [] },
    { id: "pivotante", label: "Pivotante", desc: "Abertura pivotante", pecas: ["Pivotante"], moveis: [0] },
  ],
  box: [
    { id: "box-padrao", label: "Box Padrão", desc: "Fixo + porta", pecas: ["Fixo","Porta"], moveis: [1] },
    { id: "box-l", label: "Box em L", desc: "Dois lados", pecas: ["Fixo 1","Fixo 2","Porta"], moveis: [2] },
    { id: "box-frontal", label: "Box Frontal", desc: "Apenas porta", pecas: ["Porta"], moveis: [0] },
    { id: "box-teto", label: "Box até Teto", desc: "Fixo + porta até teto", pecas: ["Fixo","Porta"], moveis: [1] },
    { id: "box-elegance", label: "Box Elegance", desc: "Sem perfil metálico", pecas: ["Fixo","Porta"], moveis: [1] },
  ],
  porta: [
    { id: "porta-pivotante", label: "Porta Pivotante", desc: "Abertura central pivô", pecas: ["Porta principal"], moveis: [0] },
    { id: "porta-correr", label: "Porta de Correr", desc: "Deslizante horizontal", pecas: ["Porta 1","Porta 2"], moveis: [0,1] },
    { id: "porta-simples", label: "Porta Simples", desc: "Abre em dobradiça", pecas: ["Porta"], moveis: [0] },
    { id: "porta-bandeira", label: "Porta com Bandeira", desc: "Porta + fixo superior", pecas: ["Porta","Bandeira"], moveis: [0] },
  ],
  "peca-fixa": [
    { id: "peca-simples", label: "Peça Fixa Simples", desc: "Uma peça única", pecas: ["Peça"], moveis: [] },
  ],
  "kit-pia": [
    { id: "cuba-retangular", label: "Cuba Retangular", desc: "Recorte retangular", pecas: ["Tampo"], moveis: [] },
    { id: "cuba-redonda", label: "Cuba Redonda", desc: "Recorte circular", pecas: ["Tampo"], moveis: [] },
  ],
  livre: [
    { id: "livre", label: "Projeto Livre", desc: "Canvas em branco", pecas: [], moveis: [] },
  ],
};

const TIPOS_FURO = [
  { id: "roldana", label: "Roldana", diametro: 16 },
  { id: "bate-fecha", label: "Bate-fecha", diametro: 16 },
  { id: "puxador", label: "Puxador", diametro: 12 },
  { id: "fechadura", label: "Fechadura", diametro: 16 },
  { id: "dobradica", label: "Dobradiça", diametro: 14 },
  { id: "livre", label: "Furo Livre", diametro: 10 },
];

const REFS = ["superior-esquerdo","superior-direito","inferior-esquerdo","inferior-direito"];
const REF_LABEL = {
  "superior-esquerdo": "Superior esquerdo",
  "superior-direito": "Superior direito",
  "inferior-esquerdo": "Inferior esquerdo",
  "inferior-direito": "Inferior direito",
};

// ── Utilitários ──
const uid = () => Math.random().toString(36).slice(2, 8);

// Calcula posição absoluta do furo dentro da peça (origem: canto superior esquerdo)
function calcPosAbsoluta(ref, distX, distY, pecaW, pecaH) {
  let px, py;
  if (ref === "superior-esquerdo")  { px = distY; py = distX; }
  if (ref === "superior-direito")   { px = pecaW - distY; py = distX; }
  if (ref === "inferior-esquerdo")  { px = distY; py = pecaH - distX; }
  if (ref === "inferior-direito")   { px = pecaW - distY; py = pecaH - distX; }
  return { px, py };
}

// ══════════════════════════════════════════
// CANVAS SVG — Pré-projeto
// ══════════════════════════════════════════
function CanvasProjetar({ pecas, vaoW, vaoH, pecaSelecionada, onSelectPeca, furos = [], mostrarFuros = true }) {
  const containerRef = useRef(null);
  const [dim, setDim] = useState({ w: 600, h: 400 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  useEffect(() => {
    const obs = new ResizeObserver(e => {
      const el = e[0].contentRect;
      setDim({ w: el.width || 600, h: el.height || 400 });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Escala proporcional
  const PADDING = 60;
  const scaleX = (dim.w - PADDING * 2) / vaoW;
  const scaleY = (dim.h - PADDING * 2) / vaoH;
  const scale = Math.min(scaleX, scaleY) * zoom;
  const offX = (dim.w - vaoW * scale) / 2 + pan.x;
  const offY = (dim.h - vaoH * scale) / 2 + pan.y;

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.min(4, Math.max(0.3, z - e.deltaY * 0.001)));
  };

  const handleMouseDown = (e) => {
    if (e.button === 1 || e.altKey) {
      setDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };
  const handleMouseMove = (e) => {
    if (dragging && dragStart) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };
  const handleMouseUp = () => { setDragging(false); setDragStart(null); };

  // Cores por tipo de peça
  const corPeca = (tipo) => {
    if (tipo === "Móvel" || tipo === "movel") return "#93C5FD";
    if (tipo === "Porta") return "#93C5FD";
    return "#BFDBFE";
  };

  return (
    <div ref={containerRef} style={{ flex: 1, position: "relative", background: "#1a1a1a", borderRadius: "12px", overflow: "hidden", cursor: dragging ? "grabbing" : "default" }}
      onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <svg width="100%" height="100%" style={{ display: "block" }}>
        {/* Fundo grid */}
        <defs>
          <pattern id="grid-p" width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse">
            <path d={`M ${20*zoom} 0 L 0 0 0 ${20*zoom}`} fill="none" stroke="#333" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-p)" />

        {/* Vão (moldura) */}
        <rect x={offX - 8} y={offY - 8}
          width={vaoW * scale + 16} height={vaoH * scale + 16}
          fill="none" stroke="#555" strokeWidth="2" rx="2" />

        {/* Fundo do vão */}
        <rect x={offX} y={offY} width={vaoW * scale} height={vaoH * scale} fill="#111" />

        {/* Peças */}
        {pecas.map((p, i) => {
          const px = offX + p.posX * scale;
          const py = offY + p.posY * scale;
          const pw = p.largura * scale;
          const ph = p.altura * scale;
          const sel = pecaSelecionada?.id === p.id;
          const isMov = p.tipo === "Móvel" || p.tipo === "movel" || p.tipo === "Porta";

          return (
            <g key={p.id} onClick={() => onSelectPeca && onSelectPeca(p)} style={{ cursor: "pointer" }}>
              {/* Vidro */}
              <rect x={px} y={py} width={pw} height={ph}
                fill={corPeca(p.tipo)}
                opacity={0.85}
                stroke={sel ? C.green : "#1e3a8a"}
                strokeWidth={sel ? 3 : 1.5} />

              {/* Sombra de vidro */}
              <rect x={px + 3} y={py + 3} width={pw - 6} height={ph - 6}
                fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

              {/* Nome */}
              <text x={px + pw / 2} y={py + ph / 2 - 10}
                textAnchor="middle" fontSize={Math.max(9, Math.min(14, pw / 8))}
                fill={C.green} fontWeight="700" fontFamily="'Barlow Condensed', sans-serif">
                {p.nome}
              </text>

              {/* Medidas */}
              <text x={px + pw / 2} y={py + ph / 2 + 8}
                textAnchor="middle" fontSize={Math.max(7, Math.min(12, pw / 10))}
                fill={C.green} opacity={0.9} fontFamily="'Barlow', sans-serif">
                {p.largura} × {p.altura}
              </text>

              {/* Seta móvel */}
              {isMov && pw > 40 && ph > 30 && (
                <text x={px + pw / 2} y={py + ph / 2 + 24}
                  textAnchor="middle" fontSize={Math.max(8, Math.min(16, pw / 8))}
                  fill="#1e3a8a" opacity={0.7}>←→</text>
              )}
            </g>
          );
        })}

        {/* Furos */}
        {mostrarFuros && furos.map(f => {
          const peca = pecas.find(p => p.id === f.pecaId);
          if (!peca) return null;
          const px = offX + peca.posX * scale;
          const py = offY + peca.posY * scale;
          const { px: fx, py: fy } = calcPosAbsoluta(f.referencia, f.distanciaX, f.distanciaY, peca.largura, peca.altura);
          const cx = px + fx * scale;
          const cy = py + fy * scale;
          const r = Math.max(3, (f.diametro / 2) * scale * 0.5);
          return (
            <g key={f.id}>
              <circle cx={cx} cy={cy} r={r} fill="#111" stroke="#fff" strokeWidth="1.5" />
              <circle cx={cx} cy={cy} r="2" fill="#fff" />
              {/* Cotas */}
              {scale > 0.15 && (
                <>
                  <line x1={cx} y1={cy} x2={cx} y2={py} stroke="#22C55E88" strokeWidth="0.5" strokeDasharray="3,2" />
                  <line x1={cx} y1={cy} x2={px} y2={cy} stroke="#22C55E88" strokeWidth="0.5" strokeDasharray="3,2" />
                  <text x={cx + 4} y={cy - 4} fontSize="7" fill={C.green}>Ø{f.diametro}</text>
                </>
              )}
            </g>
          );
        })}

        {/* Cotas do vão */}
        {/* Cota inferior */}
        <line x1={offX} y1={offY + vaoH * scale + 24} x2={offX + vaoW * scale} y2={offY + vaoH * scale + 24} stroke="#666" strokeWidth="1" markerEnd="url(#arr)" />
        <text x={offX + vaoW * scale / 2} y={offY + vaoH * scale + 38} textAnchor="middle" fontSize="11" fill="#888" fontFamily="'Barlow', sans-serif">{vaoW} mm</text>
        {/* Cota lateral */}
        <line x1={offX - 24} y1={offY} x2={offX - 24} y2={offY + vaoH * scale} stroke="#666" strokeWidth="1" />
        <text x={offX - 36} y={offY + vaoH * scale / 2} textAnchor="middle" fontSize="11" fill="#888" transform={`rotate(-90,${offX - 36},${offY + vaoH * scale / 2})`} fontFamily="'Barlow', sans-serif">{vaoH} mm</text>
      </svg>

      {/* Controles zoom */}
      <div style={{ position: "absolute", bottom: "12px", right: "12px", display: "flex", gap: "6px", alignItems: "center" }}>
        <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} style={{ background: "#2a2a2a", border: "1px solid #333", borderRadius: "6px", color: "#fff", width: "28px", height: "28px", cursor: "pointer", fontSize: "16px" }}>−</button>
        <span style={{ color: "#888", fontSize: "12px", minWidth: "40px", textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(4, z + 0.2))} style={{ background: "#2a2a2a", border: "1px solid #333", borderRadius: "6px", color: "#fff", width: "28px", height: "28px", cursor: "pointer", fontSize: "16px" }}>+</button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={{ background: "#2a2a2a", border: "1px solid #333", borderRadius: "6px", color: "#888", padding: "0 8px", height: "28px", cursor: "pointer", fontSize: "11px" }}>Reset</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// TELA 1 — Seleção de tipo
// ══════════════════════════════════════════
function TelaInicial({ onSelect }) {
  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "800", color: C.text, margin: "0 0 8px" }}>O que você deseja projetar?</h1>
        <p style={{ color: C.muted, fontSize: "14px" }}>Escolha o tipo de projeto para começar</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
        {TIPOS.map(t => (
          <button key={t.id} onClick={() => onSelect(t.id)} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px",
            padding: "28px 24px", textAlign: "left", cursor: "pointer",
            transition: "border-color 0.15s, transform 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
            <div style={{ fontSize: "36px", marginBottom: "14px" }}>{t.icon}</div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: C.text, marginBottom: "6px" }}>{t.label}</div>
            <div style={{ fontSize: "13px", color: C.muted, lineHeight: "1.4" }}>{t.desc}</div>
            <div style={{ marginTop: "16px", color: C.green, fontSize: "14px" }}>→</div>
          </button>
        ))}
      </div>
      <div style={{ marginTop: "24px", background: "#1a2a1a", borderRadius: "10px", padding: "12px 16px", color: "#888", fontSize: "12px", textAlign: "center" }}>
        ℹ️ Após criar seu projeto, você poderá adicionar furos, recortes e ferragens. Seus projetos ficarão salvos para uso futuro.
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// TELA 2 — Seleção de subtipo
// ══════════════════════════════════════════
function TelaSubtipo({ tipo, onSelect, onVoltar }) {
  const tipoInfo = TIPOS.find(t => t.id === tipo);
  const subs = SUBTIPOS[tipo] || [];
  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <button onClick={onVoltar} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "14px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "6px" }}>← Voltar</button>
      <h2 style={{ fontSize: "22px", fontWeight: "800", color: C.text, marginBottom: "8px" }}>{tipoInfo?.label}</h2>
      <p style={{ color: C.muted, fontSize: "14px", marginBottom: "28px" }}>Escolha o modelo</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
        {subs.map(s => (
          <button key={s.id} onClick={() => onSelect(s)} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: "14px",
            padding: "20px", textAlign: "left", cursor: "pointer", transition: "border-color 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.green}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            <div style={{ fontSize: "16px", fontWeight: "700", color: C.text, marginBottom: "4px" }}>{s.label}</div>
            <div style={{ fontSize: "12px", color: C.muted }}>{s.desc}</div>
            <div style={{ marginTop: "12px", color: C.green, fontSize: "13px" }}>→</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// TELA 3 — Medidas + Configuração das peças
// ══════════════════════════════════════════
function TelaConfiguracaoPecas({ subtipo, tipo, onContinuar, onVoltar }) {
  const [vaoW, setVaoW] = useState(2000);
  const [vaoH, setVaoH] = useState(1200);
  const [pecas, setPecas] = useState(() =>
    subtipo.pecas.map((nome, i) => ({
      id: uid(), nome,
      largura: 500, altura: 1200,
      tipo: subtipo.moveis?.includes(i) ? "Móvel" : "Fixa",
      posX: 0, posY: 0,
    }))
  );

  // Distribui peças automaticamente lado a lado
  const pecasComPos = (() => {
    let currentX = 0;
    return pecas.map(p => {
      const result = { ...p, posX: currentX, posY: 0 };
      currentX += p.largura;
      return result;
    });
  })();

  const updatePeca = (id, field, val) => {
    setPecas(prev => prev.map(p => p.id === id ? { ...p, [field]: parseInt(val) || 0 } : p));
  };

  const inputStyle = {
    background: "#111", border: "1px solid #333", borderRadius: "8px",
    padding: "8px 12px", color: "#fff", fontSize: "14px",
    outline: "none", width: "80px", boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", height: "100%", gap: "0", flexDirection: "column" }}>
      {/* Steps */}
      <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e", padding: "12px 24px" }}>
        <StepBar step={2} total={5} labels={["Tipo","Medidas","Pré-projeto","Ferragens e Furos","Finalizar"]} />
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Painel esquerdo */}
        <div style={{ width: "320px", flexShrink: 0, overflowY: "auto", padding: "20px", borderRight: "1px solid #1e1e1e", background: "#111" }}>
          <button onClick={onVoltar} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "13px", marginBottom: "16px" }}>← Voltar</button>
          <h3 style={{ color: C.text, fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>Medidas do vão</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
            <div>
              <label style={{ color: C.muted, fontSize: "11px", marginBottom: "6px", display: "block" }}>Largura Y (mm)</label>
              <input type="number" style={{ ...inputStyle, width: "100%" }} value={vaoW} onChange={e => setVaoW(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label style={{ color: C.muted, fontSize: "11px", marginBottom: "6px", display: "block" }}>Altura X (mm)</label>
              <input type="number" style={{ ...inputStyle, width: "100%" }} value={vaoH} onChange={e => setVaoH(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <h3 style={{ color: C.text, fontSize: "16px", fontWeight: "700", marginBottom: "12px" }}>Configuração das folhas</h3>

          {pecas.map((p, i) => (
            <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "12px", marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ color: C.text, fontWeight: "700", fontSize: "13px" }}>{p.nome}</span>
                <span style={{
                  background: p.tipo === "Móvel" ? "#1e3a5f" : "#1a2a1a",
                  color: p.tipo === "Móvel" ? C.blue : C.green,
                  borderRadius: "20px", padding: "2px 10px", fontSize: "10px", fontWeight: "600",
                }}>{p.tipo}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ color: C.muted, fontSize: "10px", marginBottom: "4px", display: "block" }}>Largura Y</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <input type="number" style={{ ...inputStyle, width: "70px" }} value={p.largura} onChange={e => updatePeca(p.id, "largura", e.target.value)} />
                    {p.tipo === "Móvel" && <span style={{ color: C.green, fontSize: "9px" }}>+50mm</span>}
                  </div>
                </div>
                <div>
                  <label style={{ color: C.muted, fontSize: "10px", marginBottom: "4px", display: "block" }}>Altura X</label>
                  <input type="number" style={{ ...inputStyle, width: "70px" }} value={p.altura} onChange={e => updatePeca(p.id, "altura", e.target.value)} />
                </div>
              </div>
              {p.tipo === "Móvel" && (
                <div style={{ marginTop: "6px", fontSize: "10px", color: C.green, opacity: 0.7 }}>
                  ℹ️ Folhas móveis normalmente possuem transpasse (+50mm sugerido)
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Canvas pré-visualização */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ color: C.text, fontSize: "16px", fontWeight: "700", margin: 0 }}>Pré-visualização</h3>
              <p style={{ color: C.muted, fontSize: "12px", margin: "2px 0 0" }}>Vista externa</p>
            </div>
            <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "14px", height: "14px", background: "#BFDBFE", border: "1px solid #1e3a8a", borderRadius: "2px", display: "inline-block" }} />
                <span style={{ color: C.muted }}>Peças fixas</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "14px", height: "14px", background: "#93C5FD", border: "1px solid #1e3a8a", borderRadius: "2px", display: "inline-block" }} />
                <span style={{ color: C.muted }}>Peças móveis (+50mm)</span>
              </span>
            </div>
          </div>
          <CanvasProjetar pecas={pecasComPos} vaoW={vaoW} vaoH={vaoH} onSelectPeca={null} furos={[]} />
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ background: "#111", borderTop: "1px solid #1e1e1e", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onVoltar} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "10px 20px", color: C.muted, cursor: "pointer", fontSize: "14px" }}>← Voltar</button>
        <button onClick={() => onContinuar({ vaoW, vaoH, pecas: pecasComPos })} style={{ background: C.green, border: "none", borderRadius: "10px", padding: "12px 28px", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "700" }}>Gerar pré-projeto →</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// TELA 4 — Pré-projeto + Ferragens e Furos
// ══════════════════════════════════════════
function TelaPreProjeto({ projeto, onContinuar, onVoltar }) {
  const [pecas, setPecas] = useState(projeto.pecas);
  const [furos, setFuros] = useState([]);
  const [pecaSel, setPecaSel] = useState(null);
  const [step, setStep] = useState("pre-projeto"); // "pre-projeto" | "ferragens"
  const [modalFuro, setModalFuro] = useState(false);
  const [novoFuro, setNovoFuro] = useState({ tipo: "roldana", diametro: 16, referencia: "superior-esquerdo", distanciaX: 20, distanciaY: 50 });

  const adicionarFuro = () => {
    if (!pecaSel) return;
    setFuros(prev => [...prev, { id: uid(), pecaId: pecaSel.id, ...novoFuro }]);
    setModalFuro(false);
  };

  const removerFuro = (id) => setFuros(prev => prev.filter(f => f.id !== id));

  const furosDaPeca = furos.filter(f => f.pecaId === pecaSel?.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Steps */}
      <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e", padding: "12px 24px" }}>
        <StepBar step={step === "pre-projeto" ? 3 : 4} total={5} labels={["Tipo","Medidas","Pré-projeto","Ferragens e Furos","Finalizar"]} />
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Canvas */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, color: C.text, fontSize: "16px", fontWeight: "700" }}>
                {step === "pre-projeto" ? "3. Pré-projeto" : "4. Ferragens e Furos"}
              </h3>
              <p style={{ margin: "2px 0 0", color: C.muted, fontSize: "12px" }}>
                {step === "pre-projeto" ? "Visualização inicial do projeto" : "Clique em uma peça para adicionar furos"}
              </p>
            </div>
            {pecaSel && (
              <span style={{ background: "#1e3a5f", color: C.blue, borderRadius: "8px", padding: "4px 12px", fontSize: "12px", fontWeight: "600" }}>
                {pecaSel.nome} selecionada
              </span>
            )}
          </div>
          <CanvasProjetar
            pecas={pecas} vaoW={projeto.vaoW} vaoH={projeto.vaoH}
            pecaSelecionada={pecaSel} onSelectPeca={p => setPecaSel(p)}
            furos={furos} mostrarFuros={step === "ferragens"}
          />
        </div>

        {/* Painel lateral */}
        <div style={{ width: "280px", flexShrink: 0, background: "#111", borderLeft: "1px solid #1e1e1e", overflowY: "auto", padding: "16px" }}>
          {step === "pre-projeto" ? (
            <>
              <h4 style={{ color: C.text, fontSize: "14px", fontWeight: "700", marginBottom: "16px" }}>Peças do projeto</h4>
              {pecas.map(p => (
                <div key={p.id} onClick={() => setPecaSel(p)} style={{
                  background: pecaSel?.id === p.id ? "#1a2a1a" : C.card,
                  border: `1px solid ${pecaSel?.id === p.id ? C.green : C.border}`,
                  borderRadius: "10px", padding: "12px", marginBottom: "8px", cursor: "pointer",
                }}>
                  <div style={{ fontWeight: "700", color: C.text, fontSize: "13px" }}>{p.nome}</div>
                  <div style={{ color: C.muted, fontSize: "11px", marginTop: "2px" }}>{p.largura} × {p.altura} mm</div>
                  <div style={{ color: p.tipo === "Móvel" ? C.blue : C.green, fontSize: "10px", marginTop: "4px" }}>
                    {p.tipo === "Móvel" ? "● Móvel" : "● Fixa"}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <h4 style={{ color: C.text, fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>
                {pecaSel ? `${pecaSel.nome}` : "Selecione uma peça"}
              </h4>

              {pecaSel && (
                <>
                  <div style={{ background: C.card, borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
                    <div style={{ color: C.muted, fontSize: "11px", marginBottom: "8px" }}>Informações da peça</div>
                    <div style={{ color: C.text, fontSize: "12px" }}>Medidas: {pecaSel.largura} × {pecaSel.altura} mm</div>
                    <div style={{ color: C.text, fontSize: "12px", marginTop: "4px" }}>Tipo: {pecaSel.tipo}</div>
                  </div>

                  <h5 style={{ color: C.text, fontSize: "13px", fontWeight: "700", marginBottom: "10px" }}>
                    Furos ({furosDaPeca.length})
                  </h5>

                  {furosDaPeca.map((f, i) => (
                    <div key={f.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "10px", marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ color: C.text, fontSize: "12px", fontWeight: "600" }}>{i + 1}. {TIPOS_FURO.find(t => t.id === f.tipo)?.label}</div>
                        <div style={{ color: C.muted, fontSize: "10px" }}>Ø{f.diametro} · {REF_LABEL[f.referencia]?.split(" ")[0]} · Y:{f.distanciaY} X:{f.distanciaX}</div>
                      </div>
                      <button onClick={() => removerFuro(f.id)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: "16px" }}>🗑</button>
                    </div>
                  ))}

                  <button onClick={() => setModalFuro(true)} style={{ width: "100%", background: C.greenDim, border: `1px solid ${C.green}`, borderRadius: "10px", padding: "10px", color: C.green, cursor: "pointer", fontSize: "13px", fontWeight: "700", marginTop: "8px" }}>
                    + Adicionar furo
                  </button>
                </>
              )}

              {!pecaSel && (
                <div style={{ textAlign: "center", padding: "40px 16px", color: C.muted, fontSize: "13px" }}>
                  Clique em uma peça no canvas para selecionar
                </div>
              )}

              {/* Lista de peças */}
              <div style={{ marginTop: "16px", borderTop: "1px solid #1e1e1e", paddingTop: "12px" }}>
                <div style={{ color: C.muted, fontSize: "11px", marginBottom: "8px" }}>Selecionar peça:</div>
                {pecas.map(p => (
                  <button key={p.id} onClick={() => setPecaSel(p)} style={{ width: "100%", background: pecaSel?.id === p.id ? "#1a2a1a" : "none", border: `1px solid ${pecaSel?.id === p.id ? C.green : "transparent"}`, borderRadius: "8px", padding: "6px 10px", color: pecaSel?.id === p.id ? C.green : C.muted, cursor: "pointer", fontSize: "12px", textAlign: "left", marginBottom: "4px" }}>
                    {p.nome}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal furo */}
      {modalFuro && (
        <div onClick={() => setModalFuro(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "16px", width: "100%", maxWidth: "400px", overflow: "hidden" }}>
            <div style={{ background: "#111", padding: "16px 20px", borderBottom: "1px solid #2a2a2a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: C.text, fontWeight: "700" }}>Adicionar furo — {pecaSel?.nome}</span>
              <button onClick={() => setModalFuro(false)} style={{ background: "none", border: "none", color: C.muted, fontSize: "20px", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ color: C.muted, fontSize: "12px", marginBottom: "6px", display: "block" }}>Tipo de ferragem</label>
                <select style={{ width: "100%", background: "#111", border: "1px solid #333", borderRadius: "8px", padding: "10px 12px", color: C.text, fontSize: "14px", outline: "none" }}
                  value={novoFuro.tipo} onChange={e => { const t = TIPOS_FURO.find(x => x.id === e.target.value); setNovoFuro(f => ({ ...f, tipo: e.target.value, diametro: t?.diametro || f.diametro })); }}>
                  {TIPOS_FURO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: C.muted, fontSize: "12px", marginBottom: "8px", display: "block" }}>Ponto de referência</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  {REFS.map(r => (
                    <button key={r} onClick={() => setNovoFuro(f => ({ ...f, referencia: r }))} style={{ background: novoFuro.referencia === r ? C.greenDim : "#111", border: `1.5px solid ${novoFuro.referencia === r ? C.green : "#333"}`, borderRadius: "8px", padding: "8px", color: novoFuro.referencia === r ? C.green : C.muted, cursor: "pointer", fontSize: "11px", fontWeight: novoFuro.referencia === r ? "700" : "400" }}>
                      {REF_LABEL[r]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ color: C.muted, fontSize: "11px", marginBottom: "4px", display: "block" }}>Dist. X (mm)</label>
                  <input type="number" style={{ width: "100%", background: "#111", border: "1px solid #333", borderRadius: "8px", padding: "8px", color: C.text, fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                    value={novoFuro.distanciaX} onChange={e => setNovoFuro(f => ({ ...f, distanciaX: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label style={{ color: C.muted, fontSize: "11px", marginBottom: "4px", display: "block" }}>Dist. Y (mm)</label>
                  <input type="number" style={{ width: "100%", background: "#111", border: "1px solid #333", borderRadius: "8px", padding: "8px", color: C.text, fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                    value={novoFuro.distanciaY} onChange={e => setNovoFuro(f => ({ ...f, distanciaY: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label style={{ color: C.muted, fontSize: "11px", marginBottom: "4px", display: "block" }}>Ø (mm)</label>
                  <input type="number" style={{ width: "100%", background: "#111", border: "1px solid #333", borderRadius: "8px", padding: "8px", color: C.text, fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                    value={novoFuro.diametro} onChange={e => setNovoFuro(f => ({ ...f, diametro: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <button onClick={adicionarFuro} style={{ background: C.green, border: "none", borderRadius: "10px", padding: "12px", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "700" }}>
                ✓ Confirmar furo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé */}
      <div style={{ background: "#111", borderTop: "1px solid #1e1e1e", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => step === "ferragens" ? setStep("pre-projeto") : onVoltar()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "10px 20px", color: C.muted, cursor: "pointer", fontSize: "14px" }}>← Voltar</button>
        {step === "pre-projeto" ? (
          <button onClick={() => setStep("ferragens")} style={{ background: C.green, border: "none", borderRadius: "10px", padding: "12px 28px", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "700" }}>
            Avançar: Ferragens e Furos →
          </button>
        ) : (
          <button onClick={() => onContinuar({ pecas, furos })} style={{ background: C.green, border: "none", borderRadius: "10px", padding: "12px 28px", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "700" }}>
            Avançar: Finalizar →
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// TELA 5 — Finalizar e Salvar
// ══════════════════════════════════════════
function TelaFinalizar({ projeto, onSalvar, onVoltar, isMobile }) {
  const [nome, setNome] = useState(`Projeto ${new Date().toLocaleDateString("pt-BR")}`);
  const [cliente, setCliente] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const totalArea = projeto.pecas.reduce((s, p) => s + (p.largura * p.altura / 1e6), 0).toFixed(2);

  const handleSalvar = async () => {
    if (!nome.trim()) { setErro("Informe o nome do projeto."); return; }
    setSalvando(true);
    setErro("");
    try {
      const { data: proj, error: e1 } = await supabase.from("projetar_projetos").insert([{
        nome, tipo: projeto.tipo, subtipo: projeto.subtipo?.id,
        vao_largura: projeto.vaoW, vao_altura: projeto.vaoH,
        projeto_json: JSON.stringify({ pecas: projeto.pecas, furos: projeto.furos }),
        cliente, status: "salvo",
      }]).select().single();
      if (e1) throw e1;
      onSalvar(proj);
    } catch (e) {
      setErro(e.message || "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const inputStyle = { width: "100%", background: "#111", border: "1px solid #333", borderRadius: "8px", padding: "10px 14px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e", padding: "12px 24px" }}>
        <StepBar step={5} total={5} labels={["Tipo","Medidas","Pré-projeto","Ferragens e Furos","Finalizar"]} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
        <h3 style={{ color: C.text, fontSize: "20px", fontWeight: "800", marginBottom: "8px" }}>Finalizar projeto</h3>
        <p style={{ color: C.muted, fontSize: "13px", marginBottom: "24px" }}>Revise e salve seu projeto</p>

        {/* Resumo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "Tipo", value: projeto.tipo },
            { label: "Subtipo", value: projeto.subtipo?.label || "-" },
            { label: "Vão", value: `${projeto.vaoW} × ${projeto.vaoH} mm` },
            { label: "Peças", value: `${projeto.pecas.length}` },
            { label: "Furos", value: `${projeto.furos.length}` },
            { label: "Área total", value: `${totalArea} m²` },
          ].map(item => (
            <div key={item.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "12px" }}>
              <div style={{ color: C.muted, fontSize: "11px" }}>{item.label}</div>
              <div style={{ color: C.text, fontSize: "16px", fontWeight: "700", marginTop: "4px" }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Canvas mini */}
        <div style={{ height: "220px", marginBottom: "24px", borderRadius: "12px", overflow: "hidden" }}>
          <CanvasProjetar pecas={projeto.pecas} vaoW={projeto.vaoW} vaoH={projeto.vaoH} furos={projeto.furos} mostrarFuros={true} onSelectPeca={null} />
        </div>

        {/* Formulário */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ color: C.muted, fontSize: "12px", marginBottom: "6px", display: "block" }}>Nome do projeto *</label>
            <input style={inputStyle} value={nome} onChange={e => setNome(e.target.value)} placeholder="ex: Janela cozinha" />
          </div>
          <div>
            <label style={{ color: C.muted, fontSize: "12px", marginBottom: "6px", display: "block" }}>Cliente (opcional)</label>
            <input style={inputStyle} value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nome do cliente" />
          </div>
        </div>

        {erro && (
          <div style={{ marginTop: "12px", background: "#ff444422", border: "1px solid #ff4444", borderRadius: "8px", padding: "10px 14px", color: C.red, fontSize: "13px" }}>{erro}</div>
        )}
      </div>

      <div style={{ background: "#111", borderTop: "1px solid #1e1e1e", padding: "14px 24px", display: "flex", justifyContent: "space-between" }}>
        <button onClick={onVoltar} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "10px 20px", color: C.muted, cursor: "pointer", fontSize: "14px" }}>← Voltar</button>
        <button onClick={handleSalvar} disabled={salvando} style={{ background: salvando ? "#166534" : C.green, border: "none", borderRadius: "10px", padding: "12px 28px", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "700" }}>
          {salvando ? "Salvando..." : "💾 Salvar projeto"}
        </button>
      </div>
    </div>
  );
}

// ── Barra de steps ──
function StepBar({ step, total, labels }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", overflowX: "auto", paddingBottom: "2px" }}>
      {labels.map((l, i) => {
        const num = i + 1;
        const done = num < step;
        const active = num === step;
        return (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
              <div style={{
                width: "22px", height: "22px", borderRadius: "50%",
                background: done ? C.green : active ? C.green : "#2a2a2a",
                border: `2px solid ${done || active ? C.green : "#444"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px", fontWeight: "700",
                color: done || active ? "#fff" : "#666",
              }}>{done ? "✓" : num}</div>
              <span style={{ fontSize: "9px", color: active ? C.green : "#555", whiteSpace: "nowrap" }}>{l}</span>
            </div>
            {i < total - 1 && <div style={{ width: "20px", height: "1px", background: done ? C.green : "#333", marginBottom: "12px" }} />}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════
// GALERIA DE PROJETOS
// ══════════════════════════════════════════
function GaleriaProjetos({ onNovoProjeto, onEditar }) {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarProjetos();
  }, []);

  const carregarProjetos = async () => {
    setLoading(true);
    const { data } = await supabase.from("projetar_projetos").select("*").order("criado_em", { ascending: false });
    setProjetos(data || []);
    setLoading(false);
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir este projeto?")) return;
    await supabase.from("projetar_projetos").delete().eq("id", id);
    setProjetos(prev => prev.filter(p => p.id !== id));
  };

  const filtrados = projetos.filter(p =>
    !busca || p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.cliente || "").toLowerCase().includes(busca.toLowerCase()) ||
    (p.tipo || "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ color: C.text, fontSize: "22px", fontWeight: "800", margin: 0 }}>🗂 Galeria de Projetos</h2>
          <p style={{ color: C.muted, fontSize: "13px", marginTop: "4px" }}>{projetos.length} projeto{projetos.length !== 1 ? "s" : ""} salvos</p>
        </div>
        <button onClick={onNovoProjeto} style={{ background: C.green, border: "none", borderRadius: "10px", padding: "10px 20px", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "700" }}>
          + Novo Projeto
        </button>
      </div>

      {/* Busca */}
      <div style={{ position: "relative", marginBottom: "20px" }}>
        <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: C.muted }}>🔍</span>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisar cliente, medida ou projeto..."
          style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "12px 16px 12px 42px", color: C.text, fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
      </div>

      {loading && <div style={{ textAlign: "center", padding: "60px", color: C.muted }}>Carregando projetos...</div>}

      {!loading && filtrados.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px", color: C.muted }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📐</div>
          <div style={{ fontSize: "16px", marginBottom: "6px" }}>{busca ? "Nenhum resultado" : "Nenhum projeto salvo"}</div>
          {!busca && <button onClick={onNovoProjeto} style={{ marginTop: "12px", background: C.green, border: "none", borderRadius: "10px", padding: "10px 24px", color: "#fff", cursor: "pointer", fontWeight: "700" }}>Criar primeiro projeto</button>}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
        {filtrados.map(p => (
          <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "14px", overflow: "hidden" }}>
            {/* Canvas mini preview */}
            {p.projeto_json && (() => {
              try {
                const proj = JSON.parse(p.projeto_json);
                return (
                  <div style={{ height: "140px", background: "#1a1a1a" }}>
                    <CanvasProjetar pecas={proj.pecas || []} vaoW={p.vao_largura} vaoH={p.vao_altura} furos={proj.furos || []} mostrarFuros={false} onSelectPeca={null} />
                  </div>
                );
              } catch { return <div style={{ height: "140px", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>📐</div>; }
            })()}

            <div style={{ padding: "14px" }}>
              <div style={{ fontWeight: "700", color: C.text, fontSize: "15px", marginBottom: "4px" }}>{p.nome}</div>
              <div style={{ color: C.muted, fontSize: "12px", marginBottom: "8px" }}>
                {p.tipo} · {p.vao_largura} × {p.vao_altura} mm
                {p.cliente && ` · ${p.cliente}`}
              </div>
              <div style={{ color: C.dim, fontSize: "11px", marginBottom: "12px" }}>
                {new Date(p.criado_em).toLocaleDateString("pt-BR")}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => onEditar(p)} style={{ flex: 1, background: C.greenDim, border: `1px solid ${C.green}`, borderRadius: "8px", padding: "8px", color: C.green, cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
                  ✏️ Editar
                </button>
                <button onClick={() => excluir(p.id)} style={{ background: "#EF444422", border: "1px solid #EF4444", borderRadius: "8px", padding: "8px 12px", color: C.red, cursor: "pointer", fontSize: "12px" }}>
                  🗑
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════
export default function Projetar({ isMobile }) {
  const [view, setView] = useState("menu"); // "menu" | "projetar" | "galeria"
  const [flowStep, setFlowStep] = useState("tipo"); // "tipo" | "subtipo" | "config" | "canvas" | "finalizar"
  const [tipo, setTipo] = useState(null);
  const [subtipo, setSubtipo] = useState(null);
  const [projeto, setProjeto] = useState(null);
  const [concluido, setConcluido] = useState(false);

  const resetFlow = () => {
    setFlowStep("tipo");
    setTipo(null);
    setSubtipo(null);
    setProjeto(null);
    setConcluido(false);
  };

  if (view === "galeria") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Barlow', sans-serif", paddingBottom: isMobile ? "80px" : "40px" }}>
        <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e", padding: isMobile ? "14px 16px" : "16px 32px", display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => setView("menu")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "14px" }}>←</button>
          <span style={{ fontSize: "18px", fontWeight: "700" }}>🗂 Galeria de Projetos</span>
        </div>
        <GaleriaProjetos onNovoProjeto={() => { setView("projetar"); resetFlow(); }} onEditar={() => {}} />
      </div>
    );
  }

  if (view === "projetar") {
    if (concluido) {
      return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Barlow', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px", padding: "24px" }}>
          <div style={{ fontSize: "60px" }}>✅</div>
          <h2 style={{ color: C.text, fontSize: "24px", fontWeight: "800", margin: 0 }}>Projeto salvo com sucesso!</h2>
          <p style={{ color: C.muted, fontSize: "14px" }}>Seu projeto está disponível na galeria.</p>
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => { setView("galeria"); resetFlow(); }} style={{ background: C.greenDim, border: `1px solid ${C.green}`, borderRadius: "10px", padding: "12px 24px", color: C.green, cursor: "pointer", fontWeight: "700" }}>Ver galeria</button>
            <button onClick={() => { setView("projetar"); resetFlow(); }} style={{ background: C.green, border: "none", borderRadius: "10px", padding: "12px 24px", color: "#fff", cursor: "pointer", fontWeight: "700" }}>+ Novo projeto</button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ height: "100vh", background: C.bg, color: C.text, fontFamily: "'Barlow', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e", padding: "12px 24px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <button onClick={() => setView("menu")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "14px" }}>←</button>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: C.muted, fontSize: "13px" }}>
            <span style={{ color: C.green, fontWeight: "700" }}>Projetar</span>
            {tipo && <><span>›</span><span>{TIPOS.find(t => t.id === tipo)?.label}</span></>}
            {subtipo && <><span>›</span><span>{subtipo.label}</span></>}
          </div>
        </div>

        {/* Conteúdo do fluxo */}
        <div style={{ flex: 1, overflowY: flowStep === "config" || flowStep === "canvas" ? "hidden" : "auto" }}>
          {flowStep === "tipo" && (
            <TelaInicial onSelect={t => { setTipo(t); if (SUBTIPOS[t]?.length === 1) { setSubtipo(SUBTIPOS[t][0]); setFlowStep("config"); } else setFlowStep("subtipo"); }} />
          )}
          {flowStep === "subtipo" && (
            <TelaSubtipo tipo={tipo} onSelect={s => { setSubtipo(s); setFlowStep("config"); }} onVoltar={() => setFlowStep("tipo")} />
          )}
          {flowStep === "config" && (
            <TelaConfiguracaoPecas tipo={tipo} subtipo={subtipo}
              onContinuar={({ vaoW, vaoH, pecas }) => { setProjeto(prev => ({ ...prev, tipo, subtipo, vaoW, vaoH, pecas })); setFlowStep("canvas"); }}
              onVoltar={() => setFlowStep("subtipo")} />
          )}
          {flowStep === "canvas" && (
            <TelaPreProjeto projeto={projeto}
              onContinuar={({ pecas, furos }) => { setProjeto(prev => ({ ...prev, pecas, furos })); setFlowStep("finalizar"); }}
              onVoltar={() => setFlowStep("config")} />
          )}
          {flowStep === "finalizar" && (
            <TelaFinalizar projeto={projeto} isMobile={isMobile}
              onSalvar={() => setConcluido(true)}
              onVoltar={() => setFlowStep("canvas")} />
          )}
        </div>
      </div>
    );
  }

  // Menu principal
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Barlow', sans-serif", paddingBottom: isMobile ? "80px" : "40px" }}>
      <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e", padding: isMobile ? "14px 16px" : "18px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>📐</span>
          <div>
            <div style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: "700" }}>Projetar</div>
            <div style={{ fontSize: "11px", color: "#666" }}>Crie seus projetos de forma rápida e precisa</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "32px 24px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <button onClick={() => { setView("projetar"); resetFlow(); }} style={{
            background: C.card, border: `2px solid ${C.green}`, borderRadius: "16px",
            padding: "28px 24px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "20px",
          }}>
            <span style={{ fontSize: "40px" }}>📐</span>
            <div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: C.text }}>Projetar</div>
              <div style={{ fontSize: "13px", color: C.muted, marginTop: "4px" }}>Criar um novo projeto de vidro</div>
            </div>
            <span style={{ marginLeft: "auto", color: C.green, fontSize: "20px" }}>→</span>
          </button>
          <button onClick={() => setView("galeria")} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px",
            padding: "28px 24px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "20px",
            transition: "border-color 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.green}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            <span style={{ fontSize: "40px" }}>🗂</span>
            <div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: C.text }}>Galeria de Projetos</div>
              <div style={{ fontSize: "13px", color: C.muted, marginTop: "4px" }}>Ver, editar e reutilizar projetos salvos</div>
            </div>
            <span style={{ marginLeft: "auto", color: C.muted, fontSize: "20px" }}>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
