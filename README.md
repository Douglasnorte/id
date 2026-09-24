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
  Marcando a opção **"Incluir quem não bateu ponto"**, o CSV também traz uma
  linha por colaborador ativo que não teve a primeira batida do dia (Entrada
  ou Saída p/ almoço, conforme a aba), com "Não chegou"/"Não saiu" no lugar
  do horário — útil para auditoria. Em períodos de vários dias isso só é
  calculado até hoje (dias futuros não têm o que reportar), e quem está de
  folga (DSR) hoje não entra na lista.
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
`lms, nome, departamento, cargo, escala, descrição escala, tipo, observacoes`
(cabeçalho livre de acentos/maiúsculas). Só **nome** é obrigatório —
colaboradores sem LMS entram como "Pendente" e podem ser completados depois
pela edição, ou bipados pelo nome enquanto isso.
O app mostra uma prévia com erros (linha sem nome, LMS duplicado) antes de
confirmar a importação. Um modelo pode ser baixado direto na tela.

**Sobre as colunas de escala:** quando o arquivo tem só uma coluna chamada
`escala`, ela é tratada como a descrição por extenso (ex.: "5x2 - 01:30 as
10:48"), do jeito mais antigo. Se o arquivo trouxer `escala` **e**
`descrição escala` juntas (o formato comum em planilhas de RH, onde "Escala"
é o grupo/turno como "2 TURNO/ SD D" e "Descrição Escala" é o horário por
extenso), o app entende automaticamente que `escala` é o turno/grupo — não
precisa renomear nada. `turno`/`grupo` também são aceitos como sinônimo
explícito do turno, se preferir deixar isso claro no arquivo.

### Atualizar o cadastro de colaboradores já existentes

A importação por CSV acima só cria colaboradores novos. Para atualizar quem
já está cadastrado (ex.: recebeu uma base atualizada com LMS, departamento,
cargo ou turno novos), use **Colaboradores → Atualizar cadastro por nome**
com um CSV de colunas `nome, lms, departamento, cargo, escala, descrição
escala, tipo, status` — só **nome** é obrigatório, as outras colunas são
opcionais e podem vir combinadas como quiser (por exemplo, um arquivo só com
`nome, lms` continua funcionando como antes). A coluna `status` aceita
"ativo"/"inativo" (ou sim/não, true/false) para ativar ou desativar em
massa — útil para substituir toda uma escala por uma planilha nova: importe
os dados de quem deve ficar (LMS/departamento/turno) e, à parte, um CSV só
com `nome, status` marcando "inativo" para quem não está mais na planilha
nova. Célula em branco não mexe naquele campo; um traço (`-`) sozinho na
célula limpa o campo de propósito (útil pra corrigir um turno ou LMS que
ficou errado numa importação anterior). O nome precisa bater exatamente
(sem diferenciar maiúsculas/acentos)
com o já cadastrado; a prévia mostra, linha a linha, exatamente quais campos
vão mudar, quem não foi encontrado, nomes duplicados no cadastro, e avisa
quando o LMS já pertence a outra pessoa, antes de confirmar. Como a
atualização é feita pelo mesmo colaborador (mesmo registro interno), as
batidas já registradas continuam associadas a ele normalmente, mesmo que o
LMS, o departamento ou o status mudem — desativar não apaga nenhum histórico
nem exclui o colaborador do banco, só some da lista de pendências e do
cadastro padrão (pode reativar quando quiser).

### Excluir colaboradores de vez

**Diferente de desativar**, isso apaga o colaborador para sempre — inclusive
todo o histórico de batidas dele, mesmo as de hoje. Não tem como desfazer.
Em **Colaboradores → Excluir colaboradores por nome**, suba um CSV com uma
coluna `nome` (um colaborador por linha); a prévia mostra quem foi
encontrado antes de pedir a confirmação (é preciso digitar "EXCLUIR" para
liberar o botão). Use só quando realmente quiser perder o histórico — na
maioria dos casos (alguém saiu da empresa, uma escala nova não inclui mais
essa pessoa) desativar é a opção mais segura e reversível.

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
3. Em **Authentication → Users**, crie um (ou mais) usuário (e-mail + senha)
   para quem vai operar o ponto. Não há autocadastro pelo app — os logins são
   criados manualmente no painel.
4. No **SQL Editor**, cadastre um "usuário de login" simples para cada e-mail
   criado acima (a tela de login pede usuário, não e-mail):
   ```sql
   insert into public.login_usernames (username, email)
   values ('douglas', 'nortedouglas@gmail.com');
   ```
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

## Expedição — sorteio de vagas e rotas por onda

Na aba **Expedição**, cole as ondas e rotas do dia direto na caixa de texto
e clique em **Carregar ondas e rotas**. O formato mais completo é colar direto
de uma planilha, três colunas — vaga, onda e rota — separadas por tab, vírgula
ou `;`, uma rota por linha:

```
1	1	A1_PM1
1	2	A2_PM1
2	1	B1_PM1
2	2	B2_PM1
3	1	C1_PM1
```

Repetir a mesma vaga em ondas diferentes (como a vaga 1 acima, presente na
onda 1 e na onda 2) mantém a **mesma pessoa sorteada nessa posição o dia
todo**, só mudando a rota conforme a onda. A vaga é opcional: colando só duas
colunas — onda e rota — a numeração da vaga sai automática (por ordem
alfabética) e o sorteio passa a ser independente por onda:

```
1	A1_PM1
1	A2_PM1
1	B1_PM1
2	A1_PM1
2	A2_PM1
2	C1_PM1
```

(também aceita o formato antigo por seções, com um cabeçalho `ONDA 1` seguido
de uma rota por linha).

Escolha **Expedição AM** ou **Expedição PM** e clique em **Sortear**:
- **Expedição PM** sorteia só entre colaboradores do departamento `SVC PM`
  que já bateram o ponto (entrada) hoje.
- **Expedição AM** sorteia entre `SVC AM` **e** `SVC PM` que bateram o ponto
  hoje (o turno AM usa também quem é do PM, como pedido).

O sorteio nunca repete a mesma pessoa dentro da mesma onda (fisicamente não
dá pra fazer duas rotas ao mesmo tempo). Sem vaga explícita, a mesma pessoa
pode aparecer em ondas diferentes normalmente; com vaga explícita, cada vaga
recebe uma pessoa fixa para todas as ondas em que aparece. Se sobrar vaga ou
rota sem gente elegível suficiente, o campo de colaborador fica vazio.

Depois do sorteio, o **painel de edição** mostra uma linha por rota com vaga,
onda, rota e colaborador, tudo editável — dá pra corrigir a vaga, a rota,
trocar quem foi sorteado ou digitar um nome que nem estava na lista de
elegíveis (aparecem sugestões de quem bateu ponto hoje, mas o campo aceita
texto livre). Um aviso
aparece se ficar alguma rota sem colaborador, ou se a mesma pessoa acabar
repetida na mesma onda por causa de uma edição manual. Logo abaixo, a
**prévia da tabela final** mostra como vai sair no PDF (uma linha por pessoa,
uma coluna por onda) e atualiza em tempo real conforme você edita. Dá pra
clicar em **Sortear de novo** quantas vezes quiser antes de confirmar, e
**Baixar PDF** gera a tabela final (Vaga / Colaborador / Onda 1 / Onda 2 /
...), no mesmo formato do modelo usado pela operação.

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
    expedicao/       -> aba "Expedição" (sorteio de vagas/rotas por onda)
  hooks/              -> acesso a dados (Supabase) e regra de próxima batida
  lib/                -> cliente Supabase, extração do código do crachá, datas
supabase/schema.sql   -> schema do banco (tabelas + RLS)
```
