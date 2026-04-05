# Especificação Gramatical da Linguagem
**Disciplina:** Compiladores  
**Autores:** Evandro Taroco, João Eduardo e Matheus Chizzolini

Este documento apresenta a gramática da linguagem em notação EBNF, detalhando a estrutura de programas, expressões e controle de fluxo, além dos conjuntos FIRST e FOLLOW de todos os não-terminais.

---

## Estrutura Principal
Um programa consiste em uma sequência de linhas.

```ebnf
programa = { linha }
```

---

## Elementos Básicos (Léxico)
Definições de identificadores, números e tipos primitivos.

* **Dígitos e Letras:**
    ```ebnf
    digito = "0" | ... | "9"
    letra = "a" | ... | "z" | "A" | ... | "Z"
    ```
* **Identificadores:**
    ```ebnf
    identificador = letra { digito | letra | "_" }
    ```
* **Valores e Tipos:**
    ```ebnf
    numero = digito { digito } [ "." digito { digito } ]
    caractere = "'" ( letra | digito ) "'"
    booleano = "true" | "false"
    valor = numero | caractere | booleano
    ```

---

## Expressões e Operadores
A gramática define a precedência de operadores partindo da menor para a maior prioridade.

### Operadores
| Categoria | Operadores |
| :--- | :--- |
| **Multiplicativos** | `*`, `/`, `%` |
| **Aditivos** | `+`, `-` |
| **Relacionais** | `==`, `!=`, `>`, `>=`, `<`, `<=` |
| **Lógicos** | `&`, `\|` |

### Hierarquia de Precedência
1. **Expressão Lógica:** `expressao_relacional { operador_logico expressao_relacional }`
2. **Expressão Relacional:** `expressao_aditiva { operador_relacional expressao_aditiva }`
3. **Expressão Aditiva:** `termo { operador_aditivo termo }`
4. **Termo:** `unario { operador_multiplicativo unario }`
5. **Unário:** `[ "!" | "-" ] fator`
6. **Fator:** `identificador | valor | "(" expressao ")"`

---

## Declarações e Atribuições
Definições de como variáveis são instanciadas e modificadas.

* **Tipos:** `int`, `decimal`, `char`, `bool`
* **Declaração:** `tipo identificador [ "=" expressao ] ;`
* **Atribuição:** `identificador "=" expressao ;`

---

## Fluxo de Controle
Estruturas de decisão e repetição.

* **Linha e Bloco:**
    ```ebnf
    linha = declaracao | atribuicao | condicional | repeticao
    bloco = "{" { linha } "}"
    ```
* **Condicional (if):**
    ```ebnf
    condicional = "if" "(" expressao ")" bloco [ "else" bloco ]
    ```
* **Repetição (while):**
    ```ebnf
    repeticao = "while" "(" expressao ")" bloco
    ```

---

## Conjuntos FIRST

> **Notação:** `ε` indica que o não-terminal pode derivar a cadeia vazia (é anulável). `$` indica fim de entrada.

### Elementos Léxicos

```
FIRST(digito) = {
  "0", "1", ..., "9"
}

FIRST(letra) = {
  "a", ..., "z",
  "A", ..., "Z"
}

FIRST(identificador) = {
  "a", ..., "z",
  "A", ..., "Z"
}

FIRST(numero) = {
  "0", ..., "9"
}

FIRST(caractere) = {
  "'"
}

FIRST(booleano) = {
  "true", "false"
}

FIRST(valor) = {
  "0", ..., "9",
  "'",
  "true", "false"
}
```

### Operadores

```
FIRST(operador_multiplicativo) = {
  "*", "/", "%"
}

FIRST(operador_aditivo) = {
  "+", "-"
}

FIRST(operador_relacional) = {
  "==", "!=", ">", ">=", "<", "<="
}

FIRST(operador_logico) = {
  "&", "|"
}
```

### Expressões

> Todos os não-terminais de expressão compartilham o mesmo FIRST pois toda expressão começa por um `fator`, que pode iniciar com identificador, valor literal ou `(`.

```
FIRST(fator) = {
  "a", ..., "z", "A", ..., "Z",   ← identificador
  "0", ..., "9",                  ← numero
  "'",                            ← caractere
  "true", "false",                ← booleano
  "("
}

FIRST(unario) = {
  "!", "-",                       ← operadores unários opcionais
  "a", ..., "z", "A", ..., "Z",
  "0", ..., "9",
  "'",
  "true", "false",
  "("
}

FIRST(termo)             = FIRST(unario)
FIRST(expressao_aditiva) = FIRST(unario)
FIRST(expressao_relacional) = FIRST(unario)
FIRST(expressao_logica)  = FIRST(unario)
FIRST(expressao)         = FIRST(unario)
```

### Comandos e Estruturas

