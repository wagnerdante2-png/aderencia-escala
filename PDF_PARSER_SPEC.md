# Especificação do parser de escalas PDF — RC58

## Objetivo

Transformar uma escala PDF em uma matriz determinística `Loja × Colaborador × Cargo × Data × Código`, compatível com a estrutura lógica usada pelo fluxo Excel. O PDF não deve produzir percentual de aderência quando a matriz não puder ser reconstruída com evidências estruturais suficientes.

Esta especificação descreve o contrato operacional da RC58. Referências geométricas usadas em estudos e RCs anteriores permanecem úteis como material histórico, mas não são parâmetros fixos do parser atual.

## Ordem de recuperação

A recuperação estrutural `schedule-recovery-r3.js` é carregada antes dos parsers PDF legados. O módulo R2 permanece aposentado do runtime ativo.

Para PDF, a aplicação prioriza recuperação determinística por camada textual e geometria. O parser principal expõe `ADERENCIA_PDF_PARSER_VERSION === 'RC58'`. O parser RC57 permanece abaixo dele apenas como camada compatível e não deve assumir o evento quando o RC58 já estiver ativo.

## Contexto obrigatório do espelho

Antes de transformar uma escala PDF, o parser precisa conhecer a competência do espelho de ponto. A preferência é pelo contexto já validado em `ADERENCIA_POINT_CONTEXT`; como contingência, o período pode ser relido do próprio PDF do espelho.

Quando existe loja validada no espelho, uma identificação explícita divergente no PDF da escala deve bloquear a leitura. O parser não deve escolher silenciosamente outra loja.

## Loja

A identificação considera ocorrências explícitas como `MLxx` e `LOJA xx`, inclusive pistas do nome do arquivo. Quando o espelho já fornece uma loja confiável, ela é a referência para validação cruzada.

## Grade de dias

O parser agrupa números inteiros de 1 a 31 pela coordenada vertical e procura uma sequência horizontal estruturalmente plausível.

A grade candidata é avaliada por:

- quantidade de colunas recuperadas;
- sequência cronológica, incluindo viradas como `31 → 1`;
- regularidade do espaçamento horizontal;
- alinhamento posterior com o período real do espelho.

Não existe uma coordenada X fixa válida para todas as escalas. Centros de coluna e espaçamento são calculados a partir do próprio PDF.

## Datas reais e competência parcial

O conjunto temporal permitido vem do período do espelho. A grade do PDF é alinhada contra esse conjunto.

Quando o cabeçalho do PDF fornece mês e ano, essa informação é usada para construir as datas candidatas e manter somente aquelas que pertencem à competência esperada. Quando o calendário explícito não é suficiente, o parser procura o grupo mensal do período do espelho que melhor explica os números observados.

A análise pode ser proporcional. Exemplo:

- espelho: `11/06/2026 a 10/07/2026`;
- escala disponível: `01/06/2026 a 30/06/2026`;
- interseção utilizável: `11/06/2026 a 30/06/2026`.

Dias ausentes não entram automaticamente na matriz. Datas não devem ser inventadas para completar o ciclo.

## Colaborador e cargo

A RC58 usa o roster reconhecido no espelho para reforçar a identidade dos colaboradores da escala.

O fluxo suporta:

- nome e cargo na mesma linha;
- nomes fragmentados;
- aproximação por tokens quando a grafia da escala e do espelho divergem moderadamente;
- páginas de continuação em que a identidade pode precisar ser carregada pela ordem validada de colaboradores;
- layouts sem cabeçalho convencional `Nome`, quando a estrutura e o roster oferecem evidência suficiente.

Quando há roster disponível, linhas que não podem ser conciliadas com evidência mínima não devem ser promovidas como colaboradores válidos apenas para aumentar a cobertura.

## Códigos por célula

São reconhecidos turnos `T1` a `T30` e códigos de folga/ausência usados pelo motor, incluindo `F`, `FER`, `AF`, `AB`, `AL`, `FF`, `FC`, `NC`, `AE` e `D`.

Um mesmo item textual do PDF pode conter vários códigos. A RC58 tokeniza esses itens e distribui representações virtuais ao longo da largura do item antes de associá-los às colunas da grade. Isso evita perder códigos compactados pelo mecanismo de geração do PDF.

Tokens fora da área geométrica da grade não devem ser tratados como células de colaborador, reduzindo o risco de confundir a legenda lateral com a escala.

## Leitura espacial e linear

Para cada página utilizável, a RC58 compara duas estratégias:

1. **espacial** — associa tokens às colunas pela proximidade da coordenada X;
2. **linear** — usa a sequência textual de códigos quando a linha foi extraída de forma mais consistente pelo PDF.js.

A estratégia com maior evidência estrutural para aquela página é escolhida. As páginas são depois consolidadas por identidade do colaborador e data.

## Consolidação entre páginas

As fatias reconhecidas são consolidadas em uma matriz única. Para a mesma pessoa/data, o primeiro valor estruturalmente aceito é preservado; páginas posteriores complementam datas ausentes.

