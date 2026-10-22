# ⚽ Sorteador de Times

Aplicação web para **sortear times de futebol equilibrados**, levando em consideração não apenas a qualidade geral dos jogadores, mas também suas habilidades de **ataque, defesa e goleiro**, além de suas preferências de posição.

A ideia é simples: cadastrar os jogadores uma vez, informar quantos times serão formados e quantos jogadores haverá em cada time. O sistema encontra diversas combinações equilibradas e escolhe uma delas aleatoriamente.

---

## 🎯 Objetivo

Evitar o tradicional sorteio completamente aleatório, que pode gerar situações como:

- um time com todos os melhores atacantes;
- outro time com todos os melhores defensores;
- um time com um ótimo goleiro e outro sem ninguém que saiba jogar no gol;
- jogadores muito fortes concentrados no mesmo time.

O objetivo é produzir **times competitivos e equilibrados**, mantendo uma certa aleatoriedade para que cada novo sorteio possa gerar uma formação diferente.

---

## ⚽ Como funciona

Cada jogador possui três avaliações:

| Habilidade | Peso |
|---|---:|
| 🧤 Goleiro | 3 |
| 🛡️ Defesa | 2 |
| ⚽ Ataque | 1 |

As avaliações vão de **1 a 5 estrelas**.

### Exemplo

Um jogador pode ser cadastrado como:

> **João**  
> ⚽ Ataque: ⭐⭐⭐⭐⭐  
> 🛡️ Defesa: ⭐⭐  
> 🧤 Goleiro: ⭐

Isso significa que João é um excelente atacante, mas possui pouca capacidade defensiva e praticamente não deve ser considerado goleiro.

Outro jogador poderia ser:

> **Carlos**  
> ⚽ Ataque: ⭐⭐⭐  
> 🛡️ Defesa: ⭐⭐⭐⭐  
> 🧤 Goleiro: ⭐⭐⭐⭐⭐

Nesse caso, Carlos é considerado um **goleiro de verdade**, mas também possui boas características para jogar na linha.

---

## 🧤 Regra dos goleiros

Goleiros são tratados de maneira especial porque normalmente existem menos jogadores capazes de atuar bem nessa posição.

Um jogador com:

**🧤 Goleiro = ⭐⭐⭐⭐⭐**

é considerado um goleiro de verdade.

Jogadores com **4 estrelas ou menos** podem ser utilizados como jogadores de linha que conseguem quebrar o galho no gol.

O sistema tenta distribuir os goleiros de alto nível entre os times.

Por exemplo, se existem dois times e dois goleiros 5⭐, o sistema evita colocar os dois no mesmo time.

Se houver menos goleiros bons do que times, o sistema procura os melhores jogadores disponíveis para atuar no gol.

---

## 📊 O que significa "time equilibrado"?

O equilíbrio não significa simplesmente:

> "Todos os times precisam ter a mesma quantidade de estrelas."

Um time pode ter uma defesa pior, mas compensar isso com um goleiro excelente e um ataque forte.

Por exemplo:

### 🔵 Time A

- Defesa: ⭐⭐
- Ataque: ⭐⭐⭐⭐⭐
- Goleiro: ⭐⭐⭐⭐⭐

### 🔴 Time B

- Defesa: ⭐⭐⭐⭐
- Ataque: ⭐⭐⭐
- Goleiro: ⭐⭐⭐

Esses times podem ser considerados relativamente equilibrados porque o Time A possui vantagens ofensivas e no gol, enquanto o Time B possui uma defesa superior.

O algoritmo tenta encontrar esse tipo de compensação.

---

## 🎲 Como o sorteio funciona?

O sistema **não simplesmente embaralha os jogadores**.

O processo é aproximadamente:

