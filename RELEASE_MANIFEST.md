# Manifesto de Release — v1.0 RC38

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
- `network-led-panel-rc36.js`
- `competence-integrity-rc38.js`
- `region-view-integrity-rc38.js`
- `rc38-integrity-check.js`
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

O repositório ainda contém versões anteriores de engines, parsers PDF, corretores temporais e ajustes de interface. Eles permanecem somente como histórico de desenvolvimento e **não são carregados pelo pipeline atual**, salvo quando explicitamente listados em `bootstrap.js`.

Ao gerar uma distribuição limpa, use somente os arquivos essenciais acima.

## Persistência

- `localStorage` permanece como cache local e contingência.
- A base portátil `aderencia-dados.json` pode ser criada/vinculada em Edge ou Chrome compatível.
- Histórico, divergências persistidas, divergências pendentes, configuração administrativa e cadastro de lojas/regionais são gravados na base portátil.
- A gravação é serializada e debounced para evitar múltiplas escritas concorrentes.
- Ao zerar o histórico, os detalhes e pendências de divergência também são zerados.
- A vinculação de uma base substitui os dados persistentes carregados da base escolhida e evita mistura silenciosa de histórico/divergências.
- Bases criadas por versão futura incompatível são recusadas.

## Regra canônica de competência RC38

A competência mensal é definida **exclusivamente pelo início do período integral do espelho de ponto**, nunca pela data final da escala e nunca pela data final da interseção usada no cálculo.

Exemplos:

- `11/06/2026 a 10/07/2026` = competência **Junho/2026**;
- `11/07/2026 a 10/08/2026` = competência **Julho/2026**;
- `11/12/2026 a 10/01/2027` = competência **Dezembro/2026**.

Se a escala disponível cobrir somente parte do ciclo, inclusive modelos `01–30` ou `01–31`, o motor calcula proporcionalmente apenas a interseção disponível, mas preserva a competência do início do espelho.

A RC38 também normaliza histórico e divergências quando existe evidência de período suficiente e impede que o processamento em lote volte a salvar pela data final.

## Diagnóstico estrutural RC35–RC38

- Excel/XLSM/XLS e o XLSX sintético gerado a partir de PDF passam por uma camada paralela de inspeção.
- A camada produz uma representação canônica `Funcionário × Data × Código` sem alterar o cálculo principal.
- São avaliados número de datas, continuidade temporal, duplicidade, cobertura da matriz, colaboradores e células não classificadas.
- O botão `Diagnóstico da leitura` permite visualizar a matriz interpretada antes de confiar cegamente no percentual.
- A camada continua observacional: ela não muda a fórmula de aderência nem substitui os parsers homologados.
- `rc38-integrity-check.js` executa checagens não destrutivas de versão, competência, histórico, divergências e cadastro de lojas ao carregar a aplicação.

## Segurança de PDF

- O adaptador `pdf-security-rc35.js` força `isEvalSupported=false` no PDF.js sem alterar a API usada pelos módulos existentes.

## Rede dinâmica e painel LED

- Novas lojas são cadastradas pela interface e vinculadas a uma regional.
- ML61 Vinhedo pertence a `GUARDIÕES DA CHAMA`.
- Histórico, Monitoramento e Semestral aceitam filtro regional.
- Textos e contadores de rede são atualizados a partir das lojas cadastradas e não dependem de quantidade fixa de unidades.
- O mini painel LED mostra a competência selecionada e usa exatamente os registros já persistidos no histórico.
- O painel LED e o filtro de mês/ano do Monitoramento permanecem sincronizados nos dois sentidos.
- O padrão atual de código operacional permanece `ML00` (duas casas numéricas), compatível com a rede atual e próximas inaugurações.

## Dependências externas

A aplicação carrega em tempo de abertura:

- PDF.js 3.11.174
- SheetJS/XLSX 0.18.5
- jsPDF 2.5.1
- Tesseract.js 5.x

Os dados analisados permanecem no navegador, mas é necessária conexão para carregar essas dependências CDN.

## Regras de aceite para empacotamento

Antes de promover RC38 para versão final:

1. Excel + espelho de ponto conhecido deve reproduzir resultado previamente homologado.
2. PDF de escala compatível deve ser reconhecido sem alterar a competência.
3. Escala com cobertura parcial deve calcular somente a interseção disponível, sem ser rejeitada por faltar parte do ciclo.
4. Processamento em lote deve apresentar erro por linha sem travar a fila.
5. Salvar histórico deve atualizar Histórico, Monitoramento, painel LED e Semestral.
6. Divergências por colaborador devem fechar com os totais do painel principal.
7. Exportações PDF e Excel devem abrir sem erro.
8. Backup e restauração manual do histórico devem preservar os resultados.
9. Criar `aderencia-dados.json`, salvar um resultado e confirmar atualização do arquivo.
10. Fechar/reabrir a aplicação e confirmar reconexão ou pedido de autorização da base conhecida.
11. Vincular a mesma base em outro computador/perfil e confirmar recuperação do histórico.
12. Criar uma nova loja, atribuir regional, fechar/reabrir e confirmar persistência.
13. Confirmar que a nova loja/regional também reaparece ao vincular a base portátil em outro computador/perfil.
14. Filtrar Histórico, Monitoramento e Semestral por regional e conferir os totais.
15. Confirmar ML61 em Guardiões da Chama.
16. Desabilitar `Limpar histórico` no Administrador, fechar/reabrir e confirmar persistência da flag.
17. Reabilitar `Limpar histórico`, apagar os dados e confirmar que histórico e divergências foram zerados também no JSON.
18. Abrir `Diagnóstico da leitura` em Excel homologado e verificar datas, funcionários e códigos.
19. Repetir o diagnóstico após um PDF ser convertido para XLSX sintético e comparar a matriz com o documento original.
20. Confirmar que o percentual de aderência permanece idêntico ao caso homologado correspondente.
21. Confirmar que o Monitoramento mostra a quantidade atual de lojas cadastradas, inclusive após adicionar uma nova unidade.
22. Confirmar o painel LED na competência selecionada e sua sincronização ao alterar mês/ano no Monitoramento.
23. Alterar mês/ano no painel LED e confirmar atualização do cenário e do Monitoramento.
24. Salvar um espelho `11/06 a 10/07` e confirmar que Histórico, LED, Monitoramento, Divergências e exportações registram **Junho**, não Julho.
25. Repetir com `11/07 a 10/08` e confirmar **Julho**.
26. Testar virada de ano `11/12 a 10/01` e confirmar **Dezembro do ano inicial**.
27. Em lote, confirmar que `ML21 • 83,89%` salva `83,89%` e não interpreta os dígitos do código da loja como percentual.
28. Abrir o console e confirmar `ADERENCIA_RC38_HEALTH.ok === true` após o carregamento normal.

## Critério de congelamento

Se os 28 testes acima passarem, a RC38 deve ser congelada e empacotada sem novas alterações funcionais. Mudanças posteriores devem seguir nova versão para evitar regressões no motor homologado.
