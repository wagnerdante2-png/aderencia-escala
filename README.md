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

## RC62: correções oriundas do teste operacional real

A RC62 acrescenta `schedule-adaptive-rc62.js` antes da camada RC61. Ela trata especificamente os formatos que o teste manual revelou como lacunas, preservando o parser RC61 para os casos já certificados.

### Escala de Folgas esparsa

Arquivos explicitamente identificados como **Escala de Folgas** podem apresentar muitos dias de trabalho em branco e materializar apenas folgas, férias, afastamentos ou alterações de turno. Nesse formato, baixa densidade de códigos não significa automaticamente arquivo inválido.

A RC62:

1. identifica a grade pelos dias e pelas coordenadas das células;
2. preserva `F`, `FER`, `AF` e demais códigos exatamente na data em que aparecem;
3. concilia os colaboradores da escala com o espelho;
4. para células vazias, consulta somente o quadro **Horários** do próprio colaborador no espelho de ponto;
5. reutiliza um turno da legenda quando o horário coincide ou cria um código técnico interno para transportar aquele horário ao motor;
6. nunca inventa horário nem copia turno de outro colaborador;
7. reconhece também `WCA` como cargo válido nessa estrutura.

O preenchimento híbrido não é aplicado a um PDF comum por mera suspeita: exige evidência explícita de **Escala de Folgas**.

### Cobertura estrutural continua fail-closed

A RC62 não usa um limite fixo de 95% de **cobertura temporal** para decidir se um PDF pode ser lido. A análise continua proporcional à interseção válida entre as datas do ponto e da escala.

Entretanto, o motor mantém o gate de **95% de cobertura estrutural** entre as marcações dos colaboradores conciliados. Na Escala de Folgas, esse percentual é avaliado depois da recomposição segura dos dias vazios pelo quadro Horários. Se ainda faltarem dados suficientes, o resultado permanece bloqueado. A RC62 corrige a origem da baixa cobertura sem retirar a proteção.

### PDF digitalizado e orientação

A leitura textual é tentada primeiro. Quando o PDF não possui camada de texto útil, a RC62 usa OCR sob demanda e pode tentar as orientações **0°, 90°, 270° e 180°**. Isso cobre PDFs-imagem exportados ou armazenados de lado sem tornar OCR uma dependência de startup.

Quando uma orientação revela uma condição semântica conclusiva — como período sem interseção, população incompatível ou turno explícito sem legenda — o processamento falha fechado e não continua tentando outras leituras para contornar a rejeição.

### Período incompatível

A RC62 procura reconhecer o calendário da escala antes de concluir que a grade falhou. Se escala e espelho não tiverem qualquer interseção, a mensagem informa os dois intervalos em vez de retornar genericamente "grade Nome × Dias não pôde ser reconhecida".

## Política adaptativa preservada da RC61

A RC61 continua responsável pelos formatos que já estavam certificados:

- período proporcional entre escala civil 01→30/31 e espelho 11→10;
- população variável por admissões e desligamentos;
- turnos resolvidos pela legenda da própria versão do arquivo;
- conciliação por matrícula/nome, sem exigir igualdade absoluta de pessoas;
- preenchimento seguro de lacunas de Excel quando o quadro Horários do espelho fornece a previsão;
- PDF textual denso e PDF OCR quando a estrutura é reconhecível.

## Competência operacional

A competência mensal é definida pelo **início do período integral do espelho de ponto**.

- `11/06/2026 a 10/07/2026` = **Junho/2026**;
- `11/07/2026 a 10/08/2026` = **Julho/2026**;
- `11/12/2026 a 10/01/2027` = **Dezembro/2026**.

A data final da escala ou da interseção não redefine a competência. A mesma referência é propagada para Histórico, painel LED, Monitoramento, Semestral, Divergências, Evolução, lote e exportações.

## Segurança e proveniência

- PDF.js é executado com `isEvalSupported=false` e scripting desabilitado;
- Tesseract.js não é carregado no startup;
- arquivos sintéticos internos têm identificação própria e não podem ser tratados como o arquivo original de outra loja;
- a loja do espelho é a âncora de identidade;
- população incompatível, período sem interseção e turnos explícitos sem legenda são condições de bloqueio;
- uma nova escala invalida o estado calculável anterior enquanto é processada;
- o gate estrutural de 95% continua ativo após a reconciliação.

## Health check

O objeto consolidado mantém o nome histórico `ADERENCIA_RC50_HEALTH` por compatibilidade.

Para a RC62:

- `ADERENCIA_VERSION === 'v1.0 RC62'`;
- `ADERENCIA_SCHEDULE_ADAPTIVE_RC62.version` deve iniciar com `RC62`;
- `ADERENCIA_SCHEDULE_ADAPTIVE_RC61` permanece carregado como camada compatível;
- `ADERENCIA_RC50_HEALTH.ok === true` em uma inicialização válida.

## Histórico, lojas, regionais e base portátil

- histórico mensal em `localStorage` como cache local;
- cadastro dinâmico de lojas e atribuição a regional;
- filtros por regional;
- base portátil `aderencia-dados.json` com criação, vínculo e gravação autorizada;
- histórico, divergências, configuração administrativa e cadastro de lojas/regionais na base portátil;
- monitoramento, visão semestral, recorrência, evolução e exportações.

## Executar localmente no Windows

1. Baixe `ADERENCIA_ESCALA_RC62_TESTE_WINDOWS.zip`.
2. Extraia integralmente a pasta.
3. Abra `index.html` com duplo clique.
4. Preferencialmente use Microsoft Edge ou Google Chrome atualizado.
5. Carregue primeiro o espelho de ponto e aguarde loja/período.
6. Depois carregue a escala planejada.
7. Calcule somente quando a escala estiver reconhecida.

Não é necessário Git, Python, PowerShell, Codespaces ou servidor local.

## Dependências externas

No startup são carregados por CDN PDF.js, SheetJS/XLSX e jsPDF. **Tesseract.js 5.x é carregado somente sob demanda** quando OCR é necessário. É necessária conexão para obter dependências CDN ainda não disponíveis no navegador.

## Versão

Candidata operacional atual: **v1.0 RC62**.

A esteira GitHub Actions executa a suíte Playwright completa, incluindo regressões da Escala de Folgas, antes de construir e publicar o pacote Windows de teste.
