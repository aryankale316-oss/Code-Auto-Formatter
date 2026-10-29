const { chromium } = require('./frontend/node_modules/playwright');
const fs = require('fs');
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@page{size:A4;margin:19mm}body{font:11pt Arial,sans-serif;color:#243247;line-height:1.48}h1{font-size:29pt;color:#123c67;margin-bottom:4px}h2{font-size:16pt;color:#123c67;margin-top:23px}h3{font-size:12pt;margin-bottom:5px}p{margin:8px 0}table{border-collapse:collapse;width:100%;font-size:10pt}td,th{border:1px solid #d6dfe8;padding:7px;text-align:left}th{background:#edf3f9}pre{background:#f0f4f8;padding:12px;font:10pt Consolas,monospace;white-space:pre-wrap}blockquote{border-left:3px solid #3975b3;padding-left:14px;margin-left:0}tr,pre,blockquote{break-inside:avoid}.sub{color:#64748b;font-size:13pt}.page{break-before:page}
</style></head><body>
<h1>CodeCraft</h1><p class="sub">Intelligent Code Auto Formatter<br>Project Presentation Guide</p>
<h2>What is the project about?</h2><p>CodeCraft takes poorly formatted C code, checks its syntax, and produces readable code with consistent indentation, spacing, and brace placement. It also displays tokens and an abstract syntax tree so users can understand how their code was analyzed.</p>
<blockquote>Our project applies compiler construction concepts to code formatting. It performs lexical analysis, syntax analysis, and AST construction, then uses that information to format C code while preserving its original tokens and structure.</blockquote>
<h2>Technologies used</h2><table><tr><th>Technology</th><th>Purpose</th></tr><tr><td>Python</td><td>Compiler and formatting logic</td></tr><tr><td>PLY (Python Lex-Yacc)</td><td>Lexer and LALR(1) parser</td></tr><tr><td>Flask and Flask-CORS</td><td>REST API and local cross-origin access</td></tr><tr><td>React and Vite</td><td>Interactive interface, development server, production build</td></tr><tr><td>Tailwind CSS</td><td>Interface styling</td></tr><tr><td>Monaco Editor</td><td>Source editor and code comparison</td></tr><tr><td>React Flow</td><td>Interactive AST visualization</td></tr><tr><td>Axios</td><td>Frontend-to-backend HTTP requests</td></tr><tr><td>Framer Motion and Lucide</td><td>Animations and icons</td></tr><tr><td>pytest and Playwright</td><td>Backend and browser workflow tests</td></tr></table>
<h2 class="page">How we implemented it</h2><p>The application has a React frontend and a Python Flask backend.</p><pre>User enters C code
        ↓
React sends it to the Flask API
        ↓
Lexer converts source into tokens
        ↓
Parser checks syntax and constructs an AST
        ↓
Formatter applies the selected layout
        ↓
Backend verifies the formatted output
        ↓
Frontend displays results and analysis</pre>
<h3>1. Source input and settings</h3><p>The user types or uploads C code in Monaco Editor. Settings include two spaces, four spaces, or tabs; brace placement; and blank lines between functions.</p>
<h3>2. Lexical analysis</h3><p>In backend/compiler/lexer.py, PLY Lex recognizes keywords, identifiers, numbers, strings, operators, punctuation, comments, and supported include directives. It records source positions for token tables and diagnostics.</p><p>For example, <code>int x = 10;</code> becomes the tokens: keyword <code>int</code>, identifier <code>x</code>, assignment operator <code>=</code>, number <code>10</code>, and delimiter <code>;</code>.</p>
<h3>3. Syntax analysis and AST construction</h3><p>In backend/compiler/parser.py, grammar rules written with PLY Yacc produce an LALR(1) parser. The parser checks whether tokens follow the supported C grammar and constructs an Abstract Syntax Tree (AST), a structured representation of the program.</p><pre>return x + 2;

ReturnStatement
└── BinaryExpression (+)
    ├── Identifier: x
    └── Literal: 2</pre><p>Invalid input produces diagnostics with a line, column, message, and suggestion.</p>
<h2 class="page">Formatting and verification</h2><h3>4. Formatting</h3><p>In backend/compiler/formatter.py, the formatter uses the AST to identify nesting, statement boundaries, unary operators, and function boundaries. It renders the original token text with consistent spacing, indentation, and line breaks. It preserves comments and literal contents and rejects invalid input before formatting.</p><p>Input:</p><pre>int main(){int x=1;if(x&gt;0){x+=2;}return x;}</pre><p>Output:</p><pre>int main() {
    int x = 1;
    if (x &gt; 0) {
        x += 2;
    }
    return x;
}</pre>
<h3>5. Verification</h3><p>The backend lexes and parses the formatted output again. It requires the same ordered non-whitespace token sequence, including comments and directives, and the same AST after removing source-position metadata.</p><p>These checks verify token and structural preservation within the supported subset. They do not prove full C semantic equivalence.</p>
<h3>6. Displaying the results</h3><p>The API returns formatted code, tokens, AST, diagnostics, and statistics. React presents an output editor, searchable token analyzer, interactive syntax tree, side-by-side or inline comparison, and statistics. Users can copy or download the output.</p>
<h2>Frontend and backend communication</h2><p>Vite runs on port 5173 and Flask on port 5000. During development, Vite forwards /api requests to Flask. The main endpoint is POST /api/format. Other endpoints provide tokenization, parsing, analysis, and a health check.</p><pre>{
  "source": "int main(){return 0;}",
  "options": {
    "indent": "4",
    "braceStyle": "same-line",
    "blankLines": true
  }
}</pre>
<h2 class="page">Scope and limitations</h2><p>CodeCraft is a compiler front-end application for a documented subset of C. It does not execute source code or generate machine code.</p><p>It supports basic declarations, functions, expressions, conditions, loops, arrays, and return statements. Pointer declarations, structs, full macro preprocessing, switch statements, and other advanced C features are outside the current scope. It does not perform full semantic analysis or type checking.</p>
<h2>Short presentation script</h2><blockquote><p>Our project, CodeCraft, is an intelligent formatter for a subset of C. Its purpose is to improve code readability while demonstrating compiler construction concepts.</p><p>We built the frontend using React and the backend using Python and Flask. For lexical and syntax analysis, we used PLY, which provides Lex and Yacc functionality.</p><p>When a user submits code, the lexer produces tokens. The parser validates those tokens against our grammar and constructs an abstract syntax tree. Our formatter uses this structure to apply consistent indentation and spacing.</p><p>We then tokenize and parse the formatted output again to verify that its tokens and syntax tree remain unchanged. The application also provides a token analyzer, syntax tree visualization, code comparison, and error diagnostics.</p><p>The main learning outcome is implementing and connecting the compiler front-end phases in an interactive application.</p></blockquote>
<h2>Suggested demonstration</h2><ol><li>Format the preloaded sample code.</li><li>Show the token analyzer and explain a few tokens.</li><li>Open the syntax tree and describe its structure.</li><li>Change indentation or brace placement and format again.</li><li>Show the original and formatted code comparison.</li><li>Submit invalid code to demonstrate error reporting.</li></ol>
<h2>Commands to run the project</h2><p>From the project root, use two PowerShell terminals.</p><pre># Terminal 1: backend
.\\.venv\\Scripts\\python.exe backend\\app.py

# Terminal 2: frontend
cd frontend
npm run dev</pre><p>Open http://127.0.0.1:5173 and keep both terminals running.</p>
</body></html>`;
(async()=>{const browser=await chromium.launch({headless:true,channel:"chrome"}); const page=await browser.newPage(); await page.setContent(html); await page.pdf({path:'CodeCraft-Presentation-Guide.pdf',format:'A4',printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="width:100%;text-align:center;font-size:9px;color:#64748b">CodeCraft | Presentation Guide · <span class="pageNumber"></span></div>',margin:{top:'19mm',bottom:'19mm',left:'19mm',right:'19mm'}}); await browser.close();console.log('Created CodeCraft-Presentation-Guide.pdf');})();

