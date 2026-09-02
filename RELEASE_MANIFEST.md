# Manifesto de Release — v1.0 RC62

Este manifesto registra o runtime ativo, as correções derivadas do teste operacional da RC61, os controles de segurança e os critérios de aceite da candidata operacional RC62 para uso local.

## Objetivo da RC62

A RC62 corrige três comportamentos observados em teste manual real:

1. PDFs de **Escala de Folgas** com matriz esparsa eram rejeitados como se a grade Nome × Dias não existisse;
2. um PDF-imagem com orientação inadequada não tinha tentativa de OCR em rotações alternativas;
3. uma escala reconhecida parcialmente podia chegar ao motor com baixa cobertura estrutural e ser bloqueada pelo gate de 95%, sem que a camada adaptativa tivesse recomposto os dias normais de trabalho disponíveis no quadro Horários do espelho.

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

`schedule-adaptive-rc62.js` — runtime `RC62.0` — é carregado imediatamente antes de `schedule-adaptive-rc61.js`.

A RC62 assume o front-door de PDFs. Para PDF textual denso, ela reutiliza o parser RC61 já certificado. Para PDF identificado explicitamente como Escala de Folgas, usa a política esparsa/híbrida da RC62. Para PDF sem camada textual suficiente, aciona OCR sob demanda e pode tentar orientações alternativas.

Excel/XLSM/XLS continua no front-door RC61/RC59, preservando as regressões anteriores.

A saída normalizada permanece uma grade XLSX canônica com prefixo `RC51_RC61_<LOJA>_...xlsx`, mantendo compatibilidade com as camadas históricas e com o motor atual.

## Escala de Folgas esparsa

A RC62 parte da semântica operacional de que uma **Escala de Folgas** pode materializar principalmente exceções e eventos, deixando dias normais de trabalho em branco.

A política é:

1. o modo só é habilitado com evidência explícita de "Escala de Folgas" no nome ou conteúdo;
2. dias são identificados por calendário e coordenadas da grade;
3. códigos explícitos são associados à posição real da célula, evitando deslocamento de folga para a data errada;
4. linhas com baixa densidade de códigos continuam elegíveis quando Nome e Cargo são reconhecíveis;
5. a população é conciliada com o espelho pelo mecanismo adaptativo já certificado;
6. células vazias são preenchidas somente quando o quadro **Horários** daquele colaborador no próprio espelho fornece uma previsão segura;
7. um horário que coincide com a legenda reutiliza o turno existente;
8. um horário sem código equivalente pode receber `T80`–`T99` como código técnico interno, preservando exatamente entrada/saída previstas;
9. código explícito de turno sem horário na legenda do próprio PDF continua bloqueado;
10. nenhuma previsão é inventada e nenhum turno é copiado de outro colaborador.

`WCA` passa a ser reconhecido como cargo operacional válido para esse tipo de grade.

## Gate estrutural de 95%

A RC62 distingue duas ideias que não devem ser confundidas:

- **cobertura temporal:** quais datas da escala realmente cruzam o período do ponto;
- **cobertura estrutural:** quanto das marcações dos colaboradores conciliados possui informação de escala utilizável.

Não existe uma exigência universal de 95% de cobertura temporal para aceitar um PDF. A análise pode ser proporcional à interseção real.

O motor, entretanto, mantém o gate de **95% de cobertura estrutural** após a reconciliação. Na Escala de Folgas, a RC62 primeiro recompõe com segurança os dias vazios pelo quadro Horários e só depois deixa o motor calcular essa cobertura. Se ainda permanecer abaixo de 95%, o resultado é bloqueado.

## PDF imagem e autorrotação de OCR

A camada textual é sempre tentada primeiro.

Quando ela não produz estrutura suficiente, a RC62 usa `ADERENCIA_ENSURE_OCR()` e tenta, quando necessário:

- 0°;
- 90°;
- 270°;
- 180°.

A rotação ocorre na renderização do PDF antes do OCR; as coordenadas reconhecidas continuam sendo usadas para reconstrução da grade.

Condições semânticas conclusivas — período sem interseção, população incompatível e turno explícito sem legenda — interrompem a busca e permanecem fail-closed. OCR não é usado para contornar uma rejeição já comprovada.

## Diagnóstico de período

A RC62 tenta reconhecer o calendário da fonte antes de classificar uma falha como estrutural. Quando a escala e o espelho não se cruzam, o erro deve apresentar os intervalos reconhecidos, por exemplo:

`período da escala (01/06/2026 a 30/06/2026) não cruza o espelho (11/07/2026 a 10/08/2026)`

Isso evita que um arquivo válido de outra competência seja confundido com uma grade ilegível.

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
- o modo híbrido não é ativado em PDF comum sem evidência explícita de Escala de Folgas;
- população incompatível não é aceita para aumentar cobertura;
- turnos explícitos sem legenda não recebem horário inventado;
- período sem interseção é bloqueado;
- o gate estrutural de 95% permanece ativo;
- artefatos sintéticos continuam identificados para impedir relabeling de origem.

## Health check RC62

Por compatibilidade histórica, o objeto consolidado continua se chamando `ADERENCIA_RC50_HEALTH`.

A candidata RC62 exige:

`ADERENCIA_VERSION === 'v1.0 RC62'`

`ADERENCIA_SCHEDULE_ADAPTIVE_RC62.version` começa com `RC62`

`ADERENCIA_SCHEDULE_ADAPTIVE_RC61.version` continua começando com `RC61`

`ADERENCIA_RC50_HEALTH.ok === true`

## Testes de aceite adicionais RC62

Além de toda a suíte histórica:

1. reconhecer uma Escala de Folgas de 31 dias com poucos códigos explícitos por colaborador;
2. manter cada `F`/evento na data determinada pela coordenada original;
3. preencher dias vazios somente a partir do plano do próprio colaborador no espelho;
4. atingir cobertura completa em cenário sintético quando o espelho fornece plano suficiente;
5. reconhecer `WCA` como cargo válido nessa estrutura;
6. não habilitar modo esparso para PDF operacional comum sem evidência de Escala de Folgas;
7. diagnosticar período sem interseção com os dois intervalos;
8. manter Tesseract fora do startup;
9. manter todas as regressões RC51–RC61 verdes;
10. construir o pacote Windows somente depois de toda a suíte Playwright verde.

## Certificação e pacote

A identificação exata do commit e da execução que geraram o pacote fica em `BUILD_INFO.txt` dentro do ZIP. O workflow final produz `ADERENCIA_ESCALA_RC62_TESTE_WINDOWS.zip` e o artefato `aderencia-escala-rc62-windows`.

O ZIP deve ser validado por integridade, referências locais e coerência de versão antes de ser distribuído para novo teste manual.

## Congelamento da rodada

A RC62 é a candidata criada especificamente a partir das falhas observadas no teste manual da RC61. Novas correções posteriores devem abrir uma nova rodada identificável, preservando RC61 e RC62 no histórico de commits e Actions.
