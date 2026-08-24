# Protocolo de aceite — Aderência de Escala v1.0 RC

Use esta lista antes de congelar/empacotar a versão operacional.

## 1. Benchmark principal — ML21 / Excel

- [ ] Carregar o espelho conhecido da ML21.
- [ ] Carregar a escala XLSM correspondente.
- [ ] Confirmar loja ML21 nos dois arquivos.
- [ ] Confirmar competência pelo mês de fechamento do ciclo 11→10.
- [ ] Confirmar 30 turnos reconhecidos no arquivo de referência.
- [ ] Confirmar cobertura ≥ 98%.
- [ ] Confirmar confiabilidade ≥ 92%.
- [ ] Confirmar resultado de referência próximo de **83,89%** no conjunto já validado durante a calibração.
- [ ] Confirmar que dias-pessoa em folga/ausência contam uma ocorrência por colaborador/data, independentemente da quantidade de batidas do dia.

## 2. Escala em PDF com camada de texto

- [ ] Loja reconhecida corretamente.
- [ ] Mês/ano lidos do cabeçalho, sem confundir nomes de colaboradores com meses.
- [ ] Colunas 11→10 reconstruídas corretamente.
- [ ] Turnos usados possuem horário reconhecido.
- [ ] Competência corresponde ao mês de fechamento.

## 3. PDF imagem / OCR

- [ ] Testar ao menos um PDF realmente rasterizado, sem camada textual.
- [ ] Confirmar que o OCR entra somente como contingência.
- [ ] Conferir loja, mês, dias, nomes e turnos antes de aceitar o percentual.
- [ ] Não liberar resultado se cobertura/confiabilidade ficarem abaixo das travas.

## 4. Validações negativas

- [ ] Loja do ponto diferente da loja da escala → cálculo bloqueado.
- [ ] Escala sem cobrir todo o período do ponto → cálculo bloqueado.
- [ ] Turno usado sem horário reconhecido → cálculo bloqueado.
- [ ] Cobertura < 98% → cálculo bloqueado.
- [ ] Confiabilidade < 92% → cálculo bloqueado.
- [ ] Nome duplicado/ambíguo → cálculo bloqueado.

## 5. Histórico local

- [ ] Salvar resultado e confirmar que aparece em Histórico.
- [ ] Confirmar que a mesma competência aparece em Monitoramento.
- [ ] Confirmar que o ano aparece no Semestral.
- [ ] Salvar novamente mesma loja/mês/ano → atualizar, não duplicar.
- [ ] Fechar e reabrir `index.html` → histórico permanece.
- [ ] Backup JSON e restauração funcionam.
- [ ] Limpar histórico exige confirmação e não restaura dados legados sozinho.

## 6. Ajuste eletivo

- [ ] Só habilita com loja + mês + ano específicos e resultado existente.
- [ ] Modal mostra valor-base e valor ajustado antes da confirmação.
- [ ] +10% é aplicado sobre o valor-base e limitado a 100%.
- [ ] Resultado-base permanece armazenado.
- [ ] Remoção do ajuste retorna ao valor-base.

## 7. Monitoramento da rede

- [ ] 61 lojas exibidas, incluindo ML61 — Vinhedo.
- [ ] Verde: ≥95%.
- [ ] Amarelo: ≥80% e <95%.
- [ ] Vermelho: <80%.
- [ ] Cinza: sem resultado.
- [ ] Totais dos KPIs somam 61 lojas.

## 8. Comparativo semestral

- [ ] 1º semestre = janeiro a junho.
- [ ] 2º semestre = julho a dezembro.
- [ ] Variação em pontos percentuais calculada corretamente.
- [ ] Filtro por loja funciona.
- [ ] PDF semestral pagina todas as lojas sem cortar linhas.

## 9. Relatórios PDF

- [ ] Relatório da análise permanece em uma página A4 paisagem.
- [ ] Loja e aderência têm protagonismo visual.
- [ ] Confiabilidade aparece como validação secundária.
- [ ] Causas e cargos batem com a tela.
- [ ] Histórico PDF inclui todas as lojas por paginação.
- [ ] Monitoramento PDF inclui as 61 lojas.
- [ ] Semestral PDF inclui todas as lojas por paginação.

## 10. Ambiente local

- [ ] Abrir por duplo clique em `index.html`.
- [ ] Testar no navegador corporativo que será usado em produção.
- [ ] Testar com internet normal, pois as bibliotecas são carregadas por CDN.
- [ ] Desconectar a internet e confirmar que a aplicação informa claramente quando dependências essenciais não carregam.
- [ ] Fazer um Backup final do histórico antes de substituir a pasta por uma nova versão.

## Critério de congelamento

A versão deve ser considerada pronta para uso operacional somente após os cenários acima passarem com arquivos reais de pelo menos:

1. uma loja com escala Excel/XLSM;
2. uma loja com escala PDF textual;
3. se esse formato for utilizado na operação, uma loja com PDF imagem/OCR.
