# Aderência de Escala

**Versão candidata operacional atual: v1.0 RC58**

Aplicação web local para calcular a aderência entre a escala planejada e o espelho de ponto, sem backend e sem banco externo obrigatório. O processamento dos arquivos selecionados acontece no navegador.

## Entradas

1. **Espelho de ponto:** PDF mensal contendo os colaboradores da loja.
2. **Escala planejada:** preferencialmente `.xlsx`, `.xlsm` ou `.xls`; PDF exportado da Escala Operacional também é aceito como contingência.

Macros de arquivos XLSM não são executadas.

## Regra de aderência

- usa a **primeira entrada real do dia** no espelho de ponto;
- marcações `P` pré-assinaladas não são tratadas como batida real;
- compara a primeira entrada efetiva com a entrada prevista do turno;
- diferença de até **90 minutos**: sem penalização;
- diferença acima de **90 minutos**: penalização de **1 ponto**;
- marcação em dia previsto como `F`, `FER`, `AF`, `AB`, `AL`, `FF`, `FC`, `NC` ou `AE`: penalização de **10 pontos por colaborador/data**;
- fórmula: `1 - (desvios + 10 × não conformidades) / total de marcações consideradas`;
- o resultado visual é limitado entre 0% e 100%.

Um resultado de 0% não é descartado apenas por ser zero. A camada de sanidade RC58 só o sinaliza quando a amostra que o originou é estruturalmente anormal, reduzindo o risco de publicar um “zero falso” causado por leitura esparsa.

## Competência operacional 11 → 10

A competência mensal é definida pelo **início do período integral do espelho de ponto**.

- `11/06/2026 a 10/07/2026` = **Junho/2026**;
- `11/07/2026 a 10/08/2026` = **Julho/2026**;
- `11/12/2026 a 10/01/2027` = **Dezembro/2026**.

A data final da escala ou da interseção não redefine a competência. Se a escala cobrir somente parte do ciclo do espelho, inclusive `01–30` ou `01–31`, o cálculo usa proporcionalmente somente os dias existentes na interseção válida. A aplicação não inventa datas, horários ou turnos para completar uma grade incompleta.

Essa competência é usada em Histórico, painel LED, Monitoramento, Semestral, Divergências, Evolução, processamento em lote e exportações.

## Runtime RC58

O runtime expõe `window.ADERENCIA_VERSION === 'v1.0 RC58'`.

A camada de recuperação estrutural prioritária é **RC58-R3** (`schedule-recovery-r3.js`). Ela deve ser carregada antes do parser PDF RC58. O antigo `schedule-recovery-r2.js` permanece no repositório somente como histórico técnico e não integra `window.ADERENCIA_ACTIVE_MODULES`.

O parser principal de PDF é RC58 e a conciliação estrutural principal é RC58.1. Contratos legados necessários permanecem preservados por aliases/guards, mas não substituem o runtime atual.

## Estruturas reconhecidas

### Espelho de ponto

O sistema procura metadados do espelho, loja/departamento, matrícula, nome, período e marcações diárias. A camada semântica filtra marcações pré-assinaladas e mantém as batidas efetivas usadas no cálculo.

### Escala Excel/XLSM/XLS

É a fonte preferencial. O motor procura as estruturas operacionais conhecidas, identifica nomes, cargos, datas, códigos diários (`T1`, `T2`, `F`, `FER`, `AF` etc.) e legenda de turnos (`Txx | hh:mm às hh:mm`).

A RC58 também possui recuperação para layouts heterogêneos sem cabeçalho convencional `Nome`, nomes fragmentados entre células e grades mensais parciais. Quando há roster validado no espelho, ele é usado para reconciliar a identidade do colaborador.

### Escala PDF

É contingência. O sistema reconstrói a matriz visual **Funcionário × Dias** pela posição dos elementos do PDF, associa células às datas reconhecidas e tenta preservar a identidade dos colaboradores entre páginas de continuação horizontal.

A recuperação RC58-R3 reconhece calendários reais, inclusive páginas que dividem horizontalmente um mesmo mês. Ela mede cobertura e densidade antes de aceitar a leitura e não deve transformar uma amostra esparsa em resultado operacional confiável.

OCR permanece um fallback explícito sob demanda, não uma etapa obrigatória da abertura normal.

## Diagnóstico estrutural

