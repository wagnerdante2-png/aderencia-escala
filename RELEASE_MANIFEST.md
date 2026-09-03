# Manifesto de Release — v1.0 RC62

Este manifesto registra o runtime ativo, as correções derivadas do teste operacional, os controles de segurança e os critérios de aceite da candidata operacional RC62 para uso local.

## Objetivo da RC62

A RC62 corrige comportamentos observados em teste manual real:

1. PDFs de **Escala de Folgas** com matriz esparsa eram rejeitados como se a grade Nome × Dias não existisse;
2. PDF-imagem com orientação inadequada precisava de OCR em rotações alternativas;
3. escalas reconhecidas parcialmente precisavam ser recompostas com segurança pelo quadro Horários antes do gate estrutural;
4. a inferência antiga de mês por substring podia confundir sobrenomes — por exemplo, `MARCOLINO` — com o mês `MARÇO`;
5. OCR de tabelas digitalizadas precisava reconstruir o calendário mesmo quando parte dos números dos dias não fosse reconhecida;
6. códigos e cargos sujeitos a confusões típicas de OCR precisavam de normalização conservadora antes da conciliação.

A solução não remove o gate estrutural. A RC62 corrige a interpretação da fonte e mantém a filosofia fail-closed.

## Runtime essencial

Arquivos base:

- `index.html`
- `styles.css`
- `dashboard.css`
- `bootstrap.js`
- `engine-v3.js`
- `schedule-adaptive-rc62.js`
- `schedule-adaptive-rc61.js`
- `history.js`
- `history-report.js`
- `export-report.js`
- `batch.js`
- `LEIA-ME_LOCAL.txt`
- `README.md`

`window.ADERENCIA_ACTIVE_MODULES` é a fonte de verdade para os módulos carregados pelo bootstrap.

## Arquitetura adaptativa RC62

`schedule-adaptive-rc62.js` — runtime **`RC62.1`** — é carregado imediatamente antes de `schedule-adaptive-rc61.js`.

A RC62 assume o front-door de PDFs. Para PDF textual denso, reutiliza o parser RC61 já certificado. Para PDF identificado como Escala de Folgas, usa a política esparsa/híbrida. Para PDF sem camada textual suficiente, aciona OCR sob demanda e tenta orientações alternativas.

Excel/XLSM/XLS continua no front-door RC61/RC59, preservando as regressões anteriores.

A saída normalizada permanece uma grade XLSX canônica com prefixo `RC51_RC61_<LOJA>_...xlsx`, mantendo compatibilidade com as camadas históricas e com o motor atual.

## Escala de Folgas esparsa

A RC62 parte da semântica operacional de que uma **Escala de Folgas** pode materializar principalmente exceções e eventos, deixando dias normais de trabalho em branco.

A política é:

1. o modo só é habilitado com evidência de Escala de Folgas no nome ou conteúdo;
2. dias são identificados por calendário e coordenadas da grade;
3. códigos explícitos são associados à posição real da célula;
4. linhas com baixa densidade continuam elegíveis quando Nome e Cargo são reconhecíveis;
5. a população é conciliada com o espelho;
6. células vazias são preenchidas somente quando o quadro **Horários** daquele colaborador no próprio espelho fornece previsão segura;
7. horário que coincide com a legenda reutiliza o turno existente;
8. horário sem código equivalente pode receber `T80`–`T99` como código técnico interno, preservando exatamente entrada/saída previstas;
9. código explícito de turno sem horário na legenda continua bloqueado;
10. nenhuma previsão é inventada e nenhum turno é copiado de outro colaborador.

`WCA` é reconhecido como cargo operacional válido.

## Gate estrutural de 95%

A RC62 distingue:

- **cobertura temporal:** datas da escala que cruzam o período do ponto;
- **cobertura estrutural:** quanto das marcações dos colaboradores conciliados possui informação de escala utilizável.

Não existe exigência universal de 95% de cobertura temporal para aceitar um PDF. A análise pode ser proporcional à interseção real.

O motor mantém o gate de **95% de cobertura estrutural** após a reconciliação. Na Escala de Folgas, a RC62 primeiro recompõe com segurança os dias vazios pelo quadro Horários e só depois deixa o motor calcular essa cobertura. Se ainda permanecer abaixo de 95%, o resultado é bloqueado.

## PDF imagem, autorrotação e OCR tabular RC62.1

A camada textual é tentada primeiro. Quando não produz estrutura suficiente, a RC62 usa `ADERENCIA_ENSURE_OCR()` e pode tentar 0°, 90°, 270° e 180°.

