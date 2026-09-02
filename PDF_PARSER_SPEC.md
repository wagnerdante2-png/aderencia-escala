# Especificação operacional do parser de escalas PDF — RC57

## Objetivo

Transformar uma escala PDF em uma matriz determinística `Loja × Colaborador × Cargo × Data × Código` antes que qualquer percentual de aderência seja liberado.

A RC57 é deliberadamente **fail-closed**: se loja, grade, período, cobertura ou legenda de turnos não puderem ser demonstrados com evidência suficiente, o PDF é bloqueado.

## Âncora obrigatória: espelho de ponto

O parser PDF não trabalha isoladamente. Antes de ler a escala, precisa existir um contexto validado do espelho contendo:

- loja;
- início da competência;
- fim da competência.

A loja e o período do espelho são as âncoras contra as quais a escala é validada.

## 1. Identidade de loja no cabeçalho

O módulo `pdf-store-header-guard-rc57.js` inspeciona primeiro o topo da primeira página.

Prioridade:

1. `MLxx`;
2. `LOJA xx` quando não existe `MLxx` no cabeçalho.

Regras:

- dois códigos `MLxx` diferentes no cabeçalho tornam o PDF ambíguo e bloqueado;
- a loja encontrada precisa ser exatamente a mesma loja já reconhecida no espelho;
- nome do arquivo não substitui a identidade do cabeçalho;
- ocorrências secundárias fora do cabeçalho não são a âncora de identidade.

Se a camada textual do cabeçalho não trouxer loja suficiente, o guard pode carregar OCR sob demanda e reconhecer apenas a região superior da primeira página. Mesmo nesse caso a loja precisa coincidir com a do espelho.

## 2. Extração textual primária

Depois do gate de loja, `pdf-schedule-parser-rc57.js` tenta a camada textual do PDF.

Para cada página são obtidos tokens com:

- texto;
- coordenada X;
- coordenada Y;
- largura aproximada.

Os tokens são agrupados em linhas por proximidade vertical. A geometria continua sendo a referência para posicionar células na grade.

## 3. Detecção da grade de dias

O parser procura grupos horizontais contendo números de `1` a `31`.

Uma candidata precisa:

- ter pelo menos 20 colunas de dia;
- apresentar sequência temporal coerente, incluindo a virada `28/29/30/31 → 1`;
- apresentar espaçamento horizontal suficientemente regular.

A pontuação combina coerência da sequência e regularidade geométrica. Grades abaixo do limiar não são usadas.

## 4. Alinhamento temporal com a competência

A lista esperada de datas vem do período já validado no espelho.

Quando o PDF contém mês/ano explícitos, os números das colunas são convertidos para datas desse calendário e somente datas que realmente pertencem à competência do espelho são alinhadas.

Quando não existe calendário explícito utilizável, os números dos dias são alinhados sequencialmente contra os dias esperados do espelho, sem criar datas que não estejam na fonte.

A data encontrada no nome do arquivo é apenas diagnóstico de fechamento; ela não substitui a evidência temporal da grade.

## 5. Nome, cargo e códigos por célula

Códigos reconhecidos:

- turnos: `T1` a `T30`;
- folga/ausência: `F`, `FER`, `AF`, `AB`, `AL`, `FF`, `FC`, `NC`, `AE`;
- flexível: `D`.

O parser executa duas leituras complementares:

### Geometria

- define os centros X das colunas de dia;
- associa cada token de código à coluna mais próxima;
- lê nome/cargo à esquerda da grade;
- descarta tokens fora da área temporal.

### Linha textual

- lê os tokens sequenciais da linha;
- separa prefixo de nome/cargo da sequência de códigos;
- produz uma segunda matriz para comparação.

Quando existem colaboradores em comum nas duas leituras, a concordância célula a célula é medida. A geometria permanece a referência principal, mas a leitura linear pode ser usada quando apresenta evidência melhor sob as regras do parser.

## 6. Cobertura temporal obrigatória

Para PDF RC57, a grade alinhada precisa cobrir pelo menos **95% das datas da competência do espelho**.

Se a cobertura ficar abaixo desse limite:

- o PDF é bloqueado;
- os dias faltantes são informados no diagnóstico quando disponíveis;
- nenhuma data ausente é inferida para completar artificialmente a competência.

Isso significa que a política efetiva do PDF é mais rígida que o motor final de interseção usado por outras fontes.

## 7. Legenda de turnos

