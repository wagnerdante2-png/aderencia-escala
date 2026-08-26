# RC42 — consistência de divergências e desempenho

## Gravação das divergências
- Desvio de entrada acima de 90 minutos: 1 ponto por colaborador/data.
- Ponto em F, FER, AF, AB, AL, FF, FC, NC ou AE: 10 pontos por colaborador/data.
- O detalhamento só é persistido quando a quantidade de desvios e não conformidades confere com os totais produzidos pelo motor principal.
- A chave de persistência é loja + ano + mês; uma nova análise da mesma loja/competência substitui a anterior em vez de duplicá-la.
- A competência continua sendo determinada pelo início do período integral do espelho de ponto.

## Otimizações
- Cache em memória para leituras repetidas do histórico e do cadastro de lojas.
- content-visibility/contain em linhas extensas e cartões para reduzir custo de layout e pintura fora da área visível.
- Proteção RC41 contra cascata de eventos do seletor global mantida.
- Auditoria automática de duplicidades, formato e penalidade nas divergências persistidas.
- Métricas de long tasks e cache disponíveis em `window.ADERENCIA_PERFORMANCE.metrics`.

## Diagnóstico
- `window.ADERENCIA_DIVERGENCE_AUDIT` deve apresentar `ok: true`.
- `window.ADERENCIA_RC42_HEALTH.ok` deve apresentar `true` após a inicialização.
