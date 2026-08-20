# Arquivo profissional de 2026

Esta pasta guarda observações de partidas profissionais, separadas das regras de análise. Nenhum arquivo daqui pode alterar recomendações automaticamente.

Um mapa só é contado como BP completo quando possui lado azul/vermelho, quatro bans e cinco picks para cada equipe, vencedor e vínculo com a série. `finalObjective.endingMethod` permanece `unknown` quando a fonte confirma o vencedor, mas não informa se o encerramento ocorreu por destruição do cristal ou rendição.

Os slots de picks da Liquipedia não são tratados como ordem cronológica sem uma segunda verificação. Por isso, `pickOrder` é registrado como `source-slot-order` e `banOrderVerified` começa falso. O VOD fica preservado para auditoria futura.

O catálogo `sources.json` identifica as regiões que devem ser cobertas. Antes de qualquer uso estatístico em BP, a região precisa atingir ao menos 100 mapas com BP completo e passar por revisão de nomes, patch e ordem.

`coverage.json` mostra a cobertura atual por região. A política `record-only` impede que estes dados alterem a análise manual. O modo separado `職業賽 BP` pode consultá-los de forma isolada; regiões abaixo do mínimo recebem redução por insuficiência de amostra.

Exemplo de coleta:

```powershell
python scripts/collect_liquipedia_2026.py --page "Honor of Kings World Cup/2026/Playoffs" --tournament-id "kwc-2026" --tournament "Honor of Kings World Cup 2026" --stage "Playoffs" --region "international" --output "src/data/matches/2026/kwc-2026-playoffs.json"
python scripts/validate_professional_history_2026.py --write-summary
```
