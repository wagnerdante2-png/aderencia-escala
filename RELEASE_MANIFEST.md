# Manifesto de Release — v1.0 RC40

Este arquivo identifica o conjunto ativo que deve ser considerado para empacotamento da versão operacional consolidada.

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
- `period-controller-rc39.js`
- `evolution-dashboard-rc39.js`
- `rc40-integrity-check.js`
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

O repositório de desenvolvimento ainda contém versões anteriores de engines, parsers PDF, corretores temporais e ajustes de interface. Eles permanecem somente como histórico e **não fazem parte do pacote limpo**, salvo quando explicitamente listados acima e carregados pelo `bootstrap.js`.

## Persistência

- `localStorage` permanece como cache local e contingência.
- A base portátil `aderencia-dados.json` pode ser criada/vinculada em Edge ou Chrome compatível.
- Histórico, divergências persistidas, divergências pendentes, configuração administrativa e cadastro de lojas/regionais são gravados na base portátil.
- A gravação é serializada e debounced para evitar múltiplas escritas concorrentes.
- Ao zerar o histórico, os detalhes e pendências de divergência também são zerados.
- A vinculação de uma base substitui os dados persistentes carregados da base escolhida e evita mistura silenciosa de histórico/divergências.
- Bases criadas por versão futura incompatível são recusadas.

## Regra canônica de competência

A competência mensal é definida **exclusivamente pelo início do período integral do espelho de ponto**, nunca pela data final da escala e nunca pela data final da interseção usada no cálculo.

Exemplos:

- `11/06/2026 a 10/07/2026` = competência **Junho/2026**;
- `11/07/2026 a 10/08/2026` = competência **Julho/2026**;
- `11/12/2026 a 10/01/2027` = competência **Dezembro/2026**.

Se a escala disponível cobrir somente parte do ciclo, inclusive modelos `01–30` ou `01–31`, o motor calcula proporcionalmente apenas a interseção disponível, mas preserva a competência do início do espelho.

## Competência global RC40

A RC40 consolida o seletor Mês/Ano do painel superior como **seletor mestre de competência**. Ele sincroniza os campos internos de Histórico, Monitoramento e Divergências, o ano do Semestral, o painel LED e a aba Evolução.

Os seletores mensais duplicados das telas internas ficam ocultos. Relatórios e exportações continuam lendo os campos internos existentes, mas esses campos passam a receber automaticamente a mesma competência global.

A competência calculada pelo motor prevalece no salvamento: ao analisar um espelho `11/06–10/07`, o sistema conduz a competência global para Junho/2026 antes da persistência.

## Evolução RC40

- nova aba `Evolução` com barras mensais da seleção atual e linha da média da rede;
- filtros por Regional e Loja;
- destaque do mês correspondente à competência global;
- variação em pontos percentuais contra o mês anterior;
- quantidade de lojas com resultado no mês e tamanho da base selecionada;
- referências visuais de 80% e 95%;
- a geometria da linha usa o centro exato das barras;
- lacunas de meses sem dados quebram a linha em vez de sugerirem continuidade inexistente.

## Diagnóstico estrutural

- Excel/XLSM/XLS e o XLSX sintético gerado a partir de PDF passam por uma camada paralela de inspeção.
- A camada produz uma representação canônica `Funcionário × Data × Código` sem alterar o cálculo principal.
- São avaliados número de datas, continuidade temporal, duplicidade, cobertura da matriz, colaboradores e células não classificadas.
- O botão `Diagnóstico da leitura` permite visualizar a matriz interpretada antes de confiar cegamente no percentual.
- A camada continua observacional: ela não muda a fórmula de aderência nem substitui os parsers homologados.
- `rc40-integrity-check.js` executa checagens não destrutivas de versão, competência, sincronização temporal, histórico, divergências, Evolução e cadastro de lojas ao carregar a aplicação.

## Segurança de PDF

- O adaptador `pdf-security-rc35.js` força `isEvalSupported=false` no PDF.js sem alterar a API usada pelos módulos existentes.

## Rede dinâmica

- Novas lojas são cadastradas pela interface e vinculadas a uma regional.
- ML61 Vinhedo pertence a `GUARDIÕES DA CHAMA`.
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

## Regras finais de aceite

Antes de promover RC40 para uso operacional:

1. Excel + espelho conhecido reproduz resultado homologado.
2. PDF de escala compatível é reconhecido sem alterar indevidamente a competência.
3. Escala com cobertura parcial calcula somente a interseção disponível.
4. Lote apresenta erro por linha sem travar a fila.
5. Salvar histórico atualiza Histórico, Monitoramento, LED, Semestral e Evolução.
6. Divergências por colaborador fecham com os totais do painel principal.
7. Exportações PDF e Excel abrem sem erro.
8. Backup/restauração manual preserva os resultados.
9. Criar `aderencia-dados.json`, salvar resultado e confirmar atualização do arquivo.
10. Fechar/reabrir e confirmar reconexão ou pedido de autorização da base conhecida.
11. Vincular a base em outro computador/perfil e confirmar recuperação do histórico.
12. Criar nova loja, atribuir regional e confirmar persistência local e portátil.
13. Filtrar Histórico, Monitoramento e Semestral por regional e conferir totais.
14. Confirmar ML61 em Guardiões da Chama.
15. Desabilitar/reabilitar `Limpar histórico` e confirmar persistência da flag.
16. Limpar histórico e confirmar que histórico/divergências também zeram no JSON vinculado.
17. Abrir `Diagnóstico da leitura` em Excel homologado e conferir datas, pessoas e códigos.
18. Repetir diagnóstico com PDF convertido em XLSX sintético.
19. Confirmar que o percentual de aderência permanece idêntico ao caso homologado correspondente.
20. Confirmar Monitoramento com quantidade dinâmica de lojas.
21. Alterar Mês/Ano no seletor global e confirmar atualização simultânea de LED, Histórico, Monitoramento e Divergências.
22. Confirmar que o ano do Semestral acompanha o seletor global.
23. Confirmar que a aba Evolução destaca o mesmo mês/ano da competência global.
24. Confirmar que relatórios e exportações usam a competência global sincronizada.
25. Salvar espelho `11/06 a 10/07` e confirmar **Junho**, nunca Julho.
26. Salvar espelho `11/07 a 10/08` e confirmar **Julho**.
27. Testar virada `11/12 a 10/01` e confirmar **Dezembro do ano inicial**.
28. Testar escala `01–30/31` contra ciclo `11–10` e confirmar proporcionalidade pela interseção.
29. Em lote, confirmar que `ML21 • 83,89%` salva `83,89%` e não interpreta os dígitos da loja.
30. Na Evolução, confirmar alinhamento entre barras e pontos da linha e quebra da linha em meses sem dados.
31. Abrir o console e confirmar `ADERENCIA_RC40_HEALTH.ok === true` após carregamento normal.

## Critério de congelamento

A RC40 é a candidata consolidada pós-RC38. Nenhuma alteração adicional deve ser feita na engine de cálculo sem abrir nova versão. Após os 31 testes acima passarem, empacotar somente o conjunto essencial deste manifesto.
