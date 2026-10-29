import { useState } from 'react';
import { Search, Download } from 'lucide-react';
export function download(content, name, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function TokenTable({ tokens, distribution = {} }) {
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all');
  const filtered = tokens.filter(t => (filter === 'all' || t.type === filter) && (t.lexeme + t.type).toLowerCase().includes(query.toLowerCase()));
  const csv = () => download('\ufeff' + [['No.', 'Lexeme', 'Token Type', 'Line', 'Column'], ...filtered.map(t => [t.number, t.lexeme, t.type, t.line, t.column])].map(row => row.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(',')).join('\r\n'), 'codecraft-tokens.csv', 'text/csv');
  return <><div className="token-summary">{Object.entries(distribution).map(([category, count]) => <div className="distribution" key={category}><span>{category}</span><strong>{count}</strong><div style={{ width: `${Math.max(2, count / Math.max(tokens.length, 1) * 100)}%` }}/></div>)}</div>
    <div className="table-toolbar"><label className="search"><Search size={16}/><input aria-label="Search tokens" placeholder="Search lexemes or token types…" value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="Filter token type" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All token types</option>{[...new Set(tokens.map(t => t.type))].sort().map(t => <option key={t}>{t}</option>)}</select><button onClick={csv} disabled={!tokens.length}><Download size={15}/> Export CSV</button></div>
    <div className="token-table"><table><thead><tr><th>No.</th><th>Lexeme</th><th>Token type</th><th>Line</th><th>Column</th></tr></thead><tbody>{filtered.map(t => <tr key={t.number}><td>{String(t.number).padStart(3, '0')}</td><td><code>{t.lexeme}</code></td><td><span className={'badge ' + t.category}>{t.type}</span></td><td>{t.line}</td><td>{t.column}</td></tr>)}</tbody></table>{!filtered.length && <div className="empty">No tokens to display. Format source or adjust the filters.</div>}</div><div className="table-footer">Showing {filtered.length} of {tokens.length} tokens · Source positions are 1-based</div></>;
}
