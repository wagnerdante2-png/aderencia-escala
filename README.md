# Aderência de Escala

Aplicação web local, sem backend e sem banco externo, para calcular a aderência entre a escala planejada e o espelho de ponto.

## Entradas

1. **Espelho de ponto:** PDF mensal contendo os colaboradores da loja.
2. **Escala planejada:** preferencialmente `.xlsx`, `.xlsm` ou `.xls`; PDF exportado da Escala Operacional é aceito como contingência.

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

Antes de liberar o cálculo, as camadas de leitura podem bloquear a escala quando loja, período, estrutura, colaboradores ou legenda de turnos não possuem evidência suficiente.

## Competência operacional

A competência mensal é definida pelo **início do período integral do espelho de ponto**.

- `11/06/2026 a 10/07/2026` = **Junho/2026**;
- `11/07/2026 a 10/08/2026` = **Julho/2026**;
- `11/12/2026 a 10/01/2027` = **Dezembro/2026**.

A data final da escala ou da interseção não redefine a competência.

### Cobertura temporal: regra por fonte

O motor final trabalha sobre a interseção entre datas válidas do ponto e da escala, mas as camadas de pré-validação não são igualmente permissivas para todas as fontes:

- **Excel/XLSM/XLS:** o pré-processamento tenta normalizar a grade contra a competência do espelho. Se a normalização segura não se aplica, o arquivo pode seguir para o parser principal. Quando esse parser reconhece a estrutura com segurança, o cálculo final usa a interseção disponível.
- **PDF de escala RC57:** é contingência fail-closed. A matriz precisa cobrir pelo menos **95% da competência do espelho**, sem fabricar datas ausentes. Cobertura inferior é bloqueada antes do cálculo.

Portanto, “escala parcial” não é uma autorização universal: a aceitação depende da fonte e das evidências estruturais encontradas.

A mesma competência canônica é propagada para Histórico, painel LED, Monitoramento, Semestral, Divergências, Evolução, processamento em lote e exportações.

## Competência global

O seletor superior de **Mês / Ano** é a referência temporal das visualizações. Ele sincroniza Histórico, Monitoramento, Divergências, Evolução, painel LED, Semestral pelo ano e relatórios relacionados.

No momento de salvar uma análise, a competência apurada pelo espelho prevalece sobre o período que estivesse sendo apenas visualizado.

## Estruturas reconhecidas

### Espelho de ponto

Procura os metadados `Espelho do Ponto`, `Matrícula`, `Nome`, `Departamento / ML`, as linhas diárias e as marcações efetivas `O` ou `I`. Marcações `P` são filtradas pela camada semântica e não compõem a batida real.

A loja do ponto é a âncora de identidade usada para validar a escala.

### Escala Excel/XLSM/XLS

É a fonte preferencial. O motor procura grades operacionais, identifica `Nome`, `Cargo`, datas, códigos diários (`T1`, `T2`, `F`, `FER`, `AF` etc.) e a legenda de turnos (`Txx | hh:mm às hh:mm`). Macros não são executadas.

As camadas RC51/RC52/RC53 tratam estruturas alternativas, grades mensais e normalizações, preservando a loja e a competência já reconhecidas no espelho. O guard RC55 impede que uma grade sintética seja relabelada para outra loja.

### Escala PDF — RC57

PDF é uma contingência e recebe validações adicionais:

1. o cabeçalho da primeira página precisa confirmar a mesma loja do espelho;
2. `MLxx` tem prioridade sobre `LOJA xx`; cabeçalho ambíguo é bloqueado;
3. a camada textual é tentada primeiro;
4. se o cabeçalho não tiver texto suficiente, OCR é carregado sob demanda apenas para validar o topo da primeira página;
5. se a leitura textual da grade falhar por insuficiência estrutural, o PDF inteiro pode ser lido por OCR;
6. as coordenadas obtidas por OCR passam pelo **mesmo parser rígido** usado na leitura textual;
7. OCR não é usado para contornar loja divergente, cobertura temporal insuficiente ou turno sem horário;
8. a matriz PDF validada é convertida em um XLSX sintético `PDF_GRID_RC57_MLxx.xlsx` antes de seguir para o motor.

