import { useEffect, useRef, useState } from 'react';
import DiffViewer from './components/DiffViewer';
import { motion } from 'framer-motion';
import { Braces, WandSparkles, Code2, Network, BookOpen, Sun, Moon, Upload, Clipboard, Copy, Download, RotateCcw, Trash2, ArrowRightLeft, Check, ChevronRight, Settings2, Terminal, CircleAlert, LoaderCircle, Command, CheckCircle2, Activity } from 'lucide-react';
import CodeEditor from './components/CodeEditor';
import TokenTable, { download } from './components/TokenTable';
import ASTViewer from './components/ASTViewer';
import { analyze } from './services/api';

const SAMPLE = `#include <stdio.h>
// A small program. A real compiler pipeline.
int sum(int n){int total=0;for(int i=1;i<=n;i++){total+=i;}return total;}
int main(){int result=sum(10);if(result>0){printf("Sum: %d\\n",result);}else{printf("Nothing to add.\\n");}return 0;}`;
const DEFAULTS = { indent: '4', braceStyle: 'same-line', blankLines: true };
const tabs = [{ id: 'formatter', label: 'Formatter', icon: Code2 }, { id: 'tokens', label: 'Token Analyzer', icon: Braces }, { id: 'tree', label: 'Syntax Tree', icon: Network }, { id: 'comparison', label: 'Comparison', icon: ArrowRightLeft }, { id: 'docs', label: 'Documentation', icon: BookOpen }];
const readRoute = () => tabs.some(t => t.id === location.hash.slice(1)) ? location.hash.slice(1) : 'formatter';

