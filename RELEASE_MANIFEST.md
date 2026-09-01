# Manifesto de Release — v1.0 RC58

Este manifesto descreve o runtime efetivamente ativo da candidata operacional RC58, os contratos de compatibilidade preservados e os critérios mínimos usados para liberar o pacote portátil Windows.

## Identidade da versão

- versão exposta pelo runtime: `v1.0 RC58`;
- recuperação estrutural prioritária: `RC58-R3`;
- conciliação de escala principal: `RC58.1`;
- parser PDF principal: `RC58`;
- sanidade do resultado: `RC58.1`;
- harness Node/Playwright: `1.0.0-rc58`.

`window.ADERENCIA_VERSION` e `window.ADERENCIA_ACTIVE_MODULES`, definidos em `bootstrap.js`, são as fontes de verdade do runtime carregado no navegador.

## Runtime essencial

Arquivos base:
- `index.html`
- `styles.css`
- `dashboard.css`
- `bootstrap.js`
- `engine-v3.js` — loader compatível que carrega `engine-v4.js` e `result-integrity-rc58.js`;
- `engine-v4.js`
- `history.js`
- `history-report.js`
- `export-report.js`
- `batch.js`
- `LEIA-ME_LOCAL.txt`
- `README.md`

Módulos ativos carregados por `bootstrap.js`, na ordem operacional:
- `runtime-cache-rc47.js`
- `ocr-lazy-rc48.js`
- `portable-storage.js`
- `pdf-security-rc35.js`
- `point-semantics.js`
- `pdf-xlsx-compat-rc21.js`
- `pdf-calendar-integrity-rc29.js`
- `canonical-validation-rc35.js`
- `schedule-recovery-r3.js`
- `schedule-hardening-rc51.js`
- `schedule-monthly-bridge-rc53.js`
- `schedule-partial-cycle-rc55.js`
- `schedule-resilience-rc56.js`
- `schedule-reconciliation-rc57.js`
- `schedule-reconciliation-rc58.js`
- `schedule-preprocess-rc52.js`
- `pdf-schedule-parser-rc58.js`
- `pdf-schedule-parser-rc57.js`
- `pdf-calendar-compat-rc58.js`
- `monitor-export.js`
- `divergence-dashboard-rc44.js`
- `divergence-capture-rc20.js`
- `divergence-help-rc42.js`
- `layout-fixes-rc19.js`
- `store-management.js`
- `ui-final-rc35.js`
- `network-led-panel-rc36.js`
- `competence-integrity-rc38.js`
- `region-view-integrity-rc38.js`
- `period-controller-rc39.js`
- `period-render-coherence-rc44.js`
- `evolution-dashboard-rc39.js`
- `regional-comparison-rc51.js`
- `performance-rc42.js`
- `divergence-audit-rc42.js`
- `recurrence-dashboard-rc44.js`
- `navigation-integrity-rc44.js`
- `rc50-integrity-check.js`

Nomes históricos de arquivos RC anteriores não significam que aquela RC seja a versão do produto. Alguns módulos continuam ativos como camadas compatíveis e outros permanecem no repositório apenas para rastreabilidade.

## Contrato RC58 de recuperação e parsers

`schedule-recovery-r3.js` deve permanecer ativo antes de `pdf-schedule-parser-rc58.js`. O antigo `schedule-recovery-r2.js` permanece fora de `ADERENCIA_ACTIVE_MODULES` e não deve expor `ADERENCIA_SCHEDULE_RECOVERY_R2` no runtime normal.

O parser RC58 é carregado antes do parser RC57 e preserva o flag de compatibilidade RC57, mantendo a camada inferior inerte quando o RC58 já assumiu o contrato. A API de calendário RC58 preserva o alias legado RC57 e a política proporcional usada pelos contratos anteriores.

Esses invariantes são verificados por `rc50-integrity-check.js` e pelos testes E2E RC58.

## Regra canônica de competência

A competência é sempre o mês/ano do início do período integral do espelho de ponto.

- `11/06/2026 a 10/07/2026` = Junho/2026
- `11/07/2026 a 10/08/2026` = Julho/2026
- `11/12/2026 a 10/01/2027` = Dezembro/2026

Escalas parciais (`01–30`, `01–31` ou qualquer outra cobertura menor) não são rejeitadas quando existe interseção válida com o espelho. O cálculo usa proporcionalmente apenas os dias disponíveis na interseção e mantém a competência definida pelo início do espelho.

Datas, horários, turnos e identidades ausentes não devem ser inventados para aumentar artificialmente a cobertura.

## Leitura e conciliação RC58

A cadeia atual acrescenta recuperação estrutural para grades reais, reconciliação por roster do espelho, suporte a nomes fragmentados, continuação horizontal de páginas, layouts XLS/XLSX/XLSM heterogêneos, cobertura parcial da competência e validação de densidade estrutural.

Resultados zero são preservados quando a amostra é estruturalmente plausível. Apenas zero associado a amostra estruturalmente anormal pode ser classificado como suspeito e impedido de aparecer como resultado confiável.

## Persistência

- `localStorage` funciona como cache/contingência local;
- a base portátil `aderencia-dados.json` pode ser criada/vinculada em navegador compatível;
- Histórico, divergências, configuração administrativa e cadastro de lojas/regionais acompanham a base portátil;
- reprocessar a mesma loja/competência substitui o registro correspondente em vez de duplicá-lo;
- a limpeza de histórico também remove os detalhes relacionados quando habilitada no menu administrativo.

