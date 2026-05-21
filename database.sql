-- ════════════════════════════════════════════════════════════
-- UTMglass — Schema do banco de dados
-- Cole e execute no Supabase → SQL Editor → New Query
-- ════════════════════════════════════════════════════════════

-- ── Chapas em estoque ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chapas (
  id          TEXT PRIMARY KEY,
  cor         TEXT NOT NULL CHECK (cor IN ('incolor', 'verde', 'fume')),
  largura     INTEGER NOT NULL CHECK (largura > 0),
  altura      INTEGER NOT NULL CHECK (altura > 0),
  quantidade  INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  criado_em   BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- ── Retalhos gerados pelas otimizações ───────────────────────
CREATE TABLE IF NOT EXISTS retalhos (
  id          TEXT PRIMARY KEY,
  cor         TEXT NOT NULL CHECK (cor IN ('incolor', 'verde', 'fume')),
  largura     INTEGER NOT NULL,
  altura      INTEGER NOT NULL,
  area        DECIMAL(8, 2),
  origem      TEXT,
  status      TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'descartado', 'usado')),
  criado_em   BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- ── Histórico de otimizações ─────────────────────────────────
CREATE TABLE IF NOT EXISTS otimizacoes (
  id              TEXT PRIMARY KEY,
  cor             TEXT NOT NULL,
  chapas_usadas   INTEGER,
  aproveitamento  DECIMAL(5, 1),
  desperdicio     DECIMAL(5, 1),
  pecas_totais    INTEGER,
  area_total      DECIMAL(8, 2),
  criado_em       BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- ── Segurança: acesso público (uso interno, sem login) ───────
-- Se quiser adicionar autenticação depois, altere as policies
ALTER TABLE chapas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE retalhos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE otimizacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total chapas"      ON chapas      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total retalhos"    ON retalhos    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total otimizacoes" ON otimizacoes FOR ALL USING (true) WITH CHECK (true);

-- ── Dados iniciais (chapas de exemplo) ───────────────────────
INSERT INTO chapas (id, cor, largura, altura, quantidade) VALUES
  ('c-seed-1', 'incolor', 2200, 3210, 8),
  ('c-seed-2', 'incolor', 2000, 3000, 4),
  ('c-seed-3', 'verde',   2200, 3210, 6),
  ('c-seed-4', 'fume',    2200, 3210, 3)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- ✅ Execute o SQL acima e o banco está pronto!
-- ════════════════════════════════════════════════════════════