export default function App() {
  const [tab, setTab] = useState(readRoute), [source, setSource] = useState(SAMPLE), [options, setOptions] = useState(DEFAULTS);
  const [result, setResult] = useState(null), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [inline, setInline] = useState(false);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('codecraft-theme') || 'dark'; } catch { return 'dark'; } });
  const [reveal, setReveal] = useState(null);
  const upload = useRef(), version = useRef(0), runId = useRef(0);
  const [versionState, setVersionState] = useState(0);
  useEffect(() => { const handler = () => setTab(readRoute()); window.addEventListener('hashchange', handler); return () => window.removeEventListener('hashchange', handler); }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('codecraft-theme', theme); } catch {} }, [theme]);
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); } }, [notice]);
  const invalidate = () => { version.current++; setVersionState(version.current); };
  const edit = value => { setSource(value); invalidate(); };
  const changeOption = (key, value) => { setOptions(o => ({ ...o, [key]: value })); invalidate(); };
  const fresh = result && result.version === versionState;
  const data = fresh ? result.data : null, errors = fresh ? result.diagnostics || [] : [];
  const stats = data?.statistics, formatted = data?.formatted ?? '';
  async function run() {
    const capturedVersion = version.current, id = ++runId.current;
    setBusy(true);
    try { const response = await analyze(source, options); if (id === runId.current && capturedVersion === version.current) { setResult({ ...response, version: capturedVersion, original: source }); setNotice(response.ok ? 'Formatting complete. Token stream and AST verified.' : 'Analysis found errors. Select a diagnostic to inspect it.'); } }
    catch (e) { setNotice(e.message); }
    finally { if (id === runId.current) setBusy(false); }
  }
  const runRef = useRef(run); runRef.current = run;
  useEffect(() => { const handler = e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runRef.current(); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, []);
  async function copy() { try { await navigator.clipboard.writeText(formatted); setNotice('Formatted code copied.'); } catch { setNotice('Clipboard access was denied. Select the output and copy it manually.'); } }
  async function paste() { try { edit(await navigator.clipboard.readText()); } catch { setNotice('Clipboard access was denied. Paste directly into the source editor.'); } }
  async function loadFile(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.c') || file.size > 50000) { setNotice('Choose a .c file smaller than 50 KB.'); return; }
    try { edit(await file.text()); setNotice(`Loaded ${file.name}`); } catch { setNotice('Could not read that file.'); }
  }
  function reset() { edit(SAMPLE); setOptions(DEFAULTS); setResult(null); setNotice('Sample and default settings restored.'); }
  function locate(loc) { location.hash = 'formatter'; setTab('formatter'); setReveal({ line: loc.line, column: loc.column }); }
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#formatter"><span className="brand-mark"><Braces size={24}/></span><span>CodeCraft<span className="brand-dot">.</span></span><span className="edition">COMPILER LAB</span></a>
      <nav aria-label="Main navigation">{tabs.filter(t => t.id !== 'comparison').map(({ id, label }) => <a href={'#' + id} key={id} className={tab === id ? 'active' : ''}>{label}</a>)}</nav>
      <button className="icon-button theme-button" aria-label="Toggle color theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>
    </header>
    <main>
      <section className="hero"><div><div className="eyebrow"><span className="live-dot"/> BUILT ON COMPILER FUNDAMENTALS <span className="version">v1.0</span></div><h1>Messy code. <span>Clear thinking.</span></h1><p>Transform your C code. Explore every token. Understand the structure.</p></div><div className="pipeline-pill"><span className="mini-icon"><Network size={18}/></span><div><strong>A real compiler pipeline</strong><small>Tokenize <ChevronRight size={11}/> Parse <ChevronRight size={11}/> Format</small></div></div></section>
      <div className="workspace-tabs" role="tablist">{tabs.map(({ id, label, icon: Icon }) => <button role="tab" aria-selected={tab === id} className={tab === id ? 'selected' : ''} key={id} onClick={() => { location.hash = id; setTab(id); }}><Icon size={16}/>{label}{id === 'tokens' && stats && <span className="tab-count">{stats.tokens}</span>}</button>)}<span className="workspace-label"><span className="live-dot"/> LOCAL WORKSPACE</span></div>
      {tab !== 'docs' && <div className="analysis-status"><span>{busy ? 'Analyzing source…' : fresh ? result.ok ? 'Analysis is up to date' : 'Analysis completed with diagnostics' : 'Source or settings changed — format to update analysis'}</span><button onClick={run} disabled={busy || !source.trim()}>{busy ? <LoaderCircle className="spin" size={14}/> : <WandSparkles size={14}/>} {tab === 'formatter' ? 'Run analysis' : 'Analyze current source'}</button></div>}
      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {tab === 'formatter' && <>
        <section className="settings-panel"><div className="settings-title"><Settings2 size={17}/><strong>Formatting</strong></div><label>Language<select aria-label="Language" defaultValue="c"><option value="c">C</option></select></label><label>Indentation<select value={options.indent} onChange={e => changeOption('indent', e.target.value)}><option value="2">2 spaces</option><option value="4">4 spaces</option><option value="tab">Tabs</option></select></label><label>Brace style<select value={options.braceStyle} onChange={e => changeOption('braceStyle', e.target.value)}><option value="same-line">Same line</option><option value="next-line">Next line</option></select></label><label className="checkbox-label"><input type="checkbox" checked={options.blankLines} onChange={e => changeOption('blankLines', e.target.checked)}/><span>Blank lines between functions</span></label><button className="subtle-button" onClick={() => { setOptions(DEFAULTS); invalidate(); }}><RotateCcw size={14}/> Defaults</button></section>
        <section className="editor-grid"><div className="editor-panel"><div className="panel-heading"><div><span className="file-icon">C</span><strong>Original source</strong><span className="file-name">main.c</span></div><div><button title="Paste code" aria-label="Paste code" onClick={paste}><Clipboard size={15}/></button><button title="Upload C file" aria-label="Upload C file" onClick={() => upload.current.click()}><Upload size={15}/></button><button title="Clear source" aria-label="Clear source" onClick={() => { edit(''); setResult(null); }}><Trash2 size={15}/></button></div></div><div className="editor-body"><CodeEditor value={source} onChange={edit} theme={theme} diagnostics={errors} reveal={reveal}/></div><div className="editor-footer"><span><span className="small-dot"/> C (supported subset)</span><span>UTF-8 <span className="footer-separator">|</span> {source.split('\n').length} lines</span></div></div>
        <div className="editor-panel"><div className="panel-heading"><div><span className="file-icon violet">C</span><strong>Formatted source</strong>{fresh && result.ok && <span className="verified"><Check size={12}/> Verified</span>}</div><div><button aria-label="Copy formatted code" title="Copy formatted code" disabled={!formatted} onClick={copy}><Copy size={15}/></button><button aria-label="Download formatted code" title="Download formatted code" disabled={!formatted} onClick={() => download(formatted, 'formatted.c')}><Download size={15}/></button></div></div><div className="editor-body">{formatted ? <CodeEditor value={formatted} theme={theme} readOnly/> : <div className="output-empty"><span><WandSparkles size={30}/></span><h3>A little structure goes a long way.</h3><p>Your formatted code will appear here.</p><small>Custom parser. Preserved source. No external formatter.</small></div>}</div><div className="editor-footer"><span><span className={'small-dot ' + (formatted ? 'green' : '')}/>{formatted ? 'Source structure verified' : 'Ready when you are'}</span><span>READ ONLY</span></div></div></section>
        <div className="action-bar"><div><button className="primary-button" disabled={busy || !source.trim()} onClick={run}>{busy ? <LoaderCircle className="spin" size={17}/> : <WandSparkles size={17}/>} {busy ? 'Formatting…' : 'Format Code'}<kbd>Ctrl ↵</kbd></button><button onClick={reset}><RotateCcw size={15}/> Reset</button></div><button disabled={!formatted} onClick={() => { location.hash = 'comparison'; }}><ArrowRightLeft size={15}/> Compare changes <ChevronRight size={15}/></button></div>
      </>}
      {tab === 'tokens' && <section className="surface"><div className="section-heading"><div><h2>Lexical analysis</h2><p>Every lexeme, classified by the PLY scanner.</p></div><span className="badge keyword">{stats?.tokens ?? 0} tokens</span></div><TokenTable tokens={data?.tokens || []} distribution={stats?.distribution}/></section>}
      {tab === 'tree' && <section className="surface"><div className="section-heading"><div><h2>Inside the syntax</h2><p>Pan, zoom, and select a node to inspect it, then choose Reveal source.</p></div><span className="badge keyword">LALR(1) · AST</span></div><ASTViewer key={result?.version ?? 'none'} ast={data?.ast} theme={theme} onLocate={locate}/></section>}
      {tab === 'comparison' && <section className="surface"><div className="section-heading"><div><h2>Every change, in context</h2><p>Whitespace differences are visible. {stats?.linesChanged ?? 0} changed lines.</p></div><label className="checkbox-label"><input type="checkbox" checked={inline} onChange={e => setInline(e.target.checked)}/> Inline comparison</label></div>{formatted ? <div className="diff-wrap"><DiffViewer original={result.original} modified={formatted} inline={inline} theme={theme}/></div> : <div className="empty">Format valid source to compare the original and formatted versions.</div>}</section>}
      {tab === 'docs' && <Documentation/>}
      </motion.div>
      {tab !== 'docs' && <><section className="stats-grid">{[['Source lines', stats?.lines, Code2], ['Total tokens', stats?.tokens, Braces], ['Keywords', stats?.keywords, BookOpen], ['Identifiers', stats?.identifiers, Terminal], ['Operators', stats?.operators, Command], ['Syntax errors', stats?.syntaxErrors, CircleAlert], ['Execution', stats ? `${stats.executionMs.toFixed(2)} ms` : null, Activity], ['Lines changed', stats?.linesChanged, ArrowRightLeft]].map(([label, value, Icon]) => <div className="stat-card" key={label}><div><span>{label}</span><Icon size={15}/></div><strong>{value ?? '—'}</strong></div>)}</section>
      <section className="diagnostics"><div className="diagnostics-title"><Terminal size={16}/><strong>Diagnostics</strong><span className="tab-count">{errors.length}</span><span className="diagnostics-note">LEXER + PARSER</span></div>{errors.length ? ['lexical', 'syntax', 'formatting', 'request', 'internal'].map(category => { const group = errors.filter(e => e.category === category); return group.length ? <div className="error-group" key={category}><strong>{category} errors</strong>{group.map((e, i) => <button className="error-row" key={i} onClick={() => e.line && locate(e)}><CircleAlert size={16}/><span>{e.line ? `Line ${e.line}:${e.column} · ` : ''}{e.message}<small>{e.suggestion}</small></span><ChevronRight size={15}/></button>)}</div> : null; }) : <div className="diagnostics-content">{fresh && result.ok ? <CheckCircle2 size={17}/> : <Terminal size={17}/>}<span>{fresh && result.ok ? 'No lexical or syntax errors found in the supported C subset.' : 'Run the compiler pipeline to see lexical and syntax diagnostics.'}</span></div>}</section></>}
      <footer><span><Braces size={15}/> CodeCraft <span className="footer-separator">/</span> Intelligent Code Auto Formatter</span><span>Made for understanding code. <span className="footer-separator">·</span> Compiler Construction Project</span></footer>
    </main><input type="file" accept=".c" hidden ref={upload} onChange={loadFile}/>{notice && <div className="toast" role="status"><CheckCircle2 size={17}/>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification">×</button></div>}
  </div>;
}
function Documentation() {
  return <section className="surface documentation"><div className="eyebrow">UNDER THE HOOD</div><h2>Formatting is a compiler problem.</h2><p>CodeCraft uses a custom Python compiler pipeline. It analyzes syntax, builds an abstract syntax tree, and applies layout to the original tokens. No external formatter or formatting service is used.</p><div className="doc-steps">{[['01', 'Lexical analysis', 'PLY Lex recognizes keywords, identifiers, literals, operators, comments, and include directives. Every token retains its original lexeme and source location.'], ['02', 'Syntax analysis', 'A PLY Yacc LALR(1) parser applies a context-free grammar with operator precedence. It builds an AST and reports the first syntax error with a line and column.'], ['03', 'Safe formatting', 'AST metadata distinguishes unary operators. A source-preserving token renderer lays out statements and blocks. The output is lexed and parsed again; the non-whitespace token stream and location-free AST must match.']].map(([n, title, body]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div><div className="doc-columns"><article><h3>Supported C subset</h3><ul><li>int, float, double, char, void types</li><li>Functions with scalar parameters; local and global declarations</li><li>One-dimensional array declarations and indexing</li><li>Arithmetic, comparisons, logical operators, assignments</li><li>Prefix unary operators, postfix increment and decrement</li><li>if / else, for, while, return, break, continue</li><li>Nested blocks, calls, comments, and standalone #include</li></ul></article><article><h3>Boundaries, clearly defined</h3><p>No pointer declarations, structs, typedefs, casts, switch, do/while, ternary operators, bitwise expressions, initializer lists, function prototypes, or macros. No full semantic analysis or type checking. Includes are preserved, not expanded. Unsupported syntax fails safely.</p><p>Unbraced statement bodies retain their structure and receive AST-guided indentation. Only the first syntax error is reported. Large trees are bounded for browser performance.</p></article></div><h3>Try it</h3><p>Paste C code or upload a .c file, choose your formatting options, and press Ctrl + Enter. Open Token Analyzer for the real token stream, Syntax Tree for the AST, or Comparison for a whitespace-aware diff. Statistics belong to the latest analyzed source; editing invalidates them.</p><h3>API contract</h3><pre>{`POST /api/tokenize  { source: string }
POST /api/parse     { source: string }
POST /api/format    { source: string, options?: {
  indent: "2" | "4" | "tab",
  braceStyle: "same-line" | "next-line", blankLines: boolean
} }
POST /api/analyze  { source: string }
GET  /api/health

{ ok: boolean, data: { tokens, ast, formatted, statistics },
  diagnostics: [{ category, message, line, column, suggestion }] }

200 success · 400 invalid request · 413 too large · 422 analysis error`}</pre><p>See README.md for the formal grammar, installation steps, API examples, and test instructions. VIVA_GUIDE.md explains the compiler concepts for your presentation.</p></section>;
}
