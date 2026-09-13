# Ponto de Colaboradores

Aplicativo de controle de ponto (entrada, saída para almoço, volta do almoço e
saída) com leitura do LMS por leitor 2D, câmera do celular (modo contínuo,
para bipar vários colaboradores em sequência), digitação manual do número ou
busca pelo nome do colaborador.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Banco de dados / backend:** Supabase (Postgres + Auth + Realtime)
- **Hospedagem:** GitHub Pages, via GitHub Actions

## Como funciona

- Cada colaborador é identificado pelo número do LMS, lido no formato
  `{12345}`. O app extrai o número de dentro das chaves para localizar o
  colaborador — também aceita a digitação do número puro ou do nome (com
  sugestões), útil para quem ainda não tem o LMS cadastrado.
- A cada leitura, o sistema detecta automaticamente qual é a próxima batida
  esperada para aquele colaborador no dia: **Entrada → Saída p/ almoço →
  Volta do almoço → Saída**. Também é possível forçar manualmente o tipo de
  batida na tela "Registrar ponto".
- Três abas: **Entrada/Saída** e **Controle de almoço** são independentes uma
  da outra (cada uma só acompanha o próprio par de eventos), e **Colaboradores**
  é o cadastro/gestão de quem está ativo ou não.
- Colaboradores marcados como **inativos** somem da lista de pendências/status
  do dia e não conseguem mais bater ponto (a leitura retorna aviso de
  "colaborador inativo").
- Na aba **Controle de almoço**, cada colaborador que está almoçando mostra um
  cronômetro ao vivo desde a saída; passando de 1h o tempo fica em vermelho
  com aviso de estouro, e um contador "Acima de 1h" aparece no topo.
- A lista de pendências pode ser filtrada por departamento (ex.: SVC AM vs.
  SVC PM) quando há mais de um cadastrado, e cada aba de ponto tem um botão
  **Exportar CSV** para baixar as batidas de um período (padrão: hoje).
- Batida errada tem conserto: cada linha da lista de pendências tem um botão
  **Desfazer** que apaga só a última batida daquele colaborador na categoria
  (Entrada/Saída ou Almoço) — clique de novo pra desfazer a anterior, se
  precisar. Também dá pra **Limpar registros de hoje** de uma aba inteira
  (com confirmação), caso precise zerar o dia inteiro.
- A tabela `employee_schedules` já está criada no banco para o uso futuro de
  escalas estruturadas por colaborador — ainda sem tela própria, só a
  estrutura no banco. Enquanto isso, a escala de cada um pode ser guardada
  como texto livre (`shift_group`/`shift_label`) no próprio cadastro, inclusive
  via importação por CSV.

### Importar colaboradores por CSV

Na aba **Colaboradores → Importar CSV**, suba um arquivo com as colunas
`lms, nome, departamento, cargo, turno, escala, observacoes` (cabeçalho
livre de acentos/maiúsculas). Só **nome** é obrigatório — colaboradores sem
LMS entram como "Pendente" e podem ser completados depois pela edição, ou
bipados pelo nome enquanto isso.
O app mostra uma prévia com erros (linha sem nome, LMS duplicado) antes de
confirmar a importação. Um modelo pode ser baixado direto na tela.

### Atualizar o LMS de colaboradores já cadastrados

A importação por CSV acima só cria colaboradores novos. Para preencher o LMS
de quem já está cadastrado (ex.: recebeu a lista oficial de LMS depois), use
**Colaboradores → Atualizar LMS por nome** com um CSV de colunas `nome, lms`.
O nome precisa bater exatamente (sem diferenciar maiúsculas/acentos) com o já
cadastrado; a prévia mostra quem não foi encontrado, nomes duplicados no
cadastro, e avisa quando o LMS já pertence a outra pessoa, antes de confirmar.

### Importar calendário de escalas (DSR) e pendências por escala

Em times com escala revezada (ex.: 4 grupos A/B/C/D, cada um de folga em dias
diferentes), a lista de pendências da aba **Entrada/Saída** (e **Almoço**)
não deve cobrar quem está de folga hoje. Em **Colaboradores → Importar
calendário (DSR)**, suba um CSV com as colunas `data, departamento, escala,
dsr` (uma linha por combinação de data + departamento + escala; `dsr` aceita
sim/nao, true/false ou 1/0). Isso cruza com o `departamento` e `shift_group`
de cada colaborador — quem está de folga aparece como **"Folga (DSR)"** em
vez de "Não chegou". Reimportar uma mesma data/departamento/escala substitui
o valor anterior, então dá para importar mês a mês.

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
   Isso cria as tabelas `employees`, `time_events`, `employee_schedules` e as
   políticas de RLS (só usuários autenticados leem/gravam dados). O arquivo é
   seguro para rodar de novo em um banco já existente (ele aplica só o que
   ainda faltar, como colunas novas).
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
  número do LMS ou do nome do colaborador — digitando o nome, aparecem
  sugestões para clicar e registrar direto.
- **Câmera do celular:** ativa a câmera do aparelho e fica escaneando de
  forma contínua — dá para bipar várias pessoas em sequência sem precisar
  reiniciar a leitura a cada uma. Um cooldown de alguns segundos por código
  evita registrar o mesmo LMS duas vezes por engano.

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
