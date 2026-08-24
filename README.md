# Aderência de Escala

MVP web, sem banco de dados e sem backend, para calcular a aderência entre a escala planejada e o espelho de ponto.

## Entradas

1. **Espelho de ponto:** PDF mensal contendo todos os colaboradores da loja.
2. **Escala:** aceita `.xlsx`, `.xlsm`, `.xls` ou PDF exportado da Escala Operacional.

O processamento acontece no próprio navegador. Os arquivos não são enviados para um servidor por este MVP.

## Regra

- usa a **primeira entrada real do dia** no espelho de ponto;
- compara com a **entrada prevista do turno** na escala;
- diferença de até **90 minutos**: sem penalização;
- diferença acima de **90 minutos**: penalização de **1 ponto**;
- marcação em dia previsto como `F`, `FER`, `AF`, `AB`, `AL`, `FF`, `FC`, `NC` ou `AE`: penalização de **10 pontos**;
- fórmula: `1 - (desvios + 10 × não conformidades) / total de marcações`;
- o resultado visual é limitado entre 0% e 100%.

O sistema também valida loja/período, normaliza nomes e sinaliza colaboradores não conciliados.

## Estruturas reconhecidas

### Espelho de ponto

Procura os metadados `Espelho do Ponto`, `Matrícula`, `Nome`, `Departamento / ML`, as linhas diárias e as marcações `O`, `I` ou `P`.

### Escala Excel/XLSM

Prioriza a aba **Escala Mensal**, identifica `Nome`, `Cargo`, as datas, os códigos diários (`T1`, `T2`, `F`, `FER`, `AF` etc.) e lê a própria legenda de turnos (`Txx | hh:mm às hh:mm`). Não executa macros.

### Escala PDF

Reconhece a matriz visual Nome × Dias por posição dos elementos do PDF, associa cada célula à data correspondente e lê a legenda de turnos do próprio documento.

## Executar

Por usar módulos JavaScript e bibliotecas CDN, abra por um servidor HTTP simples.

No Codespaces:

```bash
python3 -m http.server 8000
```

Depois abra a porta **8000** no navegador.

Também pode ser publicado como GitHub Pages por ser um site estático.
