# Manifesto de Release — v1.0 RC32

Este arquivo identifica o conjunto ativo que deve ser considerado para empacotamento da versão operacional.

## Arquivos essenciais

- `index.html`
- `styles.css`
- `dashboard.css`
- `bootstrap.js`
- `portable-storage.js`
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
- Histórico, divergências persistidas, divergências pendentes e configuração administrativa são gravados na base portátil.
- A gravação é serializada e debounced para evitar múltiplas escritas concorrentes.
- Ao zerar o histórico, os detalhes e pendências de divergência também são zerados.
- A vinculação de uma base substitui dados locais antigos, evitando mistura silenciosa entre computadores.
- Bases criadas por versão futura incompatível são recusadas.

## Dependências externas

A aplicação carrega em tempo de abertura:

- PDF.js 3.11.174
- SheetJS/XLSX 0.18.5
- jsPDF 2.5.1
- Tesseract.js 5.x

Os dados analisados permanecem no navegador, mas é necessária conexão para carregar essas dependências CDN.

## Regras de aceite para empacotamento

Antes de promover RC32 para versão final:

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
12. Desabilitar `Limpar histórico` no Administrador, fechar/reabrir e confirmar persistência da flag.
13. Reabilitar `Limpar histórico`, apagar os dados e confirmar que histórico e divergências foram zerados também no JSON.
14. Vincular uma base diferente e confirmar que divergências antigas do navegador não permanecem misturadas.
