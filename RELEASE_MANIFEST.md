# Manifesto de Release — v1.0 RC63

A RC63 consolida a última pendência conhecida de leitura — escalas operacionais digitalizadas em forma de grade — e acrescenta controles operacionais por loja e competência sem alterar a fórmula de aderência.

## Escopo da RC63

1. fallback visual dedicado a PDF de escala digitalizada sem camada textual utilizável;
2. reconstrução da grade por geometria, sem depender da leitura OCR dos números 1–30/31;
3. OCR por linha de colaborador em resolução ampliada;
4. conciliação conservadora de nomes com o espelho de ponto;
5. preenchimento de lacunas somente quando turno da legenda, plano do próprio colaborador e padrão da linha são coerentes;
6. gate estrutural de 95% preservado;
7. tratativas operacionais por loja + mês + ano;
8. exceção justificada fora do denominador da rede;
9. selo vermelho `ENVIO APÓS O PRAZO`, sem redução da nota;
10. selo verde `CERTIFICADO POR AMOSTRAGEM`, sem alteração da nota;
11. ML04 permanentemente inativa e bloqueada para salvamento de aderência;
12. ML24 junho/2026 e julho/2026 pré-cadastradas como exceção por reconstrução após sinistro.

## Grade digitalizada RC63.1

`schedule-scan-grid-rc63.js` é carregado antes do front-door RC62 e só assume PDFs de uma página cuja camada textual seja praticamente inexistente. PDFs textuais ou formatos já reconhecidos seguem para o pipeline existente.

A reconstrução visual:

- testa rotações 90°, 270°, 0° e 180°;
- renderiza a página em escala 3;
- detecta linhas horizontais e verticais pela projeção de pixels escuros;
- identifica a sequência regular de colunas do calendário;
- reconhece mês e ano por token completo;
- executa OCR da legenda e OCR individual das linhas de colaboradores;
- amplia as linhas antes do OCR para preservar nomes, cargos e códigos;
- normaliza confusões recorrentes como `718 → T18`, `TI8 → T18`, `13 → T13`, `TG → T6` e leituras degradadas de `F`;
- cruza a população com o espelho usando a ponte de identidade OCR já existente.

Uma célula não reconhecida não é preenchida livremente. A RC63 só recupera uma célula quando:

1. a área visual não indica uma exceção escura;
2. o quadro Horários do próprio colaborador fornece um plano;
3. esse plano corresponde a um turno existente na legenda da própria escala;
4. o turno é coerente com vizinhos iguais ou com o turno dominante já reconhecido naquela linha.

Se a cobertura estrutural final ficar abaixo de 95%, a escala continua bloqueada.

## Tratativas operacionais

`operational-flags-rc63.js` mantém registros por `loja + competência` em `aderenciaOperationalFlagsV1`.

### Exceção de aderência

Uma exceção exige justificativa. A loja/competência recebe selo azul `EXCEÇÃO`, não entra na média, não entra nas faixas verde/amarela/vermelha e não é contada como `Sem resultado`.

Foram semeadas inicialmente:

- ML24 — junho/2026;
- ML24 — julho/2026;

com a justificativa `Loja em reconstrução após sinistro — sem atividade operacional.`

### Envio após o prazo

Aplica o selo vermelho `ENVIO APÓS O PRAZO`. É um registro de disciplina operacional e não modifica a nota de aderência.

### Certificação por amostragem

Aplica o selo verde `CERTIFICADO POR AMOSTRAGEM` após validação manual. Também não modifica a nota.

### Loja inativa

ML04 é permanentemente inativa. O card apresenta `INATIVA`, não participa de média/denominadores e o salvamento de resultado é bloqueado mesmo se houver um valor histórico incorreto.

## Interface

O botão `Tratativas` abre um modal com listas de Loja, Mês e Ano e os três controles operacionais. Um card da aba Monitoramento também pode abrir a tratativa já selecionando aquela loja e competência.

## Base portátil

A base portátil sobe para formato 4 e passa a persistir `operationalFlags`. Bases antigas continuam aceitas; ao carregar uma base RC63, as tratativas são restauradas junto do histórico, cadastro de lojas e divergências.

## Compatibilidade preservada

Continuam válidas as camadas RC51–RC62.1, incluindo:

- competência 11→10 ancorada no início do espelho;
- leitura Excel/XLSM/XLS;
- PDF textual e PDF de Escala de Folgas;
- inferência de mês por token completo;
- proveniência e identidade de loja;
- conciliação de população;
- legenda própria de turnos;
- gate estrutural de 95%;
- Tesseract carregado apenas sob demanda.

## Health check RC63

A candidata exige:

- `ADERENCIA_VERSION === 'v1.0 RC63'`;
- `ADERENCIA_SCAN_GRID_RC63.version === 'RC63.1'`;
- `ADERENCIA_OPERATIONAL_FLAGS.version === 'RC63.0'`;
- `ADERENCIA_OPERATIONAL_FLAGS.isInactive('ML04') === true`;
- `ADERENCIA_SCHEDULE_ADAPTIVE_RC62.version === 'RC62.1'`;
- `ADERENCIA_SCHEDULE_ADAPTIVE_RC61.version === 'RC61.1'`;
- `ADERENCIA_RC50_HEALTH.ok === true`.

## Testes adicionais

A RC63 adiciona regressões para:

1. ML24 junho/julho como exceção inicial;
2. exceção fora da nota e do denominador;
3. envio tardio e certificação sem alteração da nota;
4. selos visíveis nos cards;
5. ML04 sempre inativa, mesmo diante de resultado histórico artificial;
6. modal de tratativas por loja/mês/ano;
7. normalização conservadora de códigos OCR;
8. `MARCOLINO` não confundido com `MARÇO`;
9. reconstrução geométrica de calendário sem OCR dos números dos dias;
10. toda a suíte histórica RC51–RC62.1.

## Pacote

O workflow produz `ADERENCIA_ESCALA_RC63_TESTE_WINDOWS.zip`. O `BUILD_INFO.txt` registra commit, workflow, `scan_grid=RC63.1`, `operational_flags=RC63.0`, RC62.1 e RC61.1.

A RC63 só deve ser considerada certificada quando a suíte Playwright concluir verde. Caso a infraestrutura do GitHub Actions não atribua runner, isso deve ser registrado separadamente e não confundido com falha funcional da aplicação.
