# CodeCraft — Intelligent Code Auto Formatter

A complete Compiler Construction project: a custom source-preserving C formatter with a real PLY lexer, LALR(1) parser, AST, Flask API, and interactive React workspace.

## Abstract and problem statement

Inconsistent indentation and whitespace make source code difficult to read. Text replacement alone cannot distinguish punctuation inside literals, nested statements, and unary operators. CodeCraft recognizes a documented C subset, constructs a syntax tree, formats the original lexemes, and verifies the result by lexing and parsing it again. It demonstrates compiler front-end concepts without generating machine code.

Objectives: make code readable, preserve comments and literals, expose tokens and ASTs, explain syntax errors, support configurable layout, and provide a polished college demonstration.

## Run locally

Requires Python 3.10+ and Node.js 20.19+ (Node 22+ recommended). Run from this repository root.

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend/requirements.txt
.\.venv\Scripts\python backend/app.py
```

Open a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. The backend listens on **http://127.0.0.1:5000**; Vite proxies `/api` to it. Keep both terminals running. Press Ctrl+C to stop each process. The application uses locally bundled Monaco assets; it does not require a Monaco CDN.

Linux/macOS backend equivalent:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
.venv/bin/python backend/app.py
```

If Windows `venv` fails during `ensurepip`, the environment executable may already exist. Bootstrap its dependencies using the base Python's pip:

```powershell
python -m pip --python "$PWD\.venv\Scripts\python.exe" install -r backend/requirements.txt
```

`PORT` may be set in the backend process environment; `.env.example` is an example, not an automatically loaded file. Update the Vite proxy if changing the port. This is a local academic application; the Flask development server is not a production deployment.

## Demonstration

1. Open the preloaded sample or upload `examples/sample.c`.
2. Choose indentation, braces, and blank lines; press **Format Code** or **Ctrl+Enter**.
3. Inspect actual statistics and the diagnostics panel.
4. Open **Token Analyzer**, search/filter the token table, and export CSV.
5. Open **Syntax Tree**, zoom/pan, and select a node to inspect its metadata and reveal the source.
6. Open **Comparison** and switch between side-by-side and inline diff.
7. Copy or download `formatted.c`; switch between dark and light themes.
8. Upload `examples/invalid.c` to demonstrate a missing-semicolon diagnostic. Select it to reveal the error location.
9. Use `examples/nested.c` for loops, arrays, comments, and literals.

Editing source or settings invalidates displayed analysis and output immediately. Analyze again to update it. Clear empties source/results; Reset restores the sample and defaults. Defaults resets formatting options only. Browser clipboard permissions apply; direct editor paste remains available if clipboard API access is denied. C is the only supported language and is labeled explicitly.

## Architecture and stack

```text
React + Vite + Tailwind + Framer Motion + Lucide
    Monaco source / diff editors · React Flow AST · Axios
                           │ POST /api/format
                           ▼
                    Flask + Flask-CORS
                           │
PLY Lex → tokens with source metadata → PLY Yacc → AST
                           │                       │
                           └── original lexemes ───┤
                                                   ▼
                                Custom layout renderer
                                                   │
                            Re-lex + re-parse + compare
                                                   ▼
                             output + diagnostics + statistics
```

```text
backend/
  app.py                  REST validation and pipeline
  compiler/
    lexer.py              PLY scanner and source token table
    parser.py             PLY LALR(1) grammar and source ranges
    ast_nodes.py          JSON nodes and structural comparison
    formatter.py          AST-guided, source-preserving renderer
    analyzer.py           token/AST counts and changed-line metric
    diagnostics.py        consistent source diagnostics
  tests/                  lexer, parser, formatter, API tests
frontend/
  src/App.jsx             workspace views, state, navigation, settings
  src/components/         Monaco, token table, React Flow AST
  src/services/api.js     matching API transport
  tests/workflow.spec.js  real-browser integration tests
examples/                 valid and invalid demo programs
VIVA_GUIDE.md             presentation preparation
```

## Supported grammar

This is a syntax subset, not a complete C implementation. Below, `{ X }` means repetition and `[ X ]` means optional. Literal punctuation is quoted. Exact executable productions and precedence are in `backend/compiler/parser.py`.