## Dashboards integrados

A competência global sincroniza LED da rede, Histórico, Monitoramento, Divergências, Evolução e ano do Semestral. A aba Recorrência usa o histórico nominal das divergências para calcular reincidência por loja, regional e colaborador.

Reincidente = mesmo colaborador, na mesma loja, com divergência em pelo menos duas competências distintas.

## Performance e OCR

- cache de `File.arrayBuffer()`, PDF.js e XLSX reduz releituras do mesmo arquivo;
- Tesseract não é carregado no startup;
- `ADERENCIA_ENSURE_OCR()` permanece disponível para carregamento explícito sob demanda;
- o fluxo preferencial continua sendo Excel/XLSM/XLS ou PDF com camada textual, evitando OCR quando a estrutura já é recuperável deterministicamente.

## Segurança de PDF

`pdf-security-rc35.js` força `isEvalSupported=false` e `enableScripting=false` no PDF.js para o fluxo endurecido, reduzindo a superfície de execução dinâmica ao abrir PDFs locais.

## Dependências e pacote Portable Windows

O `index.html` do código-fonte referencia PDF.js 3.11.174, SheetJS/XLSX 0.18.5 e jsPDF 2.5.1 por CDN. O workflow `Build Portable RC58` baixa essas dependências e reescreve as referências do artefato para cópias locais em `vendor/`. O carregador Tesseract.js também é incluído localmente no pacote.

O OCR continua sendo um recurso explícito sob demanda e pode requerer recursos adicionais do Tesseract (worker/core/dados de idioma) quando acionado. Portanto, a certificação de portabilidade desta RC cobre a abertura normal e os recursos essenciais empacotados; não declara OCR integralmente offline.

O build portátil também:
- remove executáveis e scripts de instalação proibidos do pacote;
- verifica arquivos essenciais e todos os módulos declarados em `ADERENCIA_ACTIVE_MODULES`;
- verifica referências locais do `index.html`;
- gera `MANIFEST_SHA256.txt` para os arquivos do pacote;
- gera SHA-256 do ZIP publicado;
- publica `Aderencia_Escala_RC58_Portable_Windows.zip` como artefato do Actions.

## Health check atual

Após carregar a aplicação, o console deve disponibilizar:

`ADERENCIA_RC50_HEALTH.ok === true`

O nome da variável é mantido por compatibilidade histórica, mas o health check atual valida o runtime RC58. Entre outros pontos, verifica lista ativa sem duplicações, recuperação R3, aposentadoria do R2, precedência R3→parser RC58, cache, OCR fora do startup, segurança PDF, competência global, navegação, conciliações, parser RC58, alias de calendário legado, política proporcional, sanidade de resultado, recorrência e cadastro de lojas.

## Testes de aceite RC58

1. Abrir `index.html` e confirmar navegação sem erro não capturado.
2. Confirmar `ADERENCIA_VERSION === 'v1.0 RC58'`.
3. Confirmar `ADERENCIA_RC50_HEALTH.ok === true`.
4. Confirmar `ADERENCIA_SCHEDULE_RECOVERY_R3.version === 'RC58-R3'` e ausência de R2 ativo.
5. Confirmar que R3 precede `pdf-schedule-parser-rc58.js` na lista ativa.
6. Excel/XLSM/XLS + espelho homologado deve reproduzir o percentual esperado.
7. PDF exportado da Escala Operacional deve ser reconhecido sem inventar datas/turnos ausentes.
8. `11/06–10/07` deve salvar em Junho; `11/07–10/08` em Julho; `11/12–10/01` em Dezembro do ano inicial.
9. Escala `01–30/31` deve calcular somente a interseção disponível, sem rejeição automática.
10. Nomes fragmentados e páginas de continuação devem ser conciliados pelo roster validado do espelho.
11. Resultado zero plausível deve ser mantido; zero estruturalmente suspeito deve ser sinalizado.
12. Salvar resultado deve atualizar os painéis vinculados à competência.
13. Divergências nominais devem fechar com os totais da engine antes da persistência.
14. Reprocessar a mesma loja/competência não deve duplicar histórico nominal.
15. Recorrência deve considerar o mesmo colaborador em duas ou mais competências.
16. Filtros de loja/regional devem refletir corretamente nos dashboards.
17. ML61 deve permanecer em `GUARDIÕES DA CHAMA`.
18. Exportações PDF e Excel devem abrir sem erro.
19. Backup/restauração e base portátil devem preservar histórico e divergências.
20. Lote deve continuar após erro individual e salvar o percentual correto de cada linha.
21. Confirmar que o Tesseract não é carregado durante a abertura normal.
22. Confirmar que o workflow RC50 End-to-End conclui em verde.
23. Confirmar que o workflow Build Portable RC58 conclui em verde e gera ZIP + SHA-256.

## Estado de release

RC58 é a candidata operacional atual desta branch de estabilização. Alterações posteriores devem manter compatibilidade com os contratos acima e só devem ser promovidas após E2E e build portátil verdes. A `main` não é alterada por este manifesto; a promoção para `main` é uma etapa separada.
