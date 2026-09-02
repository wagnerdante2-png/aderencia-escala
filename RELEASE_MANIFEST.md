# Manifesto de Release — v1.0 RC57

Este manifesto registra o runtime ativo, os gates de segurança e os critérios de aceite da candidata operacional RC57 para uso local.

## Runtime essencial

Arquivos base:

- `index.html`
- `styles.css`
- `dashboard.css`
- `bootstrap.js`
- `engine-v3.js`
- `history.js`
- `history-report.js`
- `export-report.js`
- `batch.js`
- `LEIA-ME_LOCAL.txt`
- `README.md`

`window.ADERENCIA_ACTIVE_MODULES` é a fonte de verdade para módulos carregados pelo bootstrap.

## Módulos ativos na RC57

- `runtime-cache-rc47.js`
- `ocr-lazy-rc48.js`
- `portable-storage.js`
- `pdf-security-rc35.js`
- `point-semantics.js`
- `pdf-xlsx-compat-rc21.js`
- `pdf-calendar-integrity-rc29.js`
- `canonical-validation-rc35.js`
- `schedule-hardening-rc51.js`
- `schedule-monthly-bridge-rc53.js`
- `schedule-provenance-guard-rc55.js`
- `schedule-preprocess-rc52.js`
- `pdf-store-header-guard-rc57.js`
- `pdf-schedule-parser-rc57.js`
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

Os arquivos históricos de parsers anteriores podem permanecer no repositório, mas não fazem parte da lista ativa da RC57.

## Regra canônica de competência

A competência é sempre o mês/ano do **início do período integral do espelho de ponto**.

- `11/06/2026 a 10/07/2026` = Junho/2026
- `11/07/2026 a 10/08/2026` = Julho/2026
- `11/12/2026 a 10/01/2027` = Dezembro/2026

Essa referência é usada no salvamento do Histórico e propagada para as visualizações do ecossistema.

## Política de cobertura por fonte

O motor final calcula somente sobre datas presentes simultaneamente no ponto e na escala, mas as camadas de entrada possuem critérios diferentes:

### Excel/XLSM/XLS

- RC52 tenta pré-normalizar a escala usando o contexto do espelho;
- RC51/RC53 tratam grades alternativas e mensais quando existe evidência suficiente;
- quando a normalização não se aplica, RC52 pode devolver o arquivo ao parser principal;
- se o parser principal reconhecer a estrutura com segurança, o cálculo final pode operar sobre a interseção disponível;
- reconhecimento parcial nunca elimina os demais gates de loja, colaboradores, turnos e confiabilidade.

### PDF de escala RC57

- cabeçalho precisa confirmar a loja do espelho;
- leitura textual é primária;
- OCR é contingencial e carregado sob demanda;
- a grade PDF precisa cobrir pelo menos **95% da competência do espelho**;
- dias ausentes não são inferidos;
- todos os turnos utilizados precisam ter horário na legenda;
- OCR não pode contornar loja divergente, cobertura insuficiente ou legenda incompleta.

## Proveniência e identidade de loja

A RC55 impede relabeling de arquivos sintéticos. Um arquivo `PDF_GRID_RC57_ML10.xlsx`, por exemplo, não pode ser normalizado como ML11.

A RC57 adiciona um gate anterior para PDF original:

1. inspeciona o cabeçalho da primeira página;
2. prioriza `MLxx` sobre `LOJA xx`;
3. bloqueia ambiguidade;
4. exige igualdade com a loja do espelho;
5. usa OCR somente quando o cabeçalho textual não possui evidência suficiente.

## OCR RC57

`ocr-lazy-rc48.js` mantém Tesseract.js fora do startup.

A RC57 chama `ADERENCIA_ENSURE_OCR()` apenas quando necessário. Para a grade completa, OCR só é elegível após falha estrutural da camada textual; as palavras e coordenadas extraídas são submetidas novamente ao mesmo parser rígido.

O projeto permanece preso ao Tesseract.js **5.x**. Alterações de major version exigem nova validação da estrutura de saída OCR antes de atualização.

## Invalidação de estado

Ao entrar um novo PDF de escala em validação, a RC57 invalida a escala anterior no motor antes de processar o novo arquivo.

Se o novo arquivo falhar:

- não há reaproveitamento silencioso do arquivo anterior;
- o resultado anterior fica oculto;
- o botão Calcular permanece desabilitado até uma nova escala válida ser reconhecida.

