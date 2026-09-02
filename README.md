# Aderência de Escala

Aplicação web local, sem backend e sem banco externo, para calcular a aderência entre a escala planejada e o espelho de ponto.

## Entradas

1. **Espelho de ponto:** PDF mensal contendo os colaboradores da loja.
2. **Escala planejada:** `.xlsx`, `.xlsm`, `.xls` ou PDF exportado/digitalizado.

O processamento dos arquivos ocorre no navegador. A aplicação não envia os arquivos selecionados para um backend próprio.

## Regra de aderência

- usa a **primeira entrada real do dia** no espelho de ponto;
- marcações `P` pré-assinaladas não são tratadas como batida real;
- compara a primeira entrada efetiva com a **entrada prevista do turno** na escala;
- diferença de até **90 minutos**: sem penalização;
- diferença acima de **90 minutos**: penalização de **1 ponto**;
- marcação em dia previsto como `F`, `FER`, `AF`, `AB`, `AL`, `FF`, `FC`, `NC` ou `AE`: penalização de **10 pontos por colaborador/data**;
- fórmula: `1 - (desvios + 10 × não conformidades) / total de marcações consideradas`;
- o resultado visual é limitado entre 0% e 100%.

## RC61: entrada adaptativa da escala

A RC61 introduz `schedule-adaptive-rc61.js` como front-door da escala. O arquivo original é interpretado antes dos gates históricos e convertido para uma grade canônica compatível com o motor. Os módulos anteriores permanecem no runtime por compatibilidade e defesa em profundidade, mas não devem voltar a impor ao arquivo original regras que a RC61 substituiu.

A política adaptativa cobre quatro pontos centrais:

1. **Período proporcional:** o motor trabalha com as datas reais comuns entre ponto e escala. Uma escala 01→30/31 pode ser conciliada proporcionalmente com um espelho 11→10, inclusive atravessando o mês.
2. **População variável:** admissões e desligamentos podem fazer ponto e escala terem quantidades diferentes. O aceite usa a população efetivamente conciliada, sem exigir igualdade absoluta de pessoas.
3. **Turnos por versão:** códigos como `T6` são resolvidos pela legenda do próprio arquivo/modelo. O mesmo código pode ter horários diferentes em versões distintas.
4. **Identidade por conciliação:** a loja do espelho é a âncora. Nome de arquivo ou cabeçalho `MLxx` da escala não são requisitos isolados; a população/matrículas da escala precisam fornecer correspondência suficiente com o espelho.

## Competência operacional

A competência mensal continua definida pelo **início do período integral do espelho de ponto**.

- `11/06/2026 a 10/07/2026` = **Junho/2026**;
- `11/07/2026 a 10/08/2026` = **Julho/2026**;
- `11/12/2026 a 10/01/2027` = **Dezembro/2026**.

A data final da escala ou da interseção não redefine a competência.

### Cobertura temporal na RC61

A grade canônica contém apenas datas reconhecidas na escala que também pertencem ao período do espelho. A RC61 não fabrica dias ausentes e não exige um percentual fixo de 95% para PDF. O aceite depende de estrutura suficiente para formar a grade, população conciliável e resolução dos turnos utilizados.

Isso permite, por exemplo, comparar somente `11/06–30/06` quando o espelho cobre `11/06–10/07` e a escala disponível é a competência civil `01/06–30/06`.

A mesma competência canônica é propagada para Histórico, painel LED, Monitoramento, Semestral, Divergências, Evolução, processamento em lote e exportações.

## Estruturas reconhecidas

### Espelho de ponto

Procura metadados como `Espelho do Ponto`, `Matrícula`, `Nome`, `Departamento / ML`, linhas diárias e marcações efetivas `O` ou `I`. Marcações `P` são filtradas pela camada semântica e não compõem a batida real.

A loja e o período reconhecidos no ponto formam o contexto de referência da escala.

### Escala Excel/XLSM/XLS

A RC61 procura grades contendo população, datas e códigos diários. Macros não são executadas. Datas explícitas ou calendários mensais são convertidos para datas reais e intersectados com o período do ponto.

A população é conciliada por matrícula quando disponível e por nome normalizado/fuzzy quando necessário. Resíduos de template como referências antigas de outra loja não substituem uma conciliação consistente da população correta.