A legenda é extraída por padrões equivalentes a `Txx | HH:MM às HH:MM`.

Antes de gerar a matriz final:

- todos os turnos `Txx` usados pelos colaboradores são listados;
- cada turno utilizado precisa possuir horário reconhecido na legenda;
- qualquer turno utilizado sem horário bloqueia o PDF.

OCR não é acionado para contornar uma falha de legenda já comprovada.

## 8. OCR contingencial

OCR é segunda extração, nunca primeira escolha para a grade completa.

A RC57 permite OCR integral somente quando a leitura textual falha por **insuficiência estrutural da grade**. Há também uma exceção controlada quando o cabeçalho já foi previamente confirmado por OCR e a camada textual completa não consegue reiterar a loja.

Fluxo:

1. carregar Tesseract.js 5.x via `ADERENCIA_ENSURE_OCR()`;
2. renderizar cada página em escala ampliada;
3. reconhecer palavras e suas caixas delimitadoras;
4. converter as caixas para o mesmo sistema de coordenadas usado pelo parser textual;
5. reconstruir linhas;
6. executar novamente **a mesma função de parsing e os mesmos gates** de loja, período, grade, cobertura e legenda.

OCR **não é elegível** como segunda tentativa para:

- loja comprovadamente divergente;
- cobertura temporal inferior a 95%;
- turno utilizado sem horário na legenda.

Portanto, OCR aumenta a capacidade de extração, mas não reduz a exigência de evidência.

## 9. Conversão para XLSX sintético

Depois que o PDF passa por todos os gates, a matriz é convertida em um arquivo sintético:

`PDF_GRID_RC57_MLxx.xlsx`

Esse arquivo contém:

- loja confirmada;
- datas alinhadas;
- Nome;
- Cargo;
- códigos diários;
- legenda de turnos.

O XLSX sintético segue para as mesmas camadas posteriores do motor. O guard de proveniência RC55 impede que uma grade sintética de uma loja seja relabelada para outra.

## 10. Invalidação de estado antigo

Ao selecionar um novo PDF de escala, o guard RC57 invalida o estado interno da escala anterior antes de validar o novo arquivo.

Se o novo PDF for bloqueado:

- o resultado anterior fica oculto;
- o botão de cálculo permanece desabilitado;
- a escala anterior não pode ser reutilizada silenciosamente.

## 11. Segurança de PDF

As chamadas PDF.js usadas pela RC57 mantêm:

- `isEvalSupported=false`;
- scripting desabilitado.

Tesseract.js permanece fora do startup normal e só é carregado quando o OCR é realmente necessário.

## 12. Diagnóstico

Por compatibilidade histórica, o objeto de debug continua usando o nome `ADERENCIA_PDF_DEBUG_RC28`, porém o campo `version` identifica `RC57` na execução atual.

Entre as evidências registradas estão:

- loja encontrada;
- candidatos de loja;
- loja esperada do espelho;
- período do ponto;
- dias brutos;
- índices alinhados;
- datas efetivas;
- cobertura;
- colaboradores;
- concordância entre matrizes;
- origem textual/OCR;
- erro de bloqueio, quando existente.

## Critérios de aceite RC57

1. O cabeçalho precisa confirmar a mesma loja do espelho.
2. Cabeçalho ambíguo deve ser bloqueado.
3. A grade precisa possuir estrutura temporal coerente.
4. O alinhamento com a competência precisa atingir pelo menos 95%.
5. Dias ausentes não podem ser fabricados.
6. Deve haver pelo menos três colaboradores válidos na matriz PDF.
7. Todos os turnos utilizados precisam possuir horário reconhecido.
8. Falha estrutural textual pode usar OCR; falhas de loja, cobertura ou legenda não podem ser contornadas por OCR.
9. PDF-imagem aprovado por OCR deve atravessar os mesmos gates do PDF textual.
10. A troca para um novo PDF deve invalidar a escala anterior antes da validação.
11. A matriz validada deve produzir `PDF_GRID_RC57_MLxx.xlsx` com a mesma loja confirmada.
12. A suíte E2E precisa permanecer verde antes de considerar a rodada certificada.

## Observação sobre especificações históricas

Versões anteriores deste documento descreviam hipóteses temporais e checksums de dia da semana que não correspondem integralmente ao parser ativo RC57. Este documento descreve o **comportamento operacional efetivamente implementado** na candidata atual; ideias históricas que não estejam no código não são tratadas como garantias de runtime.
