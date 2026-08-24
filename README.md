# Aderência de Escala — v1.0 RC

Aplicação web local para calcular e acompanhar a aderência entre a escala planejada e o espelho de ponto.

## Entradas

1. **Espelho de ponto:** PDF mensal contendo todos os colaboradores da loja.
2. **Escala planejada:** `.xlsx`, `.xlsm`, `.xls` ou PDF exportado da Escala Operacional.

Os arquivos selecionados são processados no navegador e não são enviados pela aplicação para um backend.

## Regra de aderência

- usa a **primeira entrada real do dia**;
- compara com a **entrada prevista do turno**;
- diferença de até **90 minutos**: sem penalização;
- diferença acima de **90 minutos**: **1 ponto**;
- ao menos uma marcação em `F`, `FER`, `AF`, `AB`, `AL`, `FF`, `FC`, `NC` ou `AE`: **10 pontos por colaborador/data**;
- várias batidas no mesmo dia de folga/ausência continuam valendo uma única não conformidade;
- fórmula: `1 - (desvios + 10 × não conformidades) / total de marcações`.

O motor valida loja, período, turnos, cobertura das marcações e conciliação de nomes antes de liberar o percentual.

## Leitura dos arquivos

### Espelho de ponto

Procura `Espelho do Ponto`, período, `Matrícula`, `Nome`, função/departamento, ML, linhas diárias e marcações `O`, `I` ou `P`.

### Escala Excel/XLSM

Prioriza as estruturas operacionais (`Andar no Tempo`, `Escala Ponto`, `Escala Mensal`), limita a leitura à área útil, identifica datas/códigos e lê a legenda dos turnos. Macros não são executadas.

### Escala PDF

Usa a posição dos elementos para reconstruir a matriz Nome × Dias. Se o PDF não tiver camada textual suficiente, tenta OCR como contingência.

## Histórico local

O histórico persiste somente:

- loja;
- competência mensal;
- percentual de aderência;
- indicação de ajuste eletivo, quando aplicado.

A competência usa o **mês de fechamento do período**. Exemplo: `11/06/2026 a 10/07/2026` = **Julho/2026**.

Há visões de Histórico, Monitoramento da Rede e Comparativo Semestral, além de backup/restauração em JSON e relatórios PDF.

### Semáforo do monitoramento

- Verde: `≥ 95%`
- Amarelo: `≥ 80% e < 95%`
- Vermelho: `< 80%`
- Cinza: sem resultado salvo

## Ajuste eletivo

O ajuste eletivo acrescenta **10% sobre o valor-base**, limitado a 100%, somente mediante confirmação. O resultado original é preservado e o ajuste pode ser removido.

## Como executar

Baixe o ZIP, extraia e abra `index.html` diretamente no navegador.

A aplicação funciona via `file://`, mas as bibliotecas PDF/Excel/OCR/geração de relatório são carregadas por CDN. Portanto, esta versão necessita de conexão à internet na abertura. Se alguma dependência essencial não carregar, o aplicativo informa o problema.

## Persistência e backup

O histórico usa `localStorage`. Como o comportamento de armazenamento de páginas `file://` depende do navegador e do caminho da pasta, faça **Backup** periodicamente e antes de mover a pasta, trocar de navegador/computador ou limpar dados do navegador.

## Escopo da versão candidata

A v1.0 RC foi consolidada sem backend e sem banco corporativo. Para uso em múltiplos computadores ou compartilhamento simultâneo entre usuários, o próximo passo recomendado é migrar o histórico para uma base centralizada.