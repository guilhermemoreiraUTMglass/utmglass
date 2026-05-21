# UTMglass — Guia de Deploy

## ✅ Pré-requisitos
- Node.js instalado → https://nodejs.org (clique em "LTS")
- Conta gratuita no Supabase → https://supabase.com
- Conta gratuita no Vercel → https://vercel.com
- Conta gratuita no GitHub → https://github.com

---

## PASSO 1 — Banco de dados (Supabase)

1. Acesse supabase.com → crie conta → clique em **New Project**
2. Dê o nome `utmglass`, escolha senha forte, região: **South America (São Paulo)**
3. Aguarde criar (≈1 min)
4. Vá em **SQL Editor** → clique em **New Query**
5. Cole o conteúdo do arquivo `database.sql` e clique **Run**
6. Vá em **Settings → API** e anote:
   - **Project URL** (ex: `https://abcxyz.supabase.co`)
   - **anon public key** (string longa começando com `eyJ...`)

---

## PASSO 2 — Configurar o projeto

No terminal do seu notebook, na pasta onde descompactou o projeto:

```bash
# Instalar dependências
npm install

# Criar o arquivo de variáveis de ambiente
cp .env.example .env
```

Abra o arquivo `.env` no bloco de notas e preencha:
```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## PASSO 3 — Testar localmente

```bash
npm run dev
```

Abra o navegador em `http://localhost:5173` — o sistema deve carregar com os dados do Supabase.

---

## PASSO 4 — Publicar no GitHub

```bash
# Inicializar git (só na primeira vez)
git init
git add .
git commit -m "UTMglass v1.0"

# Criar repositório no GitHub e conectar
# (crie em github.com → New Repository → nome: utmglass → Create)
git remote add origin https://github.com/SEU-USUARIO/utmglass.git
git branch -M main
git push -u origin main
```

---

## PASSO 5 — Deploy no Vercel

1. Acesse vercel.com → **Add New Project**
2. Conecte sua conta GitHub → selecione o repositório `utmglass`
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = sua URL do Supabase
   - `VITE_SUPABASE_KEY` = sua chave do Supabase
4. Clique em **Deploy**
5. Pronto! Você receberá uma URL como `utmglass.vercel.app`

---

## PASSO 6 — Domínio próprio (opcional)

1. Compre `utmglass.com.br` em registro.br (~R$40/ano)
2. No Vercel: **Settings → Domains → Add Domain** → `utmglass.com.br`
3. O Vercel vai te dar registros DNS para configurar no registro.br
4. Após configurar DNS, aguarde até 24h para propagar

---

## 🚀 Resultado final

- **URL pública**: `https://utmglass.vercel.app` (ou seu domínio)
- **Funciona em**: PC, celular, tablet — qualquer navegador
- **Banco de dados**: PostgreSQL no Supabase (dados reais e persistentes)
- **Deploy automático**: qualquer `git push` atualiza o site automaticamente

---

## Estrutura do projeto

```
utmglass/
├── src/
│   ├── App.jsx         → app principal + algoritmo MaxRects
│   ├── supabase.js     → conexão com banco de dados
│   └── main.jsx        → ponto de entrada React
├── index.html           → HTML base
├── database.sql         → schema do banco (rodar no Supabase)
├── .env.example         → template de variáveis de ambiente
├── .env                 → suas credenciais (NÃO enviar pro GitHub)
├── package.json         → dependências do projeto
└── vite.config.js       → configuração do build
```
