# Manifesto de Release — v1.0 RC49

Este manifesto define o runtime e os critérios da versão candidata final para uso local.

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

Módulos ativos carregados por `bootstrap.js`:
- `runtime-cache-rc47.js`
- `ocr-lazy-rc48.js`
- `portable-storage.js`
- `pdf-security-rc35.js`
- `point-semantics.js`
- `pdf-xlsx-compat-rc21.js`
- `pdf-calendar-integrity-rc29.js`
- `canonical-validation-rc35.js`
- `pdf-schedule-parser-rc28.js`
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
- `performance-rc42.js`
- `divergence-audit-rc42.js`
- `recurrence-dashboard-rc44.js`
- `navigation-integrity-rc44.js`
- `rc49-integrity-check.js`

`window.ADERENCIA_ACTIVE_MODULES` é a fonte de verdade do runtime ativo.

## Regra canônica de competência

A competência é sempre o mês/ano do início do período integral do espelho de ponto.

- `11/06/2026 a 10/07/2026` = Junho/2026
- `11/07/2026 a 10/08/2026` = Julho/2026
- `11/12/2026 a 10/01/2027` = Dezembro/2026

Escalas parciais (`01–30`, `01–31` ou qualquer outra cobertura menor) não são rejeitadas quando existe interseção com o espelho. O cálculo usa proporcionalmente apenas os dias disponíveis na interseção e mantém a competência definida pelo início do espelho.

## Persistência

- `localStorage` funciona como cache/contingência local.
- A base portátil `aderencia-dados.json` pode ser criada/vinculada em navegador compatível.
- Histórico, divergências, pendências, configuração administrativa e cadastro de lojas/regionais acompanham a base portátil.
- A chave de divergências preserva nomes, matrículas, cargos, datas, tipos, horários, marcações e penalidades por colaborador/data.
- Reprocessar a mesma loja/competência substitui o registro correspondente em vez de duplicá-lo.
- A limpeza de histórico também remove os detalhes relacionados quando habilitada no menu administrativo.

## Dashboards integrados

A competência global sincroniza LED da rede, Histórico, Monitoramento, Divergências, Evolução e ano do Semestral. A aba Recorrência usa o histórico nominal das divergências para calcular reincidência por loja, regional e colaborador.

Reincidente = mesmo colaborador, na mesma loja, com divergência em pelo menos duas competências distintas.

## Performance

- cache de `File.arrayBuffer()`, PDF.js e XLSX reduz releituras do mesmo arquivo durante cálculo e captura de divergências;
- dashboards extensos renderizam sob demanda/paginados quando aplicável;
- Tesseract não é carregado no startup;
- `ADERENCIA_ENSURE_OCR()` permanece disponível para carregamento explícito sob demanda;
- o fluxo homologado para PDF de escala continua sendo o PDF exportado com camada textual, convertido pelo parser RC28 em estrutura XLSX sintética antes do cálculo.

## Segurança de PDF

`pdf-security-rc35.js` força `isEvalSupported=false` no PDF.js sem alterar a API pública usada pelos módulos.

## Dependências externas no startup

- PDF.js 3.11.174
- SheetJS/XLSX 0.18.5
- jsPDF 2.5.1

Tesseract.js 5.x fica fora da abertura inicial e só é carregado explicitamente quando necessário. É necessária conexão para dependências CDN.

## Auditoria RC49

Após carregar a aplicação, o console deve disponibilizar:

`ADERENCIA_RC49_HEALTH.ok === true`

O health check valida versão, lista ativa sem duplicações, cache, OCR fora do startup, histórico, competência global, navegação, parser PDF, compatibilidade PDF/XLSX, captura de divergências, recorrência e cadastro de lojas.

## Testes finais de aceite

1. Abrir `index.html` e confirmar navegação responsiva sem travamento.
2. Confirmar `ADERENCIA_RC49_HEALTH.ok === true`.
3. Excel + espelho homologado deve reproduzir o percentual esperado.
4. PDF exportado da Escala Operacional deve ser reconhecido pelo RC28.
5. `11/06–10/07` deve salvar em Junho; `11/07–10/08` em Julho; `11/12–10/01` em Dezembro do ano inicial.
6. Escala `01–30/31` deve calcular somente a interseção disponível, sem rejeição automática.
7. Salvar resultado deve atualizar competência global, Histórico, LED, Monitoramento, Divergências, Evolução e Semestral.
8. Divergências nominais devem fechar com os totais da engine antes da persistência.
9. Reprocessar a mesma loja/competência não deve duplicar histórico nominal.
10. Recorrência deve considerar o mesmo colaborador em duas ou mais competências.
11. Filtros de loja/regional devem refletir corretamente em Histórico, Monitoramento, Evolução e Recorrência.
12. ML61 deve permanecer em `GUARDIÕES DA CHAMA`.
13. Exportações PDF e Excel devem abrir sem erro.
14. Backup/restauração e base portátil devem preservar histórico e divergências.
15. Lote deve continuar após erro individual e salvar o percentual correto de cada linha.
16. Trocar Mês/Ano global deve mover todo o ecossistema temporal junto.
17. Confirmar que o Tesseract não é baixado durante abertura normal.
18. Confirmar `ADERENCIA_RUNTIME_CACHE.stats` sem erros e com hits após reuso de arquivos.

## Congelamento

RC49 é a candidata final pós-otimização. Depois destes testes locais, qualquer correção posterior deve abrir RC50 ou superior. A RC49 não deve receber novas alterações funcionais após o congelamento.