# Manifesto de Release — v1.0 RC35

Este arquivo identifica o conjunto ativo que deve ser considerado para empacotamento da versão operacional.

## Arquivos essenciais

- `index.html`
- `styles.css`
- `dashboard.css`
- `bootstrap.js`
- `portable-storage.js`
- `store-management.js`
- `canonical-validation-rc35.js`
- `pdf-security-rc35.js`
- `ui-final-rc35.js`
- `engine-v3.js`
- `history.js`
- `history-report.js`
- `export-report.js`
- `batch.js`
- `point-semantics.js`
- `pdf-xlsx-compat-rc21.js`
- `pdf-ocr-guard-rc27.js`
- `pdf-calendar-integrity-rc29.js`
- `pdf-schedule-parser-rc28.js`
- `monitor-export.js`
- `divergence-dashboard.js`
- `divergence-capture-rc20.js`
- `layout-fixes-rc19.js`
- `LEIA-ME_LOCAL.txt`
- `README.md`

## Arquivos legados

O repositório ainda contém versões anteriores de engines, parsers PDF, corretores temporais e ajustes de interface. Eles permanecem somente como histórico de desenvolvimento e **não são carregados pelo pipeline atual**.

Ao gerar uma distribuição limpa, use somente os arquivos essenciais acima.

## Persistência

- `localStorage` permanece como cache local e contingência.
- A base portátil `aderencia-dados.json` pode ser criada/vinculada em Edge ou Chrome compatível.
- Histórico, divergências persistidas, divergências pendentes, configuração administrativa e cadastro de lojas/regionais são gravados na base portátil.
- A gravação é serializada e debounced para evitar múltiplas escritas concorrentes.
- Ao zerar o histórico, os detalhes e pendências de divergência também são zerados.
- A vinculação de uma base substitui os dados persistentes carregados da base escolhida e evita mistura silenciosa de histórico/divergências.
- Bases criadas por versão futura incompatível são recusadas.

## Diagnóstico estrutural RC35

- Excel/XLSM/XLS e o XLSX sintético gerado a partir de PDF passam por uma camada paralela de inspeção.
- A camada produz uma representação canônica `Funcionário × Data × Código` sem alterar o cálculo principal.
- São avaliados número de datas, continuidade temporal, duplicidade, cobertura da matriz, colaboradores e células não classificadas.
- O botão `Diagnóstico da leitura` permite visualizar a matriz interpretada antes de confiar cegamente no percentual.
- A camada é observacional nesta RC: ela não muda a fórmula de aderência nem substitui os parsers homologados.

## Segurança de PDF

- O adaptador `pdf-security-rc35.js` força `isEvalSupported=false` no PDF.js sem alterar a API usada pelos módulos existentes.

## Rede dinâmica

- Novas lojas são cadastradas pela interface e vinculadas a uma regional.
- Histórico, Monitoramento e Semestral aceitam filtro regional.
- Textos e contadores de rede são atualizados a partir das lojas cadastradas e não dependem de quantidade fixa de unidades.
- O padrão atual de código operacional permanece `ML00` (duas casas numéricas), compatível com a rede atual e próximas inaugurações.

## Dependências externas

A aplicação carrega em tempo de abertura:

- PDF.js 3.11.174
- SheetJS/XLSX 0.18.5
- jsPDF 2.5.1
- Tesseract.js 5.x

Os dados analisados permanecem no navegador, mas é necessária conexão para carregar essas dependências CDN.

## Regras de aceite para empacotamento

Antes de promover RC35 para versão final:

1. Excel + espelho de ponto conhecido deve reproduzir resultado previamente homologado.
2. PDF de escala compatível deve ser reconhecido sem alterar a competência.
3. PDF de escala de outro ciclo deve ser bloqueado antes do cálculo.
4. Processamento em lote deve apresentar erro por linha sem travar a fila.
5. Salvar histórico deve atualizar Histórico, Monitoramento e Semestral.
6. Divergências por colaborador devem fechar com os totais do painel principal.
7. Exportações PDF e Excel devem abrir sem erro.
8. Backup e restauração manual do histórico devem preservar os resultados.
9. Criar `aderencia-dados.json`, salvar um resultado e confirmar atualização do arquivo.
10. Fechar/reabrir a aplicação e confirmar reconexão ou pedido de autorização da base conhecida.
11. Vincular a mesma base em outro computador/perfil e confirmar recuperação do histórico.
12. Criar uma nova loja, atribuir regional, fechar/reabrir e confirmar persistência.
13. Confirmar que a nova loja/regional também reaparece ao vincular a base portátil em outro computador/perfil.
14. Filtrar Histórico, Monitoramento e Semestral por regional e conferir os totais.
15. Desabilitar `Limpar histórico` no Administrador, fechar/reabrir e confirmar persistência da flag.
16. Reabilitar `Limpar histórico`, apagar os dados e confirmar que histórico e divergências foram zerados também no JSON.
17. Abrir `Diagnóstico da leitura` em Excel homologado e verificar datas, funcionários e códigos.
18. Repetir o diagnóstico após um PDF ser convertido para XLSX sintético e comparar a matriz com o documento original.
19. Confirmar que o percentual de aderência permanece idêntico ao da RC33 nos casos já homologados.
20. Confirmar que o Monitoramento mostra a quantidade atual de lojas cadastradas, inclusive após adicionar uma nova unidade.

## Critério de congelamento

Se os 20 testes acima passarem, a RC35 deve ser congelada e empacotada sem novas alterações funcionais. Mudanças posteriores devem seguir nova versão para evitar regressões no motor homologado.