O OCR é contingência, não primeira opção.

## Segurança e qualidade da leitura

- PDF.js é executado com `isEvalSupported=false` e scripting desabilitado pelas camadas de segurança;
- Tesseract.js não é carregado no startup; `ADERENCIA_ENSURE_OCR()` o carrega somente quando necessário;
- a leitura PDF exige identidade de loja, alinhamento temporal, quantidade mínima de colaboradores e resolução da legenda de turnos;
- datas ausentes no PDF RC57 não são inferidas para completar artificialmente a competência;
- ao selecionar um novo PDF, o estado anterior da escala é invalidado antes da nova validação, evitando reutilizar silenciosamente uma escala antiga após bloqueio.

## Diagnóstico estrutural

A aplicação mantém informações de diagnóstico da leitura sem alterar a fórmula de aderência. Para o parser PDF RC57, `ADERENCIA_PDF_DEBUG_RC28` preserva o nome legado do objeto de debug, mas registra a versão efetiva, fonte textual/OCR, loja, período, cobertura e demais evidências do parser atual.

O health check consolidado continua disponível em `ADERENCIA_RC50_HEALTH` por compatibilidade histórica. Em uma inicialização válida da RC57, `ADERENCIA_RC50_HEALTH.ok` deve ser `true`.

## Histórico, lojas, regionais e base portátil

- histórico mensal mantido no `localStorage` como cache local;
- cadastro dinâmico de lojas sem necessidade de alteração do código;
- atribuição de cada loja a uma regional;
- filtros por regional em Histórico, Monitoramento e Semestral;
- ML61 Vinhedo pertence a **GUARDIÕES DA CHAMA**;
- opção **Criar base** para gerar `aderencia-dados.json`;
- opção **Vincular base** para usar uma base portátil existente em outro computador;
- gravação automática da base vinculada após alterações persistentes;
- histórico, divergências, configuração administrativa e cadastro de lojas/regionais fazem parte da base portátil;
- monitoramento baseado nas lojas cadastradas, sem quantidade fixa de unidades;
- visão semestral, recorrência e evolução;
- relatórios PDF e exportação Excel do monitoramento mensal;
- backup/restauração manual continua disponível como contingência.

## Processamento em lote

A aba de lote reutiliza os mesmos inputs e o mesmo motor da análise individual. Cada par de arquivos é processado sequencialmente; erros de leitura, loja ou período interrompem apenas aquela linha. Assim, os gates RC51–RC57 também se aplicam ao lote.

## Executar localmente

1. Baixe o pacote em ZIP.
2. Extraia a pasta.
3. Abra `index.html` com duplo clique.
4. Preferencialmente use Microsoft Edge ou Google Chrome atualizado.
5. Clique em **Criar base** na primeira utilização e salve `aderencia-dados.json` junto da aplicação.
6. Carregue primeiro o espelho de ponto e aguarde o reconhecimento da loja/período.
7. Depois carregue a escala planejada e calcule somente quando a leitura estiver reconhecida.

Não é necessário Git, Python, PowerShell, Codespaces ou servidor local.

## Dependências externas

No startup são carregados por CDN PDF.js, SheetJS/XLSX e jsPDF. **Tesseract.js 5.x é carregado somente sob demanda**, quando o OCR é realmente necessário. Por isso, a aplicação processa os arquivos localmente, mas precisa de conexão com a internet para obter as dependências que ainda não estejam disponíveis no navegador.

## Versão

Candidata operacional atual: **v1.0 RC57**.

A esteira E2E certifica a inicialização, integridade, navegação e regressões funcionais da candidata antes de uma rodada ser considerada concluída.
