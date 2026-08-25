# Aderência de Escala

Aplicação web local, sem backend e sem banco externo, para calcular a aderência entre a escala planejada e o espelho de ponto.

## Entradas

1. **Espelho de ponto:** PDF mensal contendo os colaboradores da loja.
2. **Escala:** preferencialmente `.xlsx`, `.xlsm` ou `.xls`; também aceita PDF exportado da Escala Operacional como contingência.

O processamento acontece no próprio navegador. Os arquivos selecionados não são enviados para um servidor por esta aplicação.

## Regra

- usa a **primeira entrada real do dia** no espelho de ponto;
- marcações `P` (pré-assinaladas) não são tratadas como batida real;
- compara a primeira entrada efetiva com a **entrada prevista do turno** na escala;
- diferença de até **90 minutos**: sem penalização;
- diferença acima de **90 minutos**: penalização de **1 ponto**;
- marcação em dia previsto como `F`, `FER`, `AF`, `AB`, `AL`, `FF`, `FC`, `NC` ou `AE`: penalização de **10 pontos por colaborador/data**;
- fórmula: `1 - (desvios + 10 × não conformidades) / total de marcações consideradas`;
- o resultado visual é limitado entre 0% e 100%.

O sistema também valida loja/período, normaliza nomes, sinaliza colaboradores não conciliados e bloqueia PDF de escala cujo calendário impresso seja incompatível com a competência do espelho.

## Estruturas reconhecidas

### Espelho de ponto

Procura os metadados `Espelho do Ponto`, `Matrícula`, `Nome`, `Departamento / ML`, as linhas diárias e as marcações reais `O` ou `I`.

### Escala Excel/XLSM

É a fonte preferencial. O motor procura as abas operacionais conhecidas, identifica `Nome`, `Cargo`, as datas, os códigos diários (`T1`, `T2`, `F`, `FER`, `AF` etc.) e a legenda de turnos (`Txx | hh:mm às hh:mm`). Macros não são executadas.

### Escala PDF

É uma contingência. O sistema reconstrói a matriz visual Nome × Dias por posição dos elementos do PDF, associa cada célula ao período do espelho e valida o calendário impresso antes do cálculo. Se o PDF aparentar pertencer a outro ciclo, o cálculo é bloqueado para evitar aderência falsa.

## Histórico e relatórios

- histórico mensal salvo no `localStorage` do navegador;
- monitoramento das 61 lojas;
- visão semestral;
- divergências por colaborador;
- relatórios PDF;
- exportação Excel do monitoramento mensal para BI;
- backup/restauração do histórico.

## Processamento em lote

A aba de lote reutiliza o mesmo motor da análise individual. Cada par de arquivos é processado sequencialmente. Erros de leitura, loja, período ou calendário incompatível interrompem apenas aquela linha e são exibidos diretamente no lote.

## Executar localmente

1. Baixe o repositório em ZIP.
2. Extraia a pasta.
3. Abra `index.html` com duplo clique.

Não é necessário Git, Python, PowerShell, Codespaces ou servidor local.

**Importante:** PDF.js, SheetJS, jsPDF e Tesseract são carregados por CDN. Portanto, a aplicação processa os arquivos localmente, mas precisa de conexão com a internet ao abrir a página para carregar essas bibliotecas.

## Versão

Pré-release operacional: **v1.0 RC30**.