```ebnf
program       = { external } ;
external      = declaration ";" | type identifier "(" parameters ")" block ;
type          = "int" | "float" | "double" | "char" | "void" ;
parameters    = [ "void" | parameter { "," parameter } ] ;
parameter     = type identifier ;
declaration   = type declarator { "," declarator } ;
declarator    = identifier [ "=" expression | "[" expression "]" ] ;
block         = "{" { statement } "}" ;
statement     = block | declaration ";" | expression ";" | ";"
              | "if" "(" expression ")" statement [ "else" statement ]
              | "while" "(" expression ")" statement
              | "for" "(" [ declaration | expression ] ";"
                [ expression ] ";" [ expression ] ")" statement
              | "return" [ expression ] ";"
              | "break" ";" | "continue" ";" ;
expression    = primary | postfix | unary expression
              | expression binary expression ;
primary       = identifier | number | string | character | "(" expression ")" ;
postfix       = primary { "(" [ expression { "," expression } ] ")"
              | "[" expression "]" } [ "++" | "--" ] ;
unary         = "+" | "-" | "!" | "&" | "++" | "--" ;
binary        = "+" | "-" | "*" | "/" | "%" | "==" | "!=" | "<" | ">"
              | "<=" | ">=" | "&&" | "||" | "=" | "+=" | "-=" | "*=" | "/=" | "%=" ;
```

Operator precedence, lowest to highest: assignments (right associative), `||`, `&&`, equality, comparisons, addition/subtraction, multiplication/division/remainder, prefix unary, postfix updates. Binary arithmetic/logical operators are left associative. Calls/indexing are postfix productions. `else` binds to the nearest unmatched `if`. Assignment targets are restricted to identifiers or index expressions; broader semantic validation is not performed.

The grammar accepts some syntactically valid forms that a full C compiler may reject semantically, such as a void variable, break outside a loop, invalid operand types, or undeclared identifiers. CodeCraft does not claim to type-check them.

## Lexical analysis

PLY Lex uses ordered token rules and longest explicitly ordered operator alternatives. It recognizes ASCII identifiers, decimal integer/floating constants (including exponents), escaped strings/characters, keywords, operators, delimiters, line/block comments, whitespace/newlines, and standalone `#include <header>` or `#include "header"` lines. Columns and lines are 1-based; offsets are 0-based Python string character positions. Token rows omit whitespace but retain comments and include directives; whitespace tokens remain in the internal source stream.

Only decimal numeric spellings without suffixes are supported; hex constants, numeric suffixes, wide/raw literals, and adjacent-string concatenation are outside the subset. Leading-zero integer spellings are preserved as-is; numeric values are never evaluated. Includes are preserved, not executed or expanded. Complex preprocessor directives, line splicing, and trigraphs are rejected. Comments/literals are preserved exactly, including internal newlines and trailing spaces inside comments.

## Parsing algorithm and AST

PLY Yacc builds LALR(1) parsing tables from the grammar functions. Its parser shifts tokens, reduces grammar productions, and constructs JSON AST nodes. Whitespace, comments, and directives bypass the grammar but remain available to the formatter. Each node has `type`, `children`, construct-specific fields, and source coordinates/ranges when present. A reduction wrapper propagates half-open `sourceRange: {start, end}` offsets through the grammar. AST children express structure; comments/directives live in the separate token stream.

Node types include Program, FunctionDeclaration, Parameter, VariableDeclaration, VariableDeclarator, BlockStatement, ExpressionStatement, AssignmentExpression, BinaryExpression, UnaryExpression, UpdateExpression, IfStatement, WhileStatement, ForStatement, ReturnStatement, FunctionCall, IndexExpression, Identifier, Literal, EmptyStatement, EmptyExpression, BreakStatement, and ContinueStatement.

Errors stop the parse at the first unexpected token or end of input. Diagnostics provide category, message, line/column, and a suggested check. Lexical errors are collected before parsing and shown separately. Positions are not guessed from the formatted output.

## Formatting algorithm and safety

1. Parse the source successfully; never format invalid input.
2. Traverse its AST to identify unary operator offsets, exact unbraced-body ranges, and function boundaries.
3. Render the original token lexemes with deterministic spacing, brace placement, block indentation, AST-guided unbraced-body indentation, newlines, and optional blank lines between functions.
4. Preserve literal/comment/directive lexemes; no expressions are evaluated or reordered, and no braces or parentheses are added/removed.
5. Re-lex and re-parse the result. Require the identical ordered non-whitespace token sequence, including comments/directives, and the identical AST after removing source metadata.
6. Return output only when those checks pass. Tests additionally check idempotence across all six indentation/brace combinations.

This is not regex-only formatting: syntax validity, precedence, unary classification, statement boundaries, indentation, and verification depend on a parsed tree. Re-lexing protects against accidental operator merging and comment changes. The checks support preservation within the documented subset, but do not prove semantic equivalence for arbitrary C, macro-dependent input, undefined behavior, or implementation-defined features. Header macros are not expanded; code whose meaning depends on macro stringification or token pasting is outside the supported subset.

Empty blocks use two lines (opening brace and closing brace). Comments are kept in token order; they may move onto separate lines. Multiline comment interiors remain unchanged, rather than being reindented. Comments are not attached as AST children.

## API documentation

All POST requests use JSON `{ "source": "..." }`; `/api/format` additionally accepts:

```json
{"source":"int main(){return 0;}","options":{"indent":"4","braceStyle":"same-line","blankLines":true}}
```

