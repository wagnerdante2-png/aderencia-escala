# Manifesto de Release — v1.0 RC64

A RC64 preserva integralmente as correções RC63/RC63.3 e fecha duas frentes: a proveniência controlada das grades digitalizadas e a nova visão mensal corporativa por regional.

## 1. Grade digitalizada: bridge de proveniência RC64

`schedule-scan-grid-rc63.js` permanece responsável pela reconstrução visual e pelas salvaguardas RC63.2. O scanner continua exigindo distribuição segura das lacunas, sem colaborador inteiro perdido, sem dia inteiro perdido, sem concentração excessiva e sem sequência superior a 7 dias sem leitura.

A RC64 acrescenta `schedule-scan-provenance-rc64.js` e validação correspondente em `engine-v3.js`.

O piso global não foi reduzido:

- Excel/XLSM/XLS normal: 95%;
- PDF textual normal: 95%;
- PDF/OCR normal: 95%;
- grade digitalizada aprovada pelo scanner, com proveniência comprovada: 92%.

Para receber o piso controlado de 92%, o engine exige simultaneamente:

1. o marker `RC63_META` existente dentro do workbook sintético;
2. proveniência efêmera criada durante o dispatch interno do scanner;
3. concordância entre cobertura e métricas estruturais do marker e do scanner;
4. `distributionSafe=true`, `blankRows=0`, `blankCols=0`, identidade >=60%, concentração por linha/dia <=50% e `maxRun<=7`;
5. cobertura >=92% e <95% com `controlled=1`.

Um XLSX enviado diretamente pelo usuário não recebe esse marker efêmero e continua sujeito a 95%, mesmo que tenha nome semelhante ou contenha uma linha `RC63_META` fabricada.

A UI mantém a origem real como `PDF digitalizado + OCR` após a conversão sintética. Quando o piso parcial controlado é utilizado, o resultado registra: `Grade digitalizada processada em cobertura parcial controlada.`

## 2. Visão Mensal RC64

`monthly-regional-rc64.js` adiciona a aba `Mensal`, sem substituir `Semestral`.

A tabela apresenta:

`Loja | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Média anual`

As lojas são agrupadas pelo `ADERENCIA_STORE_REGISTRY`. Cada regional termina com `MÉDIA DA REGIONAL` calculada somente sobre resultados elegíveis. A competência é canonicalizada por `periodStart`, seguindo a mesma regra usada no comparativo regional RC51.

Tratativas RC63 permanecem válidas:

- ML04: `INATIVA`, fora das médias;
- exceção: `EXCEÇÃO`, fora das médias;
- ausência legítima: `—`, nunca zero;
- envio após o prazo: não altera a nota;
- certificação por amostragem: não altera a nota;
- bônus/effective score: utiliza a regra vigente.

A aba possui seletor de ano, filtro opcional de regional, scroll horizontal, primeira coluna/cabeçalho sticky e exportação Excel.

## 3. Relatório de Monitoramento preservado

`monitor-report-rc63.js` permanece em `RC63.3` com:

- cabeçalho `Maravilhas do Lar`;
- logo corporativo otimizado;
- competência mês/ano;
- INATIVA;
- EXCEÇÃO;
- ENVIO APÓS O PRAZO;
- CERTIFICAÇÃO POR AMOSTRAGEM.

## 4. Health check e testes

A candidata exige:

- `ADERENCIA_VERSION === 'v1.0 RC64'`;
- `ADERENCIA_ENGINE_RC64.version === 'RC64.1'`;
- `ADERENCIA_SCAN_GRID_RC63` preservado;
- `ADERENCIA_SCAN_PROVENANCE_RC64.version === 'RC64.1'`;
- `ADERENCIA_MONTHLY_RC64.version === 'RC64.1'`;
- `ADERENCIA_OPERATIONAL_FLAGS` preservado;
- ML04 permanentemente inativa.

A suíte RC64 adiciona regressões para:

1. grade controlada a 92,5% aceita pelo gate RC64;
2. Excel a 92,5% bloqueado;
3. PDF normal a 92,5% bloqueado;
4. grade controlada abaixo de 92% bloqueada;
5. proveniência `PDF digitalizado + OCR` preservada após o bridge;
6. XLSX sem proveniência efêmera incapaz de ativar 92%;
7. aba Mensal e ano 2026;
8. valores mensais e média anual por loja;
9. ML04 INATIVA;
10. ML24 junho/julho como EXCEÇÃO;
11. média regional excluindo inativas/exceções;
12. ausência sem resultado não convertida em zero;
13. linha `MÉDIA DA REGIONAL` em cada grupo;
14. `monitor-report-rc63.js` ainda em RC63.3 e estados operacionais preservados.

## 5. Pacote

O workflow passa a produzir `ADERENCIA_ESCALA_RC64_TESTE_WINDOWS.zip` e registra no `BUILD_INFO.txt` as versões do engine, scanner, bridge de proveniência, visão mensal, tratativas e relatório.

O pacote permanece uma aplicação web local completa, iniciada por `index.html`.
