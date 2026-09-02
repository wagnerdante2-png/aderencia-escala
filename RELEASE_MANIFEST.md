# Manifesto de Release — v1.0 RC61

Este manifesto registra o runtime ativo, a política adaptativa de leitura de escala, os controles de segurança e os critérios de aceite da candidata operacional RC61 para uso local.

## Objetivo da RC61

A RC61 substitui o conjunto de pré-condições rígidas do arquivo original por um **front-door adaptativo**. A escala é classificada, conciliada com o espelho de ponto e convertida em uma grade canônica antes de chegar às camadas históricas do motor.

O objetivo é aceitar variações operacionais reais sem transformar tolerância em aceitação cega.

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

## Front-door adaptativo

O módulo principal da rodada é:

- `schedule-adaptive-rc61.js` — runtime `RC61.1`

Ele entra antes dos gates históricos e recebe o arquivo original de escala em XLSX, XLSM, XLS ou PDF.

A saída normalizada é um workbook canônico com nome `RC51_RC61_<LOJA>_...xlsx`. Esse prefixo identifica uma grade interna já reconciliada e impede que ela seja reinterpretada como um arquivo original cru.

Os módulos históricos permanecem ativos para compatibilidade e defesa em profundidade, incluindo `schedule-hardening-rc51.js`, `schedule-monthly-bridge-rc53.js`, `schedule-provenance-guard-rc55.js`, `schedule-source-identity-guard-rc58.js`, `schedule-preprocess-rc52.js`, `pdf-store-header-guard-rc57.js` e `pdf-schedule-parser-rc57.js`.

## Regra canônica de competência

A competência é o mês/ano do **início do período integral do espelho de ponto**.

- `11/06/2026 a 10/07/2026` = Junho/2026
- `11/07/2026 a 10/08/2026` = Julho/2026
- `11/12/2026 a 10/01/2027` = Dezembro/2026

Essa referência é usada no salvamento do Histórico e propagada para as visualizações do ecossistema.

## Política temporal RC61

A grade canônica usa a **interseção de datas reais** entre a escala reconhecida e o período do espelho.

Consequências:

- uma escala 01→30/31 pode ser comparada proporcionalmente com um espelho 11→10;
- a interseção pode atravessar mudança de mês/ano;
- datas que não existem na escala não são inventadas;
- a RC61 não exige um threshold fixo de 95% para PDF;
- o aceite exige estrutura mínima reconhecível, população conciliável e legenda suficiente para os turnos efetivamente utilizados.

## Política de população e identidade

A loja do espelho é a âncora da análise. A RC61 não exige que o nome do arquivo ou o cabeçalho da escala tragam a mesma identificação literal da loja.

A origem é validada principalmente pela conciliação entre a população da escala e a população do espelho:

1. matrícula é usada quando disponível;
2. nome normalizado é usado como evidência direta;
3. aproximação de nomes é usada somente dentro de limites conservadores;
4. cada colaborador do ponto só pode ser consumido uma vez na conciliação;
5. diferenças de quantidade por admissões/desligamentos são toleradas;
6. população sem sobreposição mínima é bloqueada como origem incompatível.

A RC61 nunca cria colaboradores inexistentes para melhorar artificialmente a cobertura.

## Turnos por versão

Códigos de turno não possuem semântica global fixa.

A RC61 lê a legenda do próprio arquivo/modelo. Assim, `T6` em uma versão pode representar `13:00–22:00` e em outra `10:00–19:00` sem conflito.

Se um turno utilizado na grade não tiver horário resolvido na legenda daquela origem, a normalização é bloqueada.

## Exceções diárias

Previsões específicas encontradas no espelho são aplicadas à data correspondente. Uma exceção exata não é propagada automaticamente para os dias seguintes.

Quando uma célula Excel está vazia e existe previsão segura para colaborador/data no espelho, a RC61 pode materializar um código interno de turno para preservar o horário previsto na grade canônica.

## Excel/XLSM/XLS

