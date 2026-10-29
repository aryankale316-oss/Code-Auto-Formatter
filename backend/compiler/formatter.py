"""AST-guided statement layout with original token lexemes, including trivia."""
from collections import Counter
from .lexer import tokenize
from .parser import parse
from .ast_nodes import structure
from .diagnostics import CompileError


def format_code(source, raw, ast, options):
    unit = '\t' if options['indent'] == 'tab' else ' ' * int(options['indent'])
    # Statement intervals come from PLY reductions, not indentation guesses.
    unary, body_starts, body_ends, function_ends = set(), Counter(), Counter(), set()

    def visit(n):
        kind, children = n['type'], n.get('children', [])
        if kind in ('UnaryExpression', 'UpdateExpression'):
            unary.add(n['location']['offset'])
        if kind == 'FunctionDeclaration':
            function_ends.add(n['sourceRange']['end'])
        if kind in ('IfStatement', 'WhileStatement', 'ForStatement'):
            for body in (children[1:] if kind == 'IfStatement' else [children[-1]]):
                if body['type'] != 'BlockStatement':
                    body_starts[body['sourceRange']['start']] += 1
                    body_ends[body['sourceRange']['end']] += 1
        for child in children:
            visit(child)
    visit(ast)
    ts = [t for t in raw if t.type != 'WHITESPACE']
    lines, current, depth, parens = [], '', 0, []
    previous = None

    def emit(value, space=False):
        nonlocal current
        if not current:
            current = unit * depth
        if space and current.strip() and not current.endswith((' ', '\t')):
            current += ' '
        current += value

    def flush(preserve=False):
        nonlocal current
        if current.strip():
            lines.append(current if preserve else current.rstrip())
        current = ''

    for i, t in enumerate(ts):
        v = t.value
        if body_starts[t.lexpos]:
            flush()
            depth += body_starts[t.lexpos]
        prev = previous.value if previous else ''
        nxt = ts[i + 1].value if i + 1 < len(ts) else ''
        if t.type == 'DIRECTIVE':
            flush(); emit(v); flush(preserve=True)
        elif t.type == 'COMMENT':
            # Block comments can contain newlines and remain byte-for-byte intact.
            emit(v, True)
            flush(preserve=True)
        elif v == '{':
            if options['braceStyle'] == 'next-line':
                flush()
            emit('{', True); flush(); depth += 1
        elif v == '}':
            flush(); depth -= 1; emit('}')
            if nxt == 'else' and options['braceStyle'] == 'same-line':
                pass
            else:
                flush()
                if t.lexpos + len(v) in function_ends and options['blankLines'] and i + 1 < len(ts):
                    lines.append('')
        elif v == 'else':
            if prev != '}' or options['braceStyle'] == 'next-line':
                flush()
            emit(v, True)
        elif v == '(':
            parens.append(prev)
            emit(v, prev in ('if', 'for', 'while'))
        elif v == ')':
            emit(v); parens.pop()
        elif v == '[':
            emit(v)
        elif v == ']':
            emit(v)
        elif v == ';':
            emit(v)
            if parens:
                emit(' ')
            else:
                flush()
        elif v == ',':
            emit(', ')
        elif t.lexpos in unary:
            emit(v, bool(previous and (prev in ('return', '=') or previous.type in ('INT', 'FLOAT', 'CHAR') or
                        (previous.lexpos in unary and prev[-1:] == v[:1] and v[0] in '+-'))))
        elif t.type in ('PLUS', 'MINUS', 'STAR', 'SLASH', 'MOD', 'EQ', 'NE', 'LE', 'GE',
                         'LT', 'GT', 'AND', 'OR', 'ASSIGN', 'ADD_ASSIGN', 'SUB_ASSIGN',
                         'MUL_ASSIGN', 'DIV_ASSIGN', 'MOD_ASSIGN'):
            emit(v, True); emit(' ')
        else:
            space = bool(previous and (prev == ')' or prev == '}' or
                          previous.type in ('IDENTIFIER', 'NUMBER', 'STRING', 'CHARACTER') or
                          previous.type in ('INT', 'FLOAT', 'DOUBLE', 'CHAR', 'VOID', 'RETURN', 'ELSE')))
            # Prevent adjacent unary signs from coalescing into ++ or --.
            if previous and previous.lexpos in unary and prev[-1:] == v[:1] and v in ('+', '-'):
                space = True
            emit(v, space)
        if body_ends[t.lexpos + len(v)]:
            flush()
            depth -= body_ends[t.lexpos + len(v)]
        if t.type not in ('COMMENT', 'DIRECTIVE'):
            previous = t
    flush()
    output = '\n'.join(lines) + ('\n' if lines else '')
    new_raw, _, errors = tokenize(output)
    original_tokens = [(t.type, t.value) for t in raw if t.type != 'WHITESPACE']
    output_tokens = [(t.type, t.value) for t in new_raw if t.type != 'WHITESPACE']
    if errors or original_tokens != output_tokens or structure(parse(output, new_raw)) != structure(ast):
        raise CompileError('Formatting safety check failed; source was not changed.', category='formatting')
    return output
