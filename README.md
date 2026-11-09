# Pauta Horizontal

Crie uma aplicação web responsiva usando React, Tailwind CSS e Lucide Icons para gerenciamento de pautas legislativas da ALESP.

Contexto e Objetivo:
O sistema será usado por secretários de comissões legislativas para listar reuniões da API pública do Legis, carregar os itens de pauta e gerar um documento estruturado para impressão em formato paisagem (landscape), seguindo fielmente o modelo do documento anexado (CCJR_-_7a_Extra_-_Pauta_-_15.07.2020.pdf).

Telas e Funcionalidades:

1. Painel Inicial (Lista de Reuniões Convocadas):
- Buscar na API pública do Legis ALESP (endpoint: https://legis-api-portal-prd.al.sp.gov.br/colegiado/reunioes?page=0&size=50&dataInicio=2026-01-01&dataFim=2027-01-31).
- Filtrar e exibir apenas as reuniões com status "Convocada".
- Layout institucional e limpo com cards ou lista exibindo: Nome da Comissão, Data e Horário, Local e um botão destacado "Gerar Pauta".
- Para evitar bloqueios de CORS ao chamar a API da ALESP diretamente do navegador, configure uma Edge Function / server function como proxy.

2. Visualização e Impressão da Pauta (baseado no PDF modelo em anexo):
- Fonte dos dados: acessar a reunião selecionada (https://legis-api-portal-prd.al.sp.gov.br/colegiado/reuniao/{idReuniao}) e obter o documento de "Pauta de colegiado" vinculado em documentosReuniao (linkArquivoPDF / linkArquivo) ou, caso necessário, combinar com o endpoint /pauta da reunião.
- Cabeçalho institucional centralizado exatamente como no modelo:
  - Linha 1: COMISSÃO DE [NOME DA COMISSÃO EM CAIXA ALTA]
  - Linha 2: [Número]ª Reunião [Tipo] [Data por extenso ou dd/mm/aaaa] às [Horário] no [Local]
  - Linha 3: Presidente: [Nome do Presidente]
- Tabela HTML clássica com bordas nítidas e as colunas:
  "Item" | "Proposição" | "Autor" | "Objeto" | "Relator" | "Voto" | "Vista"
- Formatação das células conforme o modelo anexado (Item centralizado, Proposição com tipo e número em linhas separadas, Objeto com a ementa completa, Relator, Voto e Vista para anotações).
- Bloco de Itens de Ciência / Informações Adicionais: itens da pauta que não estejam nos dados estruturados de proposições (como comunicações ou itens digitados manualmente) devem ser exibidos logo após a tabela principal, em seção/bloco próprio.

3. Edição Rápida e Persistência:
- Todas as células da tabela (td) e do bloco de ciência devem ter o atributo contenteditable="true" para que o secretário possa fazer pequenas correções ou ajustes antes da impressão.
- As alterações editadas devem ser salvas automaticamente no localStorage do navegador para cada reunião, para que o usuário não perca edições ao recarregar a página.

4. Regras de Impressão e PDF:
- Botão "Imprimir / Gerar PDF" no topo (print:hidden) e botão para voltar à lista de reuniões.
- CSS de impressão forçando página paisagem: @page { size: landscape; margin: 10mm; }.
- Fonte compacta e profissional (Arial ou sans-serif limpa, ~11px), bordas pretas finas na tabela e regras para evitar quebra inadequada de página (page-break-inside: avoid).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pauta-horizontal.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9ca8f5a5-3298-44db-8504-e91a0b40d11f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