A RC61:

- não executa macros;
- procura grades contendo Nome, Cargo, datas e códigos diários;
- reconcilia colaboradores com o espelho;
- detecta a versão/modelo quando há evidência textual;
- extrai a legenda do próprio workbook;
- escolhe candidatos pela combinação de população conciliada, período e materialidade;
- tolera resíduos de template que não representam a população real da escala;
- falha fechada quando não consegue formar uma grade utilizável.

## PDF textual e PDF digitalizado

A leitura textual é tentada primeiro. Quando ela é insuficiente, `ADERENCIA_ENSURE_OCR()` carrega Tesseract.js sob demanda.

O parser RC61 exige:

- calendário/dias reconhecíveis;
- população/cargos reconhecíveis;
- conciliação mínima com o espelho;
- códigos de escala materializados;
- horários para os turnos utilizados.

Cabeçalho literal de loja não é obrigatório quando a população prova a origem. OCR não pode inventar população, datas ou turnos ausentes.

## Segurança e proveniência

- PDF.js usa `isEvalSupported=false` e scripting desabilitado;
- Tesseract não é carregado no startup;
- grade sintética RC61 possui identificação própria;
- o estado calculável anterior é invalidado enquanto uma nova escala é processada;
- uma entrada não reconhecida deixa o cálculo desabilitado;
- módulos de proveniência RC55 permanecem ativos para impedir relabeling de artefatos internos;
- parsers históricos não devem reassumir o arquivo original quando o front-door RC61 está processando a entrada.

## Persistência e dashboards

- `localStorage` funciona como cache/contingência local;
- a base portátil `aderencia-dados.json` pode ser criada/vinculada;
- histórico, divergências, configuração administrativa e cadastro de lojas/regionais acompanham a base portátil;
- a competência global sincroniza LED da rede, Histórico, Monitoramento, Divergências, Evolução e ano do Semestral;
- reprocessar a mesma loja/competência substitui o registro correspondente em vez de duplicá-lo.

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

Na RC61 certificada:

`ADERENCIA_VERSION === 'v1.0 RC61'`

`ADERENCIA_SCHEDULE_ADAPTIVE_RC61.version` começa com `RC61`

`ADERENCIA_RC50_HEALTH.ok === true`

## Testes de aceite RC61

1. Abrir `index.html` sem erro global não tratado.
2. Confirmar versão global `v1.0 RC61` e health check verde.
3. Confirmar que Tesseract não é carregado no startup.
4. Confirmar que escala 01→30 pode gerar somente a interseção 11→30 contra espelho 11→10 do mês seguinte.
5. Confirmar calendário 11→10 atravessando mês corretamente.
6. Confirmar que população 55×60 pode ser aceita quando 55 pessoas são conciliadas.
7. Confirmar que uma população sem correspondência é rejeitada.
8. Confirmar que o mesmo código de turno pode ter horários diferentes em versões diferentes.
9. Confirmar que exceção diária vale somente para a data exata.
10. Confirmar PDF sem cabeçalho literal de loja quando a população comprova a origem.
11. Confirmar que arquivo estruturalmente inválido falha fechado, sem fallback inseguro.
12. Confirmar que o front-door RC61 possui o evento do arquivo original antes do fallback transacional RC58.
13. Preservar regressões históricas de navegação, competência, histórico, divergências, recorrência, regional, persistência, lote e exportações.
14. Toda a suíte Playwright precisa concluir com sucesso.
15. O pacote Windows só pode ser construído e publicado depois dos testes E2E verdes.

## Certificação e pacote

A identificação exata do commit e da execução do workflow que geraram cada pacote fica registrada em `BUILD_INFO.txt` dentro do ZIP. O artefato final deve ser validado por integridade ZIP antes de distribuição.

## Congelamento da rodada

A RC61 é a candidata corrente para teste prático. Novas correções funcionais posteriores devem abrir uma rodada identificável, preservando este marco no histórico de commits e Actions.
