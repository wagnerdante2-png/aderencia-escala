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

O sistema também valida loja/período, normaliza nomes, sinaliza colaboradores não conciliados e bloqueia somente combinações sem qualquer interseção de datas.

## Competência operacional

A competência mensal é definida pelo **início do período integral do espelho de ponto**.

- `11/06/2026 a 10/07/2026` = **Junho/2026**;
- `11/07/2026 a 10/08/2026` = **Julho/2026**;
- `11/12/2026 a 10/01/2027` = **Dezembro/2026**.

A data final da escala ou a data final da interseção não define a competência.

Se a escala cobrir somente parte do ciclo do espelho, inclusive casos como `01–30` ou `01–31`, o cálculo é feito proporcionalmente somente nos dias existentes na interseção. O resultado não é rejeitado apenas porque a escala não cobre todos os dias do espelho.

Essa mesma competência é usada em Histórico, painel LED, Monitoramento, Semestral, Divergências, Evolução, processamento em lote e exportações.

## Competência global RC40

A RC40 unifica o seletor de **Mês / Ano** no painel superior. Ele passa a ser a referência temporal de todo o ecossistema de visualização.

Ao alterar a competência global, são sincronizados automaticamente:

- Histórico;
- Monitoramento;
- Divergências;
- Semestral pelo ano correspondente;
- painel LED;
- aba Evolução;
- relatórios e exportações que utilizam esses filtros.

Os seletores mensais duplicados das telas internas ficam ocultos para reduzir risco de leituras contraditórias. A competência apurada pelo motor continua prevalecendo no momento de salvar uma análise: um espelho `11/06–10/07` sempre conduz o sistema para **Junho/2026**, independentemente do mês que estivesse sendo visualizado antes do cálculo.

## Estruturas reconhecidas

### Espelho de ponto

Procura os metadados `Espelho do Ponto`, `Matrícula`, `Nome`, `Departamento / ML`, as linhas diárias e as marcações efetivas `O` ou `I`. Marcações `P` são filtradas pela camada semântica e não compõem a batida real.

### Escala Excel/XLSM

É a fonte preferencial. O motor procura as abas operacionais conhecidas, identifica `Nome`, `Cargo`, as datas, os códigos diários (`T1`, `T2`, `F`, `FER`, `AF` etc.) e a legenda de turnos (`Txx | hh:mm às hh:mm`). Macros não são executadas.

### Escala PDF

É uma contingência. O sistema reconstrói a matriz visual Nome × Dias por posição dos elementos do PDF, associa cada célula às datas reconhecidas e usa OCR como fallback quando o texto estrutural não é suficiente. Quando somente parte do ciclo do espelho estiver presente, a análise considera a interseção disponível.

## Diagnóstico estrutural

A camada paralela de inspeção não altera a fórmula de aderência. Ela produz uma representação canônica `Funcionário × Data × Código`, mede continuidade temporal, cobertura da matriz, quantidade de colaboradores e células não classificadas e disponibiliza o botão **Diagnóstico da leitura**.

Esse diagnóstico funciona tanto com Excel/XLSM/XLS quanto com o XLSX sintético produzido quando uma escala PDF é interpretada.

A RC40 mantém ainda uma auditoria não destrutiva em tempo de execução. Em operação normal, `ADERENCIA_RC40_HEALTH.ok` deve permanecer `true` no console do navegador.

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
- visão semestral;
- divergências por colaborador;
- relatórios PDF;
- exportação Excel do monitoramento mensal para BI;
- backup/restauração manual continua disponível como contingência.

## Mini painel LED da rede

O painel compacto superior é também o **seletor mestre de competência**. Para a competência selecionada ele mostra:

- média de aderência da rede;
- quantidade de lojas verdes (≥95%);
- quantidade de lojas amarelas (80% a 94,99%);
- quantidade de lojas vermelhas (<80%);
- quantidade de lojas sem resultado;
- cobertura da rede no mês.

## Evolução

A aba **Evolução** permite acompanhar o ano inteiro com visual combinado:

- barras = aderência mensal da seleção atual;
- linha = média mensal da rede;
- filtros por regional e loja;
- destaque para o mês da competência global;
- variação contra o mês anterior;
- quantidade de lojas com resultado no mês e tamanho da base selecionada;
- linhas de referência de 80% e 95%.

Meses sem dados não são ligados artificialmente pela linha, evitando sugerir continuidade onde não existe resultado salvo.

## Administrador

O menu **Administrador** não possui senha e contém uma flag para habilitar ou ocultar o botão **Limpar histórico**. A configuração também é preservada na base portátil.

Quando o histórico é efetivamente zerado, os detalhes de divergências vinculados ao histórico também são limpos para impedir reaparecimento de dados antigos.

## Processamento em lote

A aba de lote reutiliza o mesmo motor da análise individual. Cada par de arquivos é processado sequencialmente. Erros de leitura, loja ou período interrompem apenas aquela linha e são exibidos diretamente no lote.

O salvamento em lote usa a mesma regra canônica: a competência vem do início do período integral do espelho de cada linha.

## Divergências por colaborador

O detalhamento persiste apenas ocorrências que reduziram efetivamente o score e confere os totais contra o motor principal antes de gravar. A competência do detalhamento também usa o início do período integral do espelho, mesmo em análises proporcionais por interseção.

## Segurança de PDF

A aplicação força `isEvalSupported=false` no PDF.js antes de carregar os parsers, reduzindo a superfície de execução dinâmica ao abrir PDFs locais.

## Executar localmente

1. Baixe o pacote em ZIP.
2. Extraia a pasta.
3. Abra `index.html` com duplo clique.
4. Preferencialmente use Edge ou Chrome atualizado.
5. Clique em **Criar base** na primeira utilização e salve `aderencia-dados.json` junto da aplicação.

Não é necessário Git, Python, PowerShell, Codespaces ou servidor local.

**Importante:** PDF.js, SheetJS, jsPDF e Tesseract são carregados por CDN. Portanto, a aplicação processa os arquivos localmente, mas precisa de conexão com a internet ao abrir a página para carregar essas bibliotecas.

## Versão

Candidata operacional consolidada: **v1.0 RC40**.
