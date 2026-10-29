from collections import Counter
from difflib import SequenceMatcher


def statistics(source, table, ast, errors, output=None):
    categories = Counter(t['category'] for t in table)
    constructs = Counter()
    def walk(n):
        constructs[n['type']] += 1
        for child in n.get('children', []):
            walk(child)
    if ast:
        walk(ast)
    changed = 0
    if output is not None:
        for tag, a, b, c, d in SequenceMatcher(None, source.splitlines(), output.splitlines(), autojunk=False).get_opcodes():
            if tag != 'equal':
                changed += max(b - a, d - c)
    return dict(lines=len(source.splitlines()), tokens=len(table), keywords=categories['keyword'],
                identifiers=categories['identifier'], operators=categories['operator'],
                syntaxErrors=sum(e['category'] == 'syntax' for e in errors),
                lexicalErrors=sum(e['category'] == 'lexical' for e in errors),
                linesChanged=changed, distribution=dict(categories), constructs=dict(constructs))