```text
Jogadores
    ↓
Análise das habilidades
    ↓
Identificação de goleiros, defensores,
atacantes e jogadores versáteis
    ↓
Geração de possíveis combinações
    ↓
Avaliação do equilíbrio
    ↓
Seleção das melhores combinações
    ↓
Escolha aleatória de uma delas
    ↓
Times finais
```

Dessa maneira, o usuário pode clicar em:

> 🎲 **Sortear novamente**

e obter uma nova combinação sem perder o equilíbrio.

---

## 👥 Configuração do sorteio

Antes de sortear, o usuário escolhe:

### Número de times

Exemplo:

```text
2 times
3 times
4 times
...
```

### Jogadores por time

A quantidade é livre.

Exemplo:

```text
3 jogadores
5 jogadores
7 jogadores
11 jogadores
...
```

O goleiro conta normalmente como um dos jogadores.

Por exemplo:

**5 jogadores por time**

pode resultar em:

```text
🧤 1 goleiro
🛡️ 2 defensores
⚽ 2 atacantes
```

Mas a composição não é obrigatória. O sistema pode montar outras combinações caso sejam mais equilibradas considerando os jogadores disponíveis.

---

## ⭐ Avaliação dos jogadores

Cada habilidade pode receber uma nota de:

```text
⭐ 1
⭐⭐ 2
⭐⭐⭐ 3
⭐⭐⭐⭐ 4
⭐⭐⭐⭐⭐ 5
```

### Nota 1

Muito fraco naquela habilidade.

### Nota 3

Jogador mediano.

É a nota recomendada quando não se conhece bem a capacidade do jogador.

### Nota 5

Excelente naquela habilidade.

No caso do goleiro, 5 estrelas significa que o jogador é considerado um goleiro de verdade.

---

## 🔄 Preferência de posição

Além das estrelas, cada jogador pode informar sua preferência:

- ⚽ Ataque
- 🛡️ Defesa
- 🧤 Goleiro
- 🔄 Indiferente

A preferência influencia o sorteio, mas **não é uma regra absoluta**.

O equilíbrio dos times possui prioridade.

Por exemplo, se João prefere ataque, o sistema tenta colocá-lo no ataque, mas pode colocá-lo em outro setor caso isso seja necessário para equilibrar os times.

---

## 🃏 Jogadores versáteis

Jogadores que possuem boas notas em várias posições podem ser utilizados como "coringas".

Exemplo:

```text
Ataque:  ⭐⭐⭐⭐
Defesa:  ⭐⭐⭐⭐
Goleiro: ⭐⭐⭐
```

Esse jogador pode ajudar o algoritmo a corrigir desequilíbrios na composição dos times.

---

# 📱 Aplicação para celular

O projeto foi pensado para ser utilizado principalmente em celulares.

A aplicação utiliza o conceito de **PWA (Progressive Web App)**.

Isso permite:

- funcionamento em celulares;
- interface adaptada para telas pequenas;
- possibilidade de adicionar à tela inicial;
- armazenamento local;
- funcionamento offline depois de carregada;
- ausência de login;
- ausência de banco de dados obrigatório;
- sorteio realizado diretamente no dispositivo.

A ideia é poder compartilhar o link da aplicação pelo WhatsApp e utilizá-la durante uma partida.

---

## 📴 Funcionamento offline

Os jogadores são armazenados localmente no dispositivo.

Portanto, depois que a aplicação estiver carregada, o usuário pode:

- cadastrar jogadores;
- editar jogadores;
- configurar os times;
- realizar sorteios;
- realizar novos sorteios;

sem depender de conexão com a internet.

Os dados não precisam ser enviados para um servidor.

---

## 📤 Compartilhamento

Depois de realizar o sorteio, a aplicação pode gerar uma mensagem como:

```text
⚽ TIMES DA PELADA

🔵 TIME 1

🧤 João
🛡️ Pedro
🛡️ Lucas
⚽ Rafael
⚽ Carlos


🔴 TIME 2

🧤 Marcos
🛡️ André
🛡️ Felipe
⚽ Bruno
⚽ Diego
```

