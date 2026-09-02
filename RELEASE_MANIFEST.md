# Manifesto de Release — v1.0 RC58

Este manifesto registra o runtime ativo, os gates de segurança e os critérios de aceite da candidata operacional RC58 para uso local.

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

`window.ADERENCIA_ACTIVE_MODULES` é a fonte de verdade para os módulos carregados pelo bootstrap.

## Módulos relevantes da RC58

A RC58 mantém o parser PDF e o OCR rígido introduzidos na RC57 e acrescenta hardening transacional/identidade para Excel.

- `schedule-hardening-rc51.js`
- `schedule-monthly-bridge-rc53.js`
- `schedule-provenance-guard-rc55.js`
- `schedule-source-identity-guard-rc58.js`
- `schedule-preprocess-rc52.js` — runtime RC52.3 na RC58
- `pdf-store-header-guard-rc57.js`
- `pdf-schedule-parser-rc57.js`
- `ocr-lazy-rc48.js`
- `pdf-security-rc35.js`
- `rc50-integrity-check.js` — nome histórico preservado por compatibilidade

Os parsers antigos podem permanecer no repositório para histórico, mas não fazem parte da lista ativa quando não aparecem em `ADERENCIA_ACTIVE_MODULES`.

## Regra canônica de competência

A competência é sempre o mês/ano do **início do período integral do espelho de ponto**.

- `11/06/2026 a 10/07/2026` = Junho/2026
- `11/07/2026 a 10/08/2026` = Julho/2026
- `11/12/2026 a 10/01/2027` = Dezembro/2026

Essa referência é usada no salvamento do Histórico e propagada para as visualizações do ecossistema.

## Política de cobertura por fonte

O motor final calcula somente sobre datas presentes simultaneamente no ponto e na escala, mas as camadas de entrada possuem critérios diferentes.

### Excel/XLSM/XLS

- RC52.3 tenta pré-normalizar a escala usando o contexto validado do espelho;
- RC51/RC53 tratam grades alternativas e mensais quando existe evidência suficiente;
- falhas meramente estruturais podem retornar ao parser principal para preservar compatibilidade;
- conflito forte de identidade da loja não recebe fallback;
- ao iniciar uma nova leitura Excel, a escala anterior é invalidada imediatamente para impedir reaproveitamento silencioso durante processamento assíncrono;
- se o parser principal reconhecer a estrutura com segurança, o cálculo final pode operar sobre a interseção disponível.

### PDF de escala RC57 dentro da RC58

- cabeçalho precisa confirmar a loja do espelho;
- leitura textual é primária;
- OCR é contingencial e carregado sob demanda;
- a grade PDF precisa cobrir pelo menos **95% da competência do espelho**;
- dias ausentes não são inferidos;
- todos os turnos utilizados precisam ter horário na legenda;
- OCR não pode contornar loja divergente, cobertura insuficiente ou legenda incompleta.

## Identidade de loja e proveniência

A RC55 impede relabeling de arquivos sintéticos. Um arquivo `PDF_GRID_RC57_ML10.xlsx`, por exemplo, não pode ser normalizado como ML11.

A RC57 protege o PDF original por cabeçalho validado. A RC58 estende a proteção ao Excel original:

1. considera evidência forte de loja no nome do arquivo quando ela é explícita (`MLxx`/`LOJA xx`);
2. inspeciona evidência operacional do workbook;
3. compara essa evidência com a loja já validada do espelho;
4. em divergência forte, bloqueia o arquivo e não o envia ao parser principal como fallback;
5. resíduos fracos de template continuam tratados pelos normalizadores existentes, evitando falsos bloqueios.

## OCR

`ocr-lazy-rc48.js` mantém Tesseract.js fora do startup. O parser RC57 chama `ADERENCIA_ENSURE_OCR()` somente quando há insuficiência estrutural compatível com OCR.

As coordenadas OCR passam novamente pelos mesmos gates rígidos de loja, competência, cobertura e turnos. O projeto permanece preso ao Tesseract.js **5.x**; mudança de major version exige nova validação.

## Invalidação de estado

Na RC58, tanto PDF quanto Excel invalidam a escala anterior antes de validar uma nova entrada.

Se o novo arquivo falhar:

- não há reaproveitamento silencioso da escala anterior;
- o resultado anterior fica oculto/inválido;
- o botão Calcular permanece desabilitado até uma nova escala válida ser reconhecida.

## Persistência e dashboards

- `localStorage` funciona como cache/contingência local;
- a base portátil `aderencia-dados.json` pode ser criada/vinculada em navegador compatível;
- histórico, divergências, configuração administrativa e cadastro de lojas/regionais acompanham a base portátil;
- a competência global sincroniza LED da rede, Histórico, Monitoramento, Divergências, Evolução e ano do Semestral;
- reprocessar a mesma loja/competência substitui o registro correspondente em vez de duplicá-lo.

## Segurança de PDF

`pdf-security-rc35.js` e as chamadas do parser mantêm `isEvalSupported=false` e scripting desabilitado no PDF.js.

## Dependências externas

Startup:

- PDF.js 3.11.174
- SheetJS/XLSX 0.18.5
- jsPDF 2.5.1

Sob demanda:

- Tesseract.js 5.x

É necessária conexão para dependências CDN que ainda não estejam disponíveis no navegador.

## Health check

Por compatibilidade histórica, o objeto consolidado continua se chamando `ADERENCIA_RC50_HEALTH`.

Na RC58 certificada:

`ADERENCIA_VERSION === 'v1.0 RC58'`

`ADERENCIA_RC50_HEALTH.ok === true`

O health check valida, entre outros itens, lista ativa sem duplicações, cache, OCR não eager, segurança PDF, hardening RC51, bridge RC53, proveniência RC55, identidade Excel RC58, preprocess RC52.3, gate de cabeçalho RC57, parser RC57, fallback OCR RC57, histórico, competência, navegação, recorrência e cadastro de lojas.

## Testes de aceite RC58

1. Abrir `index.html` sem erro global não tratado.
2. Confirmar `ADERENCIA_VERSION === 'v1.0 RC58'`.
3. Confirmar `ADERENCIA_RC50_HEALTH.ok === true`.
4. Confirmar que Tesseract não é carregado no startup.
5. Confirmar que PDF com loja divergente/ambígua permanece bloqueado.
6. Confirmar que OCR só é elegível para insuficiência estrutural e não para cobertura, turnos ou loja divergente.
7. Confirmar que novo PDF invalida imediatamente a escala anterior.
8. Confirmar que novo Excel também invalida imediatamente a escala anterior durante pré-processamento.
9. Confirmar que evidência forte de Excel pertencente a outra loja bloqueia o fallback.
10. Confirmar que resíduos fracos de template não causam bloqueio falso quando a loja correta é confirmada por evidência mais forte.
11. Confirmar que falha estrutural recuperável de Excel ainda pode seguir ao parser principal.
12. Confirmar competência canônica 11→10 em Histórico e dashboards.
13. Confirmar lote, exportações e base portátil.
14. Toda a suíte Playwright precisa concluir com sucesso.

## Certificação atual

A RC58 funcional está no commit `6355fe6885f1cb8cb35d37186e4f88bddf7247ef`.

A execução GitHub Actions **#189**, run id `33652638184`, concluiu o job E2E integralmente com `success` em 2 de setembro de 2026.

## Congelamento da rodada

A RC58 é a candidata corrente para novo teste prático. Correções decorrentes do teste manual devem abrir uma nova rodada identificável, preservando este marco certificado no histórico.