Na RC62.1, quando o OCR bruto reconhece evidência de uma escala operacional mas não consegue reconstruir a matriz, é executada uma segunda leitura tabular:

- a área útil é detectada por densidade de tinta;
- sequências regulares de linhas verticais e horizontais identificam a geometria da grade;
- o fundo de cada célula é normalizado localmente, permitindo ler texto claro sobre células escuras e texto escuro sobre células claras;
- um OCR em modo de bloco único é executado sobre a tabela preparada;
- a geometria de colunas pode reconstruir o calendário completo quando apenas parte dos números dos dias foi reconhecida;
- OCR bruto continua sendo preservado como fonte de cabeçalho e legenda.

A normalização de códigos cobre confusões conservadoras observadas na matriz, como `113 → T13`, `718 → T18`, `TG → T6` e `T1D → T14`. Cargos também recebem correções limitadas, como `LIDER CAIKA → LIDER CAIXA`.

## Inferência de mês RC62.1

O mês não é mais procurado como substring arbitrária em todo o texto. A RC62.1 exige o nome do mês como **token completo**, priorizando a área inicial/cabeçalho. Assim, sobrenomes como `MARCOLINO` não podem ser interpretados como `MARÇO`.

## Diagnóstico de período

A RC62 tenta reconhecer o calendário da fonte antes de classificar uma falha como estrutural. Quando escala e espelho realmente não se cruzam, o erro apresenta os intervalos reconhecidos.

A verificação de período só é considerada conclusiva depois de mês/ano e grade de dias terem sido determinados por evidência suficiente; inferências derivadas de substring ou de OCR incompleto não devem produzir um falso período.

## Política RC61 preservada

Continuam válidos:

- competência ancorada no início do período integral do espelho;
- escala 01→30/31 comparável proporcionalmente com espelho 11→10;
- população variável por admissões/desligamentos;
- conciliação por matrícula/nome;
- turnos resolvidos pela legenda da própria versão;
- exceção diária limitada à data correspondente;
- preenchimento seguro de lacunas de Excel a partir do quadro Horários;
- proveniência RC55 e identidade RC58;
- invalidação do estado anterior ao processar nova escala.

## Segurança

- PDF.js usa `isEvalSupported=false` e scripting desabilitado;
- Tesseract.js 5.x permanece lazy e não é carregado no startup;
- população incompatível não é aceita para aumentar cobertura;
- turnos explícitos sem legenda não recebem horário inventado;
- período realmente sem interseção é bloqueado;
- o gate estrutural de 95% permanece ativo;
- artefatos sintéticos continuam identificados para impedir relabeling de origem.

## Health check RC62

Por compatibilidade histórica, o objeto consolidado continua se chamando `ADERENCIA_RC50_HEALTH`.

A candidata exige:

`ADERENCIA_VERSION === 'v1.0 RC62'`

`ADERENCIA_SCHEDULE_ADAPTIVE_RC62.version === 'RC62.1'`

`ADERENCIA_SCHEDULE_ADAPTIVE_RC61.version` continua começando com `RC61`

`ADERENCIA_RC50_HEALTH.ok === true`

## Testes de aceite adicionais RC62.1

Além de toda a suíte histórica:

1. reconhecer uma Escala de Folgas de 31 dias com poucos códigos explícitos por colaborador;
2. manter cada `F`/evento na data determinada pela coordenada original;
3. preencher dias vazios somente a partir do plano do próprio colaborador no espelho;
4. reconhecer `WCA` como cargo válido;
5. diagnosticar período sem interseção somente com calendário confiável;
6. garantir que `MARCOLINO` não seja confundido com `MARÇO` quando o cabeçalho informa `JULHO 2026`;
7. reconstruir 31 dias de julho a partir de âncoras OCR parciais e espaçamento regular;
8. normalizar confusões de turno/cargo observadas no OCR sem criar códigos fora da faixa reconhecida;
9. manter Tesseract fora do startup;
10. manter todas as regressões RC51–RC62 verdes;
11. construir o pacote Windows somente depois de toda a suíte Playwright verde.

## Certificação e pacote

A identificação exata do commit e da execução que geraram o pacote fica em `BUILD_INFO.txt`. O workflow produz `ADERENCIA_ESCALA_RC62_TESTE_WINDOWS.zip` e registra `rc62_adapter=RC62.1`.

O ZIP deve ser validado por integridade, referências locais e coerência de versão antes de distribuição.

## Congelamento da rodada

A RC62.1 é a revisão derivada diretamente dos dois problemas restantes observados no teste manual da RC62. Novas alterações posteriores devem preservar este marco no histórico de commits e Actions.