A legenda de turnos é extraída do próprio workbook. Se um turno usado não tiver horário resolvido nessa versão, a normalização é bloqueada em vez de assumir um horário de outra versão.

Quando existem lacunas de células no Excel e o espelho contém previsão útil para o colaborador/data, a RC61 pode usar essa previsão para preencher a grade canônica. Exceções exatas de uma data permanecem restritas àquela data.

### Escala PDF textual ou digitalizada

A RC61 tenta leitura textual primeiro. Quando a camada textual é estruturalmente insuficiente, OCR é carregado sob demanda.

Para PDF, o parser procura:

- uma grade de dias reconhecível;
- linhas de colaboradores/cargos;
- códigos de escala por dia;
- legenda dos turnos efetivamente utilizados;
- população com correspondência suficiente ao espelho.

Um cabeçalho contendo a identificação literal da loja não é obrigatório quando a origem é comprovada pela conciliação da população. Um PDF sem população compatível continua sendo rejeitado.

OCR e leitura textual passam pela mesma política de calendário, população e turnos. OCR não inventa dias, pessoas ou horários ausentes.

## Segurança e proveniência

- PDF.js é executado com `isEvalSupported=false` e scripting desabilitado pelas camadas de segurança;
- Tesseract.js não é carregado no startup; `ADERENCIA_ENSURE_OCR()` o carrega somente quando necessário;
- arquivos sintéticos gerados internamente usam identificação própria e não podem ser tratados como se fossem o arquivo original de outra loja;
- uma nova escala invalida o estado calculável anterior enquanto é processada;
- se a nova entrada falhar, o cálculo permanece desabilitado até uma escala válida ser reconhecida;
- a RC61 falha fechada quando não consegue formar uma estrutura minimamente segura ou conciliar a população.

## Health check

O health check consolidado mantém o nome histórico `ADERENCIA_RC50_HEALTH` por compatibilidade.

Para a RC61:

- `ADERENCIA_VERSION === 'v1.0 RC61'`;
- `ADERENCIA_SCHEDULE_ADAPTIVE_RC61` deve estar carregado;
- `ADERENCIA_RC50_HEALTH.ok === true` em uma inicialização válida.

## Histórico, lojas, regionais e base portátil

- histórico mensal mantido no `localStorage` como cache local;
- cadastro dinâmico de lojas e atribuição a regional;
- filtros por regional em Histórico, Monitoramento e Semestral;
- ML61 Vinhedo pertence a **GUARDIÕES DA CHAMA**;
- opção **Criar base** para gerar `aderencia-dados.json`;
- opção **Vincular base** para reutilizar a base portátil em outro computador;
- gravação automática da base vinculada após alterações persistentes;
- histórico, divergências, configuração administrativa e cadastro de lojas/regionais fazem parte da base portátil;
- monitoramento baseado nas lojas cadastradas;
- visão semestral, recorrência e evolução;
- relatórios PDF e exportação Excel do monitoramento mensal;
- backup/restauração manual disponível como contingência.

## Processamento em lote

A aba de lote reutiliza os mesmos inputs e o mesmo motor da análise individual. Cada par de arquivos é processado sequencialmente; erros de leitura, população, período ou estrutura interrompem apenas aquela linha.

## Executar localmente no Windows

1. Baixe `ADERENCIA_ESCALA_RC61_TESTE_WINDOWS.zip`.
2. Extraia integralmente a pasta.
3. Abra `index.html` com duplo clique.
4. Preferencialmente use Microsoft Edge ou Google Chrome atualizado.
5. Clique em **Criar base** na primeira utilização e salve `aderencia-dados.json` junto da aplicação.
6. Carregue primeiro o espelho de ponto e aguarde o reconhecimento da loja/período.
7. Depois carregue a escala planejada e calcule somente quando a leitura estiver reconhecida.

Não é necessário Git, Python, PowerShell, Codespaces ou servidor local.

## Dependências externas

No startup são carregados por CDN PDF.js, SheetJS/XLSX e jsPDF. **Tesseract.js 5.x é carregado somente sob demanda**, quando OCR é necessário. A aplicação processa os arquivos localmente, mas precisa de conexão com a internet para obter dependências CDN que ainda não estejam disponíveis no navegador.

## Versão

Candidata operacional atual: **v1.0 RC61**.

A esteira GitHub Actions executa a suíte Playwright completa antes de construir e publicar o pacote Windows de teste.