A recuperação R3 trata também casos de divisão horizontal de uma grade mensal e pode carregar a identidade do roster para uma página de continuação quando a quantidade e a ordem das linhas são compatíveis.

## Legenda de turnos

A legenda é extraída por padrões de turno e horário, por exemplo `T1 | 08:00 às 17:00`.

A RC58 informa os turnos usados na matriz que não possuem horário resolvido. Horários ausentes não são inventados. A existência de turno sem legenda deve permanecer visível no diagnóstico e pode impedir etapas posteriores que dependam do horário previsto.

## Densidade e sanidade estrutural

A RC58 não considera somente “há algum texto”. Ela mede se a matriz possui densidade suficiente para representar uma escala real.

Depois de consolidar os colaboradores:

- datas com cobertura extremamente baixa são removidas da amostra operacional;
- se nenhuma data possuir cobertura mínima, a leitura é bloqueada;
- a densidade global é calculada como células codificadas ÷ (`colaboradores × datas`);
- amostra PDF com densidade inferior ao limite do parser é rejeitada em vez de gerar percentual silencioso.

A camada `result-integrity-rc58.js` acrescenta sanidade ao resultado final. Um zero plausível continua sendo um resultado válido; somente um zero associado a amostra estruturalmente anormal deve ser tratado como suspeito.

## Diagnóstico RC58

O parser publica `window.ADERENCIA_PDF_DEBUG_RC58`.

Em sucesso, o diagnóstico inclui, conforme disponível:

- versão;
- loja;
- quantidade de colaboradores;
- quantidade de nomes reconhecidos no espelho;
- dias calculados e dias esperados;
- cobertura temporal;
- densidade de células;
- datas ausentes;
- turnos sem horário;
- auditoria por página e método usado.

Em erro, `ADERENCIA_PDF_DEBUG_RC58` registra a versão e a mensagem que bloqueou a leitura.

Quando a conversão é aceita, `ADERENCIA_PDF_GRID_INFO` registra metadados resumidos da grade sintética criada para o restante da aplicação.

## Saída sintética

Uma escala PDF aceita é convertida em XLSX sintético com aba `Escala Ponto`. Essa etapa permite reutilizar as camadas de validação e cálculo do fluxo Excel em vez de manter uma segunda fórmula de aderência para PDF.

A saída contém:

- loja;
- identificação de que a origem foi estruturada pelo parser RC58;
- quantidade de dias disponíveis e esperados;
- densidade estrutural;
- `Nome`, `Cargo` e datas reconhecidas;
- códigos diários;
- legenda de turnos extraída.

## OCR

OCR é contingência explícita sob demanda e não faz parte do startup normal. A camada `ocr-lazy-rc48.js` disponibiliza `ADERENCIA_ENSURE_OCR()` para carregamento do Tesseract quando necessário.

A RC58 não deve ser descrita como “OCR integralmente offline” apenas porque o pacote Portable inclui `tesseract.min.js`: worker, core e dados de idioma podem ser necessários quando o OCR for efetivamente acionado.

O caminho homologado deve preferir PDF com camada textual ou Excel/XLSM/XLS sempre que possível. OCR não deve ser usado para mascarar uma estrutura ambígua e produzir um percentual sem evidência suficiente.

## Segurança

As leituras de PDF usam PDF.js com execução dinâmica endurecida. O runtime de segurança mantém `isEvalSupported=false` e `enableScripting=false` no fluxo protegido.

## Critérios de aceite RC58

1. `ADERENCIA_PDF_PARSER_VERSION` deve ser `RC58`.
2. A recuperação R3 deve estar ativa antes do parser RC58 e o R2 deve permanecer inativo.
3. Loja explicitamente divergente do espelho deve bloquear a escala.
4. Datas devem permanecer dentro da competência/interseção validada.
5. Escala parcial válida deve ser aceita proporcionalmente sem inventar dias ausentes.
6. Nomes fragmentados devem poder ser conciliados pelo roster do espelho quando houver evidência suficiente.
7. Página de continuação horizontal deve preservar a identidade dos colaboradores quando a estrutura for compatível.
8. Itens textuais contendo vários códigos devem preservar todos os códigos reconhecíveis.
9. Legenda lateral não deve virar célula da grade.
10. Amostra estruturalmente esparsa deve ser bloqueada ou sinalizada, nunca convertida silenciosamente em resultado confiável.
11. Zero estruturalmente plausível deve continuar válido; zero falso por amostra anormal deve ser sinalizado.
12. `ADERENCIA_PDF_DEBUG_RC58` deve explicar a leitura aceita ou a causa do bloqueio.
13. A saída PDF aceita deve ser convertida em XLSX sintético e passar pelas mesmas camadas canônicas usadas pelo restante da aplicação.
14. A suíte Playwright RC58 e o build Portable RC58 devem permanecer verdes antes de promoção da branch.