```
FIRST(tipo) = {
  "int", "decimal", "char", "bool"
}

FIRST(declaracao) = {
  "int", "decimal", "char", "bool"
}

FIRST(atribuicao) = {
  "a", ..., "z",
  "A", ..., "Z"
}

FIRST(condicional) = {
  "if"
}

FIRST(repeticao) = {
  "while"
}

FIRST(linha) = {
  "int", "decimal", "char", "bool",
  "a", ..., "z", "A", ..., "Z",
  "if",
  "while"
}

FIRST(bloco) = {
  "{"
}

FIRST(programa) = {
  "int", "decimal", "char", "bool",
  "a", ..., "z", "A", ..., "Z",
  "if",
  "while",
  ε
}
```

---

## Conjuntos FOLLOW

### Estrutura do Programa

```
FOLLOW(programa) = {
  $
}

FOLLOW(linha) = {
  "int", "decimal", "char", "bool",   ← FIRST(linha): outra linha pode seguir
  "a", ..., "z", "A", ..., "Z",
  "if",
  "while",
  "}",                                 ← fim de bloco
  $                                    ← fim do programa
}

FOLLOW(bloco) = {
  "else",                              ← parte opcional de condicional
  "int", "decimal", "char", "bool",   ← FOLLOW(condicional) e FOLLOW(repeticao)
  "a", ..., "z", "A", ..., "Z",
  "if",
  "while",
  "}",
  $
}
```

### Declarações e Atribuições

```
FOLLOW(declaracao)  = FOLLOW(linha)
FOLLOW(atribuicao)  = FOLLOW(linha)
FOLLOW(condicional) = FOLLOW(linha)
FOLLOW(repeticao)   = FOLLOW(linha)

FOLLOW(tipo) = {
  "a", ..., "z",     ← FIRST(identificador): tipo é sempre seguido por um identificador
  "A", ..., "Z"
}

FOLLOW(identificador) = {
  "=",               ← em declaracao [ "=" expressao ] e em atribuicao
  ";",               ← fim de declaracao (quando parte opcional é omitida)
  "*", "/", "%",     ← FOLLOW(fator): identificador pode aparecer em expressões
  "+", "-",
  "==", "!=", ">", ">=", "<", "<=",
  "&", "|",
  ")",
  $
}
```

### Valores e Literais

```
FOLLOW(valor) = FOLLOW(fator) = {
  "*", "/", "%",
  "+", "-",
  "==", "!=", ">", ">=", "<", "<=",
  "&", "|",
  ";",
  ")"
}

FOLLOW(numero)    = FOLLOW(valor)
FOLLOW(caractere) = FOLLOW(valor)
FOLLOW(booleano)  = FOLLOW(valor)
```

### Operadores

```
FOLLOW(operador_multiplicativo) = FIRST(unario) = {
  "!", "-",
  "a", ..., "z", "A", ..., "Z",
  "0", ..., "9",
  "'",
  "true", "false",
  "("
}

FOLLOW(operador_aditivo)    = FIRST(unario)
FOLLOW(operador_relacional) = FIRST(unario)
FOLLOW(operador_logico)     = FIRST(unario)
```

### Expressões

```
FOLLOW(expressao) = {
  ";",    ← fim de declaracao e atribuicao
  ")"     ← fecha parênteses em condicional, repeticao e fator
}

FOLLOW(expressao_logica) = FOLLOW(expressao) = {
  ";", ")"
}

FOLLOW(expressao_relacional) = {
  "&", "|",     ← FIRST(operador_logico)
  ";", ")"      ← FOLLOW(expressao_logica)
}

FOLLOW(expressao_aditiva) = {
  "==", "!=", ">", ">=", "<", "<=",   ← FIRST(operador_relacional)
  "&", "|",
  ";", ")"
}

FOLLOW(termo) = {
  "+", "-",                            ← FIRST(operador_aditivo)
  "==", "!=", ">", ">=", "<", "<=",
  "&", "|",
  ";", ")"
}

FOLLOW(unario) = {
  "*", "/", "%",                       ← FIRST(operador_multiplicativo)
  "+", "-",
  "==", "!=", ">", ">=", "<", "<=",
  "&", "|",
  ";", ")"
}

FOLLOW(fator) = FOLLOW(unario) = {
  "*", "/", "%",
  "+", "-",
  "==", "!=", ">", ">=", "<", "<=",
  "&", "|",
  ";", ")"
}
```

### Elementos Léxicos Internos

```
FOLLOW(digito) = {
  "0", ..., "9",     ← outro digito em numero ou identificador
  ".",               ← parte decimal de numero
  "'",               ← fecha caractere
  "_",               ← continuação de identificador
  "a", ..., "z", "A", ..., "Z",
  "*", "/", "%",     ← FOLLOW(numero) / FOLLOW(identificador)
  "+", "-",
  "==", "!=", ">", ">=", "<", "<=",
  "&", "|",
  "=", ";", ")"
}

FOLLOW(letra) = {
  "0", ..., "9",     ← continuação de identificador
  "a", ..., "z", "A", ..., "Z",
  "_",               ← continuação de identificador
  "'",               ← fecha caractere
  "=", ";",          ← FOLLOW(identificador)
  "*", "/", "%",
  "+", "-",
  "==", "!=", ">", ">=", "<", "<=",
  "&", "|",
  ")"
}
```