Essa mensagem pode ser compartilhada pelo próprio celular através do menu nativo de compartilhamento.

---

# 💾 Armazenamento

Os jogadores e configurações são armazenados localmente utilizando tecnologias do navegador, como:

- `localStorage`
- ou `IndexedDB`

A aplicação não deve exigir uma conta ou servidor para armazenar os jogadores.

---

# 🛠️ Tecnologias

A implementação pode utilizar tecnologias web modernas, como:

- HTML5
- CSS3
- JavaScript / TypeScript
- PWA
- Service Worker
- LocalStorage ou IndexedDB

Frameworks podem ser utilizados caso sejam úteis, mas a aplicação deve continuar leve e adequada para dispositivos móveis.

---

# 🧠 Algoritmo de balanceamento

O algoritmo deve considerar simultaneamente:

- qualidade dos jogadores;
- ataque;
- defesa;
- goleiro;
- distribuição dos melhores jogadores;
- quantidade de goleiros;
- jogadores versáteis;
- preferência de posição;
- composição de cada time;
- diferença de força entre os times.

O objetivo é minimizar a diferença entre os times, e não simplesmente maximizar ou igualar a soma das estrelas.

Para poucos jogadores, podem ser analisadas muitas combinações possíveis.

Para grupos maiores, podem ser utilizadas técnicas heurísticas de otimização para manter o tempo de processamento baixo.

---

# 🧪 Casos importantes

O sistema deve funcionar adequadamente em situações como:

- dois times com poucos jogadores;
- vários times;
- muitos atacantes;
- poucos defensores;
- apenas um goleiro 5⭐;
- vários goleiros 5⭐;
- nenhum goleiro 5⭐;
- jogadores 3⭐ em todas as posições;
- jogadores extremamente especializados;
- jogadores extremamente versáteis;
- quantidade de jogadores maior que a necessária.

---

# 🚀 Instalação

Clone o projeto:

```bash
git clone <URL_DO_REPOSITORIO>
```

Entre na pasta:

```bash
cd sorteador-de-times
```

Instale as dependências, caso existam:

```bash
npm install
```

Execute o projeto:

```bash
npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
```

---

# 📱 Instalação como aplicativo

Em navegadores compatíveis, a aplicação pode ser adicionada à tela inicial do celular.

### Android

Abra a aplicação no navegador e utilize:

**Menu → Adicionar à tela inicial**

### iPhone

Abra no Safari e utilize:

**Compartilhar → Adicionar à Tela de Início**

Depois disso, o sorteador pode ser aberto como se fosse um aplicativo.

---

# 🔮 Possíveis melhorias futuras

Algumas funcionalidades que podem ser adicionadas futuramente:

- [ ] Histórico dos sorteios
- [ ] Bloquear jogadores em determinados times
- [ ] Escolher capitães
- [ ] Criar grupos de jogadores
- [ ] Diferentes modalidades de futebol
- [ ] Futebol 5, 7, 8 ou 11
- [ ] Sistema de pontuação após cada partida
- [ ] Histórico de desempenho dos jogadores
- [ ] Estatísticas de vitórias e derrotas
- [ ] Importar/exportar lista de jogadores
- [ ] Compartilhar jogadores entre dispositivos
- [ ] Modo campeonato
- [ ] Modo "pelada"
- [ ] Ajuste manual dos pesos de ataque, defesa e goleiro

---

# 🎯 Filosofia do projeto

O objetivo do **Sorteador de Times** não é encontrar uma divisão matematicamente perfeita.

O objetivo é encontrar uma divisão que seja:

> **justa, equilibrada e suficientemente aleatória para tornar cada sorteio interessante.**

Um bom sorteio deve fazer com que nenhum time entre em campo pensando:

> "Esse jogo já está ganho."

⚽ **Times equilibrados. Sorteio justo. Pelada melhor.**
