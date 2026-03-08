# Especificação Gramatical da Linguagem
**Disciplina:** Compiladores
**Autores:** Evandro Taroco, João Eduardo e Matheus Chizzolini

Este documento apresenta a gramática da linguagem em notação EBNF, detalhando a estrutura de programas, expressões e controle de fluxo.

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
| **Lógicos** | `&`, `|` |

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