`indent` is `"2"`, `"4"`, or `"tab"`. `braceStyle` is `"same-line"` or `"next-line"`. `blankLines` is boolean. Missing options use the values above; unknown/invalid settings are rejected.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/health` | `{ok:true,data:{status:"healthy",language:"C subset",parser:"PLY LALR(1)"}}` |
| `POST /api/tokenize` | Tokens and lexical diagnostics; AST/output null |
| `POST /api/parse` | Tokens, AST, diagnostics, statistics; formatted null |
| `POST /api/format` | Complete analysis and verified formatted output |
| `POST /api/analyze` | Tokens, AST, structural counts, statistics; formatted null |

Pipeline response:

```json
{
  "ok": true,
  "data": {
    "tokens": [{"number":1,"lexeme":"int","type":"INT","line":1,"column":1,"offset":0,"category":"keyword"}],
    "ast": {"type":"Program","children":[]},
    "formatted": "int main() {\n    return 0;\n}\n",
    "statistics": {"lines":1,"tokens":9,"keywords":2,"identifiers":1,"operators":0,"syntaxErrors":0,"lexicalErrors":0,"executionMs":1.2,"linesChanged":3,"distribution":{},"constructs":{}}
  },
  "diagnostics": []
}
```

The above demonstrates field shapes; AST/tokens are abbreviated. Statistics always come from analysis. `executionMs` includes lexing, parsing, formatting, safety checks, and statistics, but excludes HTTP transport and serialization. `linesChanged` sums `max(original span length, formatted span length)` for each non-equal `difflib.SequenceMatcher` line opcode (`autojunk=False`); it counts additions, removals, and replacements under that metric, and is zero for non-format endpoints. Syntax error count is the number reported (currently at most one), not an estimate of all latent errors.

Diagnostic example: `{ "category":"syntax", "message":"Unexpected ...", "line":3, "column":1, "suggestion":"Check semicolons..." }`.

HTTP 200 success; 400 malformed input/options; 404 unknown route; 413 size exceeded; 422 lexical/syntax/formatting error; 500 sanitized unexpected server error. Request-level errors return `{ok:false,diagnostics:[...]}` without `data`. Analysis errors retain the token table/statistics and use null output. Request body limit: 128 KiB; source: 50,000 characters / 3,000 lines; AST: 150 levels; interactive visualization: at most 2,000 nodes. CORS allows local Vite origins on port 5173.

## Sample input and output

Input:

```c
int main(){int x=1;if(x>0){x+=2;}return x;}
```

Default output:

```c
int main() {
    int x = 1;
    if (x > 0) {
        x += 2;
    }
    return x;
}
```

## Tests and builds

```powershell
.\.venv\Scripts\python -m pytest backend/tests -q -p no:cacheprovider
cd frontend
npm run build
```

Browser tests (start both servers first):

```powershell
cd frontend
npx playwright install chromium
npm run test:e2e
```

If a compatible Chromium is already installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its executable path. Tests exercise formatting, real statistics, token search/filter/CSV, AST rendering, diff modes, actual settings, download, theme, documentation, upload diagnostics, reset, clear, and mobile overflow. Screenshots are written to `frontend/tests/desktop.png` and `mobile.png`. Clipboard API errors are handled in the app; clipboard access is browser-policy dependent.

The backend suite checks token locations, escaped literals, multiline/line comments, supported/invalid grammar, precedence, dangling else, nested control flow, exact indentation, empty blocks, every brace/indent combination, preservation, idempotence, HTTP schemas, validation, complexity limits, and unsupported constructs. No C compiler was available in the development environment, so no compile/run equivalence claim is made.

## Verification recorded during implementation

- 104 backend tests passed with pytest.
- All four Chromium workflow tests passed (three application/mobile workflows plus the clipboard/keyboard workflow, run in a focused follow-up).
- Vite production build completed successfully. Monaco contributes a large JavaScript bundle; Vite emits a chunk-size advisory.
- Desktop and 390px mobile layouts were inspected; mobile overflow was checked automatically.
- No system C compiler was available, so executable before/after behavior was not tested.

## Limitations and future scope

Not supported: full preprocessing/macros, pointer declarations/dereferences, structs/unions/enums, typedefs/qualifiers, function pointers/prototypes, casts, switch/do-while/goto, ternary/bitwise/comma expressions, multidimensional declarations, initializer lists, or full C literal syntax. No symbol table, semantic analysis, optimization, or machine-code generation. Compiler phases do not execute source code. Source uses Python character offsets; diagnostics after non-BMP characters inside comments/literals may differ from Monaco's UTF-16 column conventions.

Future work: extend the grammar with explicit test coverage, attach comments to concrete syntax nodes, add symbol/type analysis, recover from multiple syntax errors, improve tree layout for large programs, and compare representative executable behavior with a system C compiler.
