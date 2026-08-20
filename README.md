# BP 分析

Aplicação estática e offline-first para análise explicável de drafts. Esta primeira versão implementa o Draft Livre, validação de dados, análise de composição, recomendações, salvamento local e a fundação para Ban & Pick, Global Ban e histórico.

O modo `禁選模式` conduz automaticamente a sequência competitiva de 18 ações: quatro bans iniciais, primeira rodada de picks, quatro bans adicionais e rodada final de picks. Cada lado termina com quatro bans e cinco escolhas. Os slots não vinculam heróis a posições; o catálogo pode ser filtrado por rota sem exibir a rota nos cartões. As recomendações continuam agrupadas em listas verdes, amarelas e vermelhas.

Partidas profissionais fornecidas pelo usuário ficam preservadas em `src/data/matches`, separadas das regras gerais. Fatos observados (ordem, lado, picks, bans e vencedor) não são misturados com interpretações estratégicas. Padrões com amostra pequena entram no motor somente como recomendações amarelas de baixo peso, com torneio, tamanho da amostra e incerteza explícitos.

## Desenvolvimento

```bash
npm install
npm run dev
```

Validação completa:

```bash
npm test
npm run build
```

O `base: './'` do Vite mantém o build compatível com GitHub Pages. O service worker armazena a aplicação e os dados essenciais após o primeiro acesso.

## Publicação no GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica automaticamente a pasta `dist` no GitHub Pages a cada push na branch `main`. A publicação usa exclusivamente GitHub Actions e GitHub Pages, sem servidor ou serviço externo.

## Dados

O catálogo atual reúne 80 heróis. O registro canônico de exemplo permanece em `src/data/heroes`, enquanto as notas gerais fornecidas pelo usuário ficam versionadas em `src/data/knowledge`, incluindo os adendos aprovados em 19 e 20 de agosto de 2026.

Ao adicionar registros, mantenha patch, confiança e fontes, e valide-os com os schemas em `src/schemas`. Conhecimento teórico, histórico e regras ficam separados.

Os retratos ficam em `public/heroes/<hero-id>.webp` e usam os avatares exibidos na lista “Todos os heróis” do HoK Camp. O manifesto `public/heroes/sources.json` registra a página e o asset oficial usados para cada campeão. Para atualizar as imagens de forma reproduzível, execute `scripts/fetch-hero-images.py` com Python e Pillow disponíveis.

A análise manual geral fica em `src/data/knowledge`. Termos qualitativos usam a conversão explícita inicial `bom = 7`, `melhor = 9` e `possível = 6`, sempre com confiança `0.5` e patch `unknown` até que evidências mais precisas sejam fornecidas. Flowborn Tank e Flowborn Marksman são entidades separadas.

Na interface de recomendações, verde indica uma escolha boa, amarelo indica uma escolha razoável e vermelho indica que o candidato está sendo counterado. Uma recomendação verde tem prioridade sobre a amarela; sinais vermelhos podem aparecer junto dos demais para expor o risco. Quando há vários motivos da mesma categoria, a tag mostra a quantidade e abre a lista completa.

## Regra obrigatória de idioma do frontend

- Todo conteúdo visível ao usuário final deve ser escrito em mandarim tradicional (`zh-Hant`).
- Isso inclui navegação, botões, títulos, mensagens, avisos, erros, acessibilidade, metadados, manifest PWA, nomes exibidos de entidades e textos produzidos pelas engines.
- Português pode ser usado na documentação interna e na comunicação de desenvolvimento, mas nunca deve aparecer na interface publicada.
- IDs, chaves técnicas e dados canônicos podem permanecer em inglês para preservar estabilidade; a interface deve convertê-los por uma camada de apresentação/localização.
- Antes de cada entrega, deve ser verificado que nenhum texto em português ou inglês não intencional aparece no frontend.

## Política obrigatória de Git

- Toda alteração futura deve terminar em um commit no repositório Git local.
- Cada commit deve ter título objetivo e corpo descrevendo as alterações relevantes e as validações executadas.
- Alterações distintas devem ser separadas em commits quando isso melhorar a rastreabilidade.
- O estado final entregue ao usuário não deve conter modificações pendentes não documentadas, salvo arquivos locais deliberadamente ignorados.
