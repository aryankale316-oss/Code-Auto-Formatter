import re
import ply.lex as lex
from .diagnostics import location

KEYWORDS = {word: word.upper() for word in
            'int float double char void if else while for return break continue'.split()}
OPERATORS = {'++': 'INC', '--': 'DEC', '+=': 'ADD_ASSIGN', '-=': 'SUB_ASSIGN',
             '*=': 'MUL_ASSIGN', '/=': 'DIV_ASSIGN', '%=': 'MOD_ASSIGN',
             '==': 'EQ', '!=': 'NE', '<=': 'LE', '>=': 'GE', '&&': 'AND', '||': 'OR',
             '+': 'PLUS', '-': 'MINUS', '*': 'STAR', '/': 'SLASH', '%': 'MOD',
             '=': 'ASSIGN', '<': 'LT', '>': 'GT', '!': 'NOT', '&': 'AMP',
             '(': 'LPAREN', ')': 'RPAREN', '{': 'LBRACE', '}': 'RBRACE',
             '[': 'LBRACKET', ']': 'RBRACKET', ';': 'SEMI', ',': 'COMMA'}
tokens = tuple(KEYWORDS.values()) + tuple(OPERATORS.values()) + (
    'IDENTIFIER', 'NUMBER', 'STRING', 'CHARACTER', 'COMMENT', 'DIRECTIVE', 'WHITESPACE')


class Scanner:
    tokens = tokens

    def __init__(self, source):
        self.source = source
        self.errors = []
        self.lexer = lex.lex(module=self)
        self.lexer.input(source)
        for match in re.finditer(r"\\\r?\n|\?\?[=/'()!<>-]", source):
            self.error('Line splicing and trigraphs are outside the supported C subset.', match.start())

    def t_DIRECTIVE(self, t):
        r'\#[^\n]*'
        # Directives with arbitrary substitutions can change the grammar; reject them.
        if self.source[self.source.rfind('\n', 0, t.lexpos) + 1:t.lexpos].strip() or not re.fullmatch(
                r'#\s*include\s*(?:<[A-Za-z0-9_./-]+>|"[A-Za-z0-9_./-]+")\s*', t.value):
            self.error('Only standalone #include directives are supported.', t.lexpos)
        return t

    def t_COMMENT(self, t):
        r'//[^\n]*|/\*[\s\S]*?\*/'
        t.lexer.lineno += t.value.count('\n')
        return t

    def t_UNTERMINATED_COMMENT(self, t):
        r'/\*(?![\s\S]*?\*/)[\s\S]*'
        self.error('Unterminated block comment.', t.lexpos)
        t.lexer.lineno += t.value.count('\n')

    def t_STRING(self, t):
        r'"(?:[^"\\\n]|\\[^\n])*"'
        return t

    def t_CHARACTER(self, t):
        r"'(?:[^'\\\n]|\\(?:[0-7]{1,3}|x[0-9a-fA-F]+|[^\n]))'"
        return t

    def t_NUMBER(self, t):
        r'(?:\d+\.\d*|\.\d+)(?:[eE][+-]?\d+)?|\d+[eE][+-]?\d+|\d+'
        return t

    def t_IDENTIFIER(self, t):
        r'[A-Za-z_][A-Za-z_0-9]*'
        t.type = KEYWORDS.get(t.value, 'IDENTIFIER')
        return t

    def t_WHITESPACE(self, t):
        r'[\s\ufeff]+'
        t.lexer.lineno += t.value.count('\n')
        return t

    def t_OPERATOR(self, t):
        r'\+\+|--|\+=|-=|\*=|/=|%=|==|!=|<=|>=|&&|\|\||[+*/%=<>!&(){}\[\];,\-]'
        t.type = OPERATORS[t.value]
        return t

    def error(self, message, offset):
        self.errors.append(dict(category='lexical', message=message,
                                **location(self.source, offset), suggestion='Use the documented C subset.'))

    def t_error(self, t):
        if t.value.startswith('/*'):
            self.error('Unterminated block comment.', t.lexpos)
            t.lexer.skip(len(t.value))
        else:
            self.error('Invalid character or unterminated literal: ' + repr(t.value[0]), t.lexpos)
            t.lexer.skip(1)

    def scan(self):
        result = []
        while (t := self.lexer.token()) is not None:
            # PLY's line points at the beginning of the token, including multiline trivia.
            loc = location(self.source, t.lexpos)
            t.lineno, t.column = loc['line'], loc['column']
            result.append(t)
        return result


def tokenize(source):
    scanner = Scanner(source)
    raw = scanner.scan()
    table = []
    for t in raw:
        if t.type == 'WHITESPACE':
            continue
        category = ('keyword' if t.type in KEYWORDS.values() else
                    'identifier' if t.type == 'IDENTIFIER' else
                    'literal' if t.type in ('STRING', 'CHARACTER', 'NUMBER') else
                    'comment' if t.type == 'COMMENT' else
                    'directive' if t.type == 'DIRECTIVE' else
                    'delimiter' if t.value in '(){}[];,' else 'operator')
        table.append(dict(number=len(table) + 1, lexeme=t.value, type=t.type,
                          line=t.lineno, column=t.column, offset=t.lexpos, category=category))
    return raw, table, scanner.errors
