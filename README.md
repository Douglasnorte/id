# Ponto de Colaboradores

Aplicativo de controle de ponto (entrada, saída para almoço, volta do almoço e
saída) com leitura de crachá por leitor 2D, câmera do celular (modo contínuo,
para bipar vários colaboradores em sequência) ou digitação manual.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Banco de dados / backend:** Supabase (Postgres + Auth + Realtime)
- **Hospedagem:** GitHub Pages, via GitHub Actions

## Como funciona

- Cada colaborador é identificado pelo número do crachá (LMS), lido no
  formato `{12345}`. O app extrai o número de dentro das chaves para localizar
  o colaborador — também aceita a digitação do número puro.
- A cada leitura, o sistema detecta automaticamente qual é a próxima batida
  esperada para aquele colaborador no dia: **Entrada → Saída p/ almoço →
  Volta do almoço → Saída**. Também é possível forçar manualmente o tipo de
  batida na tela "Registrar ponto".
- A aba **Registrar ponto** é separada da aba **Colaboradores**, como pedido:
  a primeira é a tela usada no dia a dia para bipar/registrar; a segunda é o
  cadastro e a gestão de quem está ativo ou não.
- Colaboradores marcados como **inativos** somem da lista de pendências/status
  do dia e não conseguem mais bater ponto (a leitura retorna aviso de
  "colaborador inativo").
- A tabela `employee_schedules` já está criada no banco para o uso futuro de
  escalas por colaborador — ainda sem tela própria, só a estrutura no banco.

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
   Isso cria as tabelas `employees`, `time_events`, `employee_schedules` e as
   políticas de RLS (só usuários autenticados leem/gravam dados).
3. Em **Authentication → Users**, crie um (ou mais) usuário para quem vai
   operar o ponto (RH, recepção, etc.). Não há autocadastro pelo app — os
   logins são criados manualmente no painel.
4. Em **Project Settings → API**, copie a **Project URL** e a **anon public
   key**: são elas que o app usa para falar com o Supabase.

## 2. Rodar localmente

```bash
npm install
cp .env.example .env   # preencha com a URL e a anon key do seu projeto
npm run dev
```

Abra `http://localhost:5173`. A leitura por câmera do celular exige HTTPS —
em `localhost` o navegador libera a câmera normalmente; em produção (GitHub
Pages) já é servido em HTTPS.

## 3. Publicar no GitHub Pages

1. Em **Settings → Pages** do repositório, defina a origem como **GitHub
   Actions**.
2. Em **Settings → Secrets and variables → Actions**, crie os secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Faça o merge/push para a branch `main`. O workflow
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builda o
   app e publica automaticamente em
   `https://<seu-usuario>.github.io/id/`.

## Modos de leitura

- **Leitor 2D / Manual:** um único campo de texto sempre focado. Leitores de
  código de barras/QR 2D funcionam como teclado (digitam o código e enviam
  "Enter"), então basta bipar. O mesmo campo aceita digitação manual do
  número do crachá.
- **Câmera do celular:** ativa a câmera do aparelho e fica escaneando de
  forma contínua — dá para bipar várias pessoas em sequência sem precisar
  reiniciar a leitura a cada uma. Um cooldown de alguns segundos por código
  evita registrar o mesmo crachá duas vezes por engano.

## Estrutura do projeto

```
src/
  components/
    ponto/          -> aba "Registrar ponto" (leitor, câmera, pendências)
    employees/       -> aba "Colaboradores" (cadastro e ativação)
  hooks/              -> acesso a dados (Supabase) e regra de próxima batida
  lib/                -> cliente Supabase, extração do código do crachá, datas
supabase/schema.sql   -> schema do banco (tabelas + RLS)
```
