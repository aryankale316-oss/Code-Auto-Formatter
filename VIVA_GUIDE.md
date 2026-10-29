# CodeCraft viva guide

## What is a compiler?
A compiler translates a source program into another representation, often machine code. A traditional pipeline includes lexical analysis, syntax analysis, semantic analysis, intermediate code generation, optimization, and target code generation. CodeCraft implements front-end analysis and source layout; it is not a complete machine-code compiler.

## What is lexical analysis?
Lexical analysis scans characters and groups them into meaningful units. Our PLY Lex scanner recognizes keywords, identifiers, literals, operators, delimiters, comments, and includes. It records line, column, and offset for each token. Whitespace is recognized internally but omitted from the visible table.

## What is a token?
A token has a type and an original spelling, or lexeme. In `int total=3;`, `int` is an INT keyword, `total` is an IDENTIFIER, `=` is ASSIGN, `3` is NUMBER, and `;` is SEMI. Comments and punctuation inside a string are not separate C statements.

## What is syntax analysis? What is parsing?
Parsing checks whether the token sequence follows a grammar. Our parser uses PLY Yacc and LALR(1) tables. It shifts tokens onto a stack and reduces matching grammar productions. A reduction constructs an AST node. Invalid sequences produce a diagnostic rather than formatted output.

## What is a context-free grammar?
A CFG defines permitted structures using nonterminals, terminals, productions, and a start symbol. For example, `statement → RETURN expression SEMI` and `expression → expression PLUS expression`. Recursion allows nested blocks and expressions. Our start symbol is `program`.

## What are precedence and associativity?
Precedence decides which operator binds first: `a+b*c` means `a+(b*c)`. Associativity decides grouping when precedence is equal: `a-b-c` groups left; `a=b=c` groups right. Explicit PLY precedence rules encode these choices. The nearest unmatched `if` owns an `else`.

## What is an AST?
An abstract syntax tree represents program structure without every punctuation token. A BinaryExpression contains an operator and two child expressions. A FunctionDeclaration contains parameters and a body. Source ranges connect nodes to their original text. Comments are retained separately in the token stream.

## How does the formatter work?
First it lexes and parses successfully. It traverses the AST to find unary operators, unbraced statement intervals, and function boundaries. A custom renderer uses those facts and original tokens to apply indentation, spacing, braces, and newlines. It preserves the token order, literal spellings, comments, and grouping punctuation. It then lexes and parses the output again and requires matching tokens and AST structure.

## Why not just use regular expressions?
Lexers can use regular expressions to recognize individual tokens, but nesting and grammatical relationships require parsing. A regex replacement cannot reliably decide whether a minus is unary, which if owns an else, or whether a semicolon is inside a string. Our tree and source ranges drive those decisions.

## How are errors detected?
The scanner collects illegal characters, unterminated comments/literals, and unsupported directives. If lexing succeeds, the parser reports its first unexpected token or unexpected end of input with a line/column and a suggested check. The UI shows lexical and syntax categories separately and adds Monaco markers. We do not pretend to discover every error in one pass.

## Does it prove behavior is unchanged?
No. Matching token streams and location-free ASTs are strong structural checks within our documented subset. Idempotence and preservation tests add confidence. They are not a proof of semantic equivalence for all C, macro expansion, undefined behavior, or implementation-defined behavior. No expressions are evaluated, and the service never executes uploaded code.

## What is idempotence?
Formatting an already formatted file produces exactly the same text. In notation, `F(F(code, options), options) = F(code, options)`. Our tests check this across all indentation/brace combinations, comments, literals, and nested constructs.

## Is this semantic analysis?
No. We do not maintain a symbol table or check all types, declarations, scopes, loop context, or return types. The assignment-target restriction is a limited structural check. A full C compiler can still reject a program that our grammar accepts.

## What are the limits?
Only a documented C subset is accepted. We exclude pointers, structs, typedefs, function prototypes, advanced preprocessing, switch/do-while, casts, initializer lists, ternary/bitwise expressions, and other advanced features. Includes are preserved without expansion. Only the first syntax error is reported. Input, nesting, and interactive tree size are bounded. See README.md for the full grammar and limits.

## How does the UI connect to the backend?
Axios posts `{source, options}` to Flask through the Vite `/api` proxy. Flask returns actual tokens, an AST, verified output, statistics, and diagnostics. React Flow displays AST nodes. Monaco displays source, markers, and whitespace-aware diffs. Changing source/settings invalidates the previous analysis so stale results are not presented as current.

## Suggested five-minute demonstration
1. Explain the problem using the messy sample.
2. Format it with four spaces, then tabs and next-line braces.
3. Open the real token table and filter identifiers or keywords.
4. Open the tree and identify a FunctionDeclaration, IfStatement, and BinaryExpression.
5. Show whitespace changes in Comparison and download the result.
6. Upload invalid.c and explain the missing semicolon diagnostic.
7. Show the automated tests, grammar functions, and safety comparison.
8. Finish by stating the exact supported subset and the absence of semantic analysis.

## Questions to prepare for
- Where are regular expressions used? In lexical rules, not as a replacement for parsing.
- Why LALR(1)? It is a table-driven bottom-up method supported by PLY and suitable for this grammar.
- Where are comments kept? In original token metadata, separately from AST children.
- Why preserve parentheses? Removing them can change grouping or meaning.
- What happens on failure? No formatted code is returned; diagnostics identify the problem.
- What is next? Grammar extensions, comment attachment, semantic checks, better error recovery, and compiler-backed execution comparisons.
