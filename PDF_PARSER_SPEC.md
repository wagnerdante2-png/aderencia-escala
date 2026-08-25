# Especificação do parser de escalas PDF - RC13

## Objetivo

Transformar uma escala PDF em uma matriz determinística `Loja × Colaborador × Cargo × Data × Código`, com a mesma estrutura lógica usada pelo parser Excel. O PDF nunca deve gerar um percentual de aderência se a matriz não puder ser reconstruída com evidências suficientes.

## Mapeamento do PDF de referência

Arquivo analisado: `Escala de Folgas - 33 - 06-07-2026(2).pdf`.

Características observadas na página:

- Página única em aproximadamente 841,68 × 595,20 pontos.
- Cabeçalho operacional identifica `LOJA 33`, `Julho`, `2026` e `ML33 - CAMPINAS AMOREIRAS`.
- A linha de datas possui 31 colunas: `11, 12, ... 31, 1, 2, ... 10`.
- A linha imediatamente associada contém os dias da semana: `sáb, dom, seg, ...`.
- No arquivo de referência, os centros das 31 colunas são aproximadamente 258,9 a 730,6 pontos, com passo regular próximo de 15,72 pontos.
- A coluna Nome ocupa a área à esquerda; Cargo fica entre Nome e a primeira coluna de data.
- Foram identificadas 39 linhas de colaboradores e todas possuem 31 códigos de escala.
- A legenda de turnos fica à direita da grade, iniciando aproximadamente após x=754. Isso é crítico: `T1`, `T2`, etc. da legenda podem estar na mesma altura Y das linhas dos colaboradores e jamais podem ser confundidos com células da escala.

## Regra estrutural

O parser trabalha primeiro por geometria da página e somente depois por texto corrido.

### 1. Loja

Prioridade:

1. cabeçalho `MLxx`;
2. cabeçalho `LOJA xx`;
3. nunca usar uma ocorrência de `MLxx` dentro da legenda ou de textos secundários como identificação da loja.

### 2. Grade de dias

- Localizar grupos horizontais de números inteiros de 1 a 31.
- Exigir sequência cronológica coerente, permitindo a virada `31 -> 1`.
- Medir regularidade do espaçamento entre as colunas.
- Guardar os centros X das colunas; eles passam a ser a referência geométrica para todas as células.

### 3. Datas reais

Nunca assumir que o mês do cabeçalho significa automaticamente mês inicial ou mês de fechamento.

Para cada PDF são avaliadas três hipóteses:

1. `header-literal`: o primeiro segmento pertence ao mês/ano mostrado no cabeçalho e, após a virada, passa ao mês seguinte;
2. `header-competencia`: o segmento anterior à virada pertence ao mês anterior e o segmento após a virada pertence ao mês/ano do cabeçalho;
3. `filename-fallback`: data do nome do arquivo, usada somente como pista auxiliar.

As hipóteses são pontuadas por:

- concordância entre cada data calculada e o dia da semana impresso na escala;
- sobreposição com o período do espelho de ponto já carregado;
- data encontrada no nome do arquivo, com peso muito menor.

A hipótese com maior evidência é usada. Em empate ou baixa concordância, o PDF é bloqueado como ambíguo.

### 4. Dias da semana

A linha `seg/ter/qua/qui/sex/sáb/dom` é tratada como checksum temporal. Ela não é decorativa.

Exemplo: se a coluna 11 é `sáb`, a data inferida para aquela coluna precisa efetivamente cair em sábado. Essa verificação evita deslocar a escala em um mês inteiro e ainda assim produzir um percentual aparentemente válido.

### 5. Nome e Cargo

- Localizar os rótulos `Nome` e `Cargo`.
- Calcular dinamicamente as fronteiras entre as áreas de Nome, Cargo e primeira coluna de data.
- Para cada linha de códigos, ler Nome e Cargo apenas à esquerda da grade.
- Dicionário de cargos é usado somente como contingência, não como delimitador principal.

### 6. Códigos por célula

Códigos reconhecidos:

- turnos: `T1` a `T30`;
- folga/ausência: `F`, `FER`, `AF`, `AB`, `AL`, `FF`, `FC`, `NC`, `AE`;
- flexível: `D`.

Cada token é associado à coluna cuja coordenada X é a mais próxima. Tokens encontrados fora do limite da grade são descartados. Isso impede que a legenda lateral seja interpretada como escala.

### 7. Leitura dupla

Quando há camada de texto:

- matriz espacial por coordenadas;
- leitura textual da linha;
- as duas matrizes são cruzadas e usadas para preencher lacunas.

A geometria tem prioridade para a posição temporal; o texto ajuda em nomes/cargos e células ausentes.

### 8. Legenda de turnos

A legenda é extraída separadamente por padrões `Txx | HH:MM às HH:MM`.

Antes de liberar o arquivo:

- listar todos os `Txx` efetivamente usados na matriz;
- verificar quantos possuem horário na legenda;
- bloquear se a cobertura dos turnos ficar abaixo do limite de segurança.

### 9. OCR

OCR é contingência, não primeira opção.

Fluxo:

1. tentar camada textual do PDF;
2. se a matriz tiver baixa confiança, renderizar a página em alta resolução;
3. OCR com coordenadas das palavras;
4. executar exatamente o mesmo algoritmo geométrico sobre as coordenadas do OCR;
5. bloquear se o preenchimento médio das células continuar baixo.

Assim, PDF textual e PDF-imagem usam o mesmo motor lógico após a etapa de extração.

## Qualidade da leitura

A confiança do PDF é composta por métricas independentes:

- sequência dos dias;
- regularidade geométrica das colunas;
- concordância dos dias da semana;
- preenchimento médio das células;
- cobertura da legenda de turnos;
- consistência das linhas de colaboradores.

Além do percentual resumido, o objeto `window.ADERENCIA_PDF_DEBUG` guarda:

- período escolhido;
- hipóteses de data e suas pontuações;
- concordância de weekdays;
- preenchimento das linhas;
- turnos sem legenda;
- uso de OCR.

## Períodos parciais

A regra de cálculo deve operar apenas na interseção entre o período do espelho e o período disponível na escala.

Exemplo:

- espelho: 11/06 a 10/07;
- escala: 01/06 a 30/06;
- análise efetiva: 11/06 a 30/06.

Dias fora da interseção não entram no denominador e não geram penalização.

## Critérios de aceite antes de release

1. PDF de referência deve reconhecer todas as 31 colunas e todas as linhas legíveis.
2. Dia da semana deve ter concordância temporal >= 95% quando disponível.
3. Preenchimento médio das células >= 90%; alvo operacional >= 97%.
4. Nenhum item da legenda lateral pode entrar na matriz de colaborador.
5. Todos os turnos utilizados precisam ser resolvidos pela legenda, salvo exceção explicitamente diagnosticada.
6. Excel e PDF que representam a mesma escala devem produzir a mesma matriz ou divergência explicada célula a célula.
7. Um PDF de imagem deve passar pelo OCR e produzir a mesma estrutura final usada pelo PDF textual.
8. PDF ambíguo deve ser bloqueado, nunca convertido em um percentual silenciosamente.