## Persistência

- `localStorage` funciona como cache/contingência local;
- a base portátil `aderencia-dados.json` pode ser criada/vinculada em navegador compatível;
- histórico, divergências, configuração administrativa e cadastro de lojas/regionais acompanham a base portátil;
- reprocessar a mesma loja/competência substitui o registro correspondente em vez de duplicá-lo;
- a limpeza de histórico também remove os detalhes relacionados quando habilitada.

## Dashboards integrados

A competência global sincroniza LED da rede, Histórico, Monitoramento, Divergências, Evolução e ano do Semestral. A aba Recorrência usa o histórico nominal das divergências para calcular reincidência por loja, regional e colaborador.

Reincidente = mesmo colaborador, na mesma loja, com divergência em pelo menos duas competências distintas.

## Performance

- cache de `File.arrayBuffer()`, PDF.js e XLSX reduz releituras do mesmo arquivo;
- dashboards extensos renderizam sob demanda quando aplicável;
- Tesseract não é carregado durante a abertura normal;
- OCR só adiciona custo quando a contingência realmente é acionada.

## Segurança de PDF

`pdf-security-rc35.js` e as chamadas RC57 mantêm `isEvalSupported=false` e scripting desabilitado no PDF.js.

## Dependências externas

Startup:

- PDF.js 3.11.174
- SheetJS/XLSX 0.18.5
- jsPDF 2.5.1

Sob demanda:

- Tesseract.js 5.x

É necessária conexão para dependências CDN que ainda não estejam disponíveis no navegador.

## Health check

Por compatibilidade histórica, o objeto consolidado continua se chamando:

`ADERENCIA_RC50_HEALTH`

Na RC57 certificada:

`ADERENCIA_RC50_HEALTH.ok === true`

O health check valida, entre outros itens, versão, lista ativa sem duplicações, cache, OCR não eager, segurança PDF, hardening RC51, bridge RC53, proveniência RC55, gate de cabeçalho RC57, parser RC57, fallback OCR RC57, histórico, competência, navegação, recorrência e cadastro de lojas.

## Testes de aceite RC57

1. Abrir `index.html` sem erro global não tratado.
2. Confirmar `ADERENCIA_VERSION === 'v1.0 RC57'`.
3. Confirmar `ADERENCIA_RC50_HEALTH.ok === true`.
4. Confirmar que `pdf-store-header-guard-rc57.js` e `pdf-schedule-parser-rc57.js` estão ativos.
5. Confirmar que `pdf-schedule-parser-rc28.js` não está na lista ativa.
6. Confirmar que Tesseract não é carregado no startup.
7. Confirmar que cabeçalho PDF com loja divergente é bloqueado.
8. Confirmar que cabeçalho PDF ambíguo é bloqueado.
9. Confirmar que OCR só é elegível para insuficiência estrutural e não para cobertura/turnos/loja divergente.
10. Confirmar que um novo PDF invalida imediatamente a escala anterior enquanto é validado.
11. PDF validado deve gerar `PDF_GRID_RC57_MLxx.xlsx` preservando a loja confirmada.
12. Grade sintética de loja errada deve continuar bloqueada pelo guard RC55.
13. Competência `11/06–10/07` deve salvar em Junho; `11/07–10/08` em Julho; `11/12–10/01` em Dezembro do ano inicial.
14. Histórico, LED, Monitoramento, Divergências, Evolução e Semestral devem acompanhar a competência canônica.
15. Divergências nominais devem fechar com os totais da engine antes da persistência.
16. Reprocessar a mesma loja/competência não deve duplicar histórico nominal.
17. Lote deve reutilizar o mesmo motor e os mesmos gates da análise individual.
18. Exportações e base portátil devem continuar operacionais.
19. Toda a suíte Playwright precisa concluir com sucesso.

## Certificação atual

A correção de expectativa de startup da RC57 está no commit `985f566e495a5805ffaaea4a2667255ea8c89271`.

A execução GitHub Actions **#187**, run id `33651294100`, concluiu o job E2E integralmente com `success` em 2 de setembro de 2026.

## Congelamento da rodada

A RC57 é considerada fechada apenas enquanto os gates descritos acima e a suíte E2E permanecerem verdes. Mudanças funcionais posteriores devem abrir nova rodada ou extensão explicitamente identificada, em vez de alterar silenciosamente o contrato desta candidata.