A camada paralela de inspeção produz uma representação canônica `Funcionário × Data × Código`, mede continuidade temporal, cobertura da matriz, colaboradores conciliados e células reconhecidas. O diagnóstico não altera a fórmula de aderência; ele serve para explicar a qualidade da leitura.

## Competência global e dashboards

O seletor global de **Mês / Ano** sincroniza o ecossistema de visualização, incluindo Histórico, Monitoramento, Divergências, Evolução, painel LED e o ano correspondente do Semestral. No momento de salvar uma nova análise, a competência apurada pelo início do espelho prevalece sobre o período que estava apenas sendo visualizado.

O painel LED resume média da rede, lojas verdes (≥95%), amarelas (80% a 94,99%), vermelhas (<80%), unidades sem resultado e cobertura mensal.

A aba Evolução combina aderência mensal da seleção atual com a média da rede e evita ligar artificialmente meses sem dados.

## Persistência e base portátil

- o histórico pode permanecer no `localStorage` como cache/contingência;
- é possível criar e vincular `aderencia-dados.json` como base portátil;
- histórico, divergências, configuração administrativa e cadastro de lojas/regionais acompanham a base portátil;
- reprocessar a mesma loja/competência substitui o registro correspondente em vez de duplicá-lo;
- backup e restauração manual continuam disponíveis como contingência.

O cadastro de lojas é dinâmico. A regra atual de referência mantém ML61 Vinhedo em **GUARDIÕES DA CHAMA**.

## Processamento em lote

O lote reutiliza o mesmo motor da análise individual e processa os pares de arquivos sequencialmente. Erro de uma linha deve permanecer isolado naquela linha, sem interromper os demais pares válidos.

## Divergências e recorrência

O detalhamento nominal persiste apenas ocorrências que efetivamente reduziram o score e confere os totais contra o motor antes de gravar. A recorrência identifica repetição do mesmo colaborador, na mesma loja, em duas ou mais competências distintas.

## Segurança de PDF

A aplicação endurece o PDF.js com `isEvalSupported=false` e `enableScripting=false` no fluxo protegido, reduzindo a superfície de execução dinâmica ao abrir PDFs locais.

## Executar localmente no Windows

Para uso operacional, prefira o artefato **Aderencia_Escala_RC58_Portable_Windows** gerado pelo workflow **Build Portable RC58**:

1. baixe o ZIP do artefato;
2. extraia **todo** o conteúdo para uma pasta normal do Windows;
3. abra `index.html` com duplo clique;
4. use preferencialmente Edge ou Chrome atualizado;
5. crie ou vincule a base `aderencia-dados.json` quando desejar persistência portátil.

O pacote Portable inclui cópias locais dos JavaScript essenciais de PDF.js, SheetJS/XLSX e jsPDF e inclui também o carregador do Tesseract.js. A abertura normal do pacote, portanto, não depende das CDNs desses scripts.

**Limite conhecido do OCR offline:** quando o OCR é efetivamente acionado, o Tesseract pode requisitar recursos adicionais de worker/core/dados de idioma. A RC58 não declara o OCR integralmente offline como requisito certificado.

Se você abrir diretamente o código-fonte do repositório, em vez do artefato Portable, o `index.html` de desenvolvimento referencia bibliotecas por CDN e precisa de conexão para carregá-las.

Não é necessário Git, Python, PowerShell, Codespaces ou servidor local para usar o pacote Portable extraído.

## Integridade e validação

O health check mantém o nome histórico `ADERENCIA_RC50_HEALTH`, mas valida o runtime RC58. Em operação normal, após o carregamento:

`ADERENCIA_RC50_HEALTH.ok === true`

Ele verifica, entre outros contratos, ausência de módulos ativos duplicados, recuperação R3, aposentadoria do R2, precedência R3 → parser RC58, segurança PDF, cache, OCR fora do startup, conciliações, parser/calendário RC58, compatibilidade proporcional, sanidade de resultado, competência global, recorrência e cadastro de lojas.

O workflow **RC50 End-to-End** executa a suíte Playwright. O workflow **Build Portable RC58** verifica arquivos essenciais, módulos ativos, referências locais, ausência de executáveis/scripts proibidos no pacote e gera manifesto SHA-256 antes de publicar o ZIP.

## Versão

**Candidata operacional da branch de estabilização: v1.0 RC58.**

A promoção para `main` é uma etapa separada e não ocorre automaticamente por causa destas correções.
