"""PLY LALR(1) parser. Comments/directives remain in the source token stream."""
import threading
from functools import wraps
import ply.yacc as yacc
from .lexer import tokens
from .ast_nodes import node
from .diagnostics import CompileError, location


class Grammar:
    tokens = tokens
    precedence = (
        ('nonassoc', 'IF_WITHOUT_ELSE'), ('nonassoc', 'ELSE'),
        ('right', 'ASSIGN', 'ADD_ASSIGN', 'SUB_ASSIGN', 'MUL_ASSIGN', 'DIV_ASSIGN', 'MOD_ASSIGN'),
        ('left', 'OR'), ('left', 'AND'), ('left', 'EQ', 'NE'),
        ('left', 'LT', 'GT', 'LE', 'GE'), ('left', 'PLUS', 'MINUS'),
        ('left', 'STAR', 'SLASH', 'MOD'), ('right', 'UNARY'),
        ('left', 'INC', 'DEC'),
    )

    def __init__(self):
        self.parser = yacc.yacc(module=self, start='program', write_tables=False, debug=False,
                                errorlog=yacc.NullLogger())

    def p_program(self, p):
        'program : externals'
        p[0] = node('Program', p[1])

    def p_externals(self, p):
        '''externals : externals external
                     | empty'''
        p[0] = p[1] + [p[2]] if len(p) == 3 else []

    def p_external(self, p):
        '''external : declaration SEMI
                    | type IDENTIFIER LPAREN parameters RPAREN block'''
        p[0] = p[1] if len(p) == 3 else node('FunctionDeclaration', p[4] + [p[6]],
                    p.slice[2], name=p[2], returnType=p[1])

    def p_type(self, p):
        '''type : INT
                | FLOAT
                | DOUBLE
                | CHAR
                | VOID'''
        p[0] = p[1]

    def p_parameters(self, p):
        '''parameters : parameter_list
                      | VOID
                      | empty'''
        p[0] = p[1] if isinstance(p[1], list) else []

    def p_parameter_list(self, p):
        '''parameter_list : parameter
                          | parameter_list COMMA parameter'''
        p[0] = [p[1]] if len(p) == 2 else p[1] + [p[3]]

    def p_parameter(self, p):
        'parameter : type IDENTIFIER'
        p[0] = node('Parameter', token=p.slice[2], name=p[2], dataType=p[1])

    def p_declaration(self, p):
        'declaration : type declarators'
        p[0] = node('VariableDeclaration', p[2], dataType=p[1])

    def p_declarators(self, p):
        '''declarators : declarator
                       | declarators COMMA declarator'''
        p[0] = [p[1]] if len(p) == 2 else p[1] + [p[3]]

    def p_declarator(self, p):
        '''declarator : IDENTIFIER
                      | IDENTIFIER ASSIGN expression
                      | IDENTIFIER LBRACKET expression RBRACKET'''
        p[0] = node('VariableDeclarator', [] if len(p) == 2 else [p[3]],
                    p.slice[1], name=p[1], array=len(p) == 5)

    def p_block(self, p):
        'block : LBRACE statements RBRACE'
        p[0] = node('BlockStatement', p[2], p.slice[1])

    def p_statements(self, p):
        '''statements : statements statement
                      | empty'''
        p[0] = p[1] + [p[2]] if len(p) == 3 else []

    def p_statement_simple(self, p):
        '''statement : block
                     | declaration SEMI
                     | expression SEMI
                     | SEMI'''
        if len(p) == 2:
            p[0] = p[1] if isinstance(p[1], dict) else node('EmptyStatement', token=p.slice[1])
        else:
            p[0] = p[1] if p[1]['type'] == 'VariableDeclaration' else node('ExpressionStatement', [p[1]])

    def p_statement_if(self, p):
        '''statement : IF LPAREN expression RPAREN statement %prec IF_WITHOUT_ELSE
                     | IF LPAREN expression RPAREN statement ELSE statement'''
        p[0] = node('IfStatement', [p[3], p[5]] + ([p[7]] if len(p) == 8 else []), p.slice[1])

    def p_statement_while(self, p):
        'statement : WHILE LPAREN expression RPAREN statement'
        p[0] = node('WhileStatement', [p[3], p[5]], p.slice[1])

    def p_statement_for(self, p):
        'statement : FOR LPAREN for_init SEMI optional_expression SEMI optional_expression RPAREN statement'
        p[0] = node('ForStatement', [p[3], p[5], p[7], p[9]], p.slice[1])

    def p_for_init(self, p):
        '''for_init : declaration
                    | optional_expression'''
        p[0] = p[1]

    def p_optional(self, p):
        '''optional_expression : expression
                               | empty'''
        p[0] = p[1] or node('EmptyExpression')

    def p_return(self, p):
        'statement : RETURN optional_expression SEMI'
        p[0] = node('ReturnStatement', [p[2]], p.slice[1])

    def p_jump(self, p):
        '''statement : BREAK SEMI
                     | CONTINUE SEMI'''
        p[0] = node('BreakStatement' if p[1] == 'break' else 'ContinueStatement', token=p.slice[1])

    def p_expression_binary(self, p):
        '''expression : expression PLUS expression
                      | expression MINUS expression
                      | expression STAR expression
                      | expression SLASH expression
                      | expression MOD expression
                      | expression EQ expression
                      | expression NE expression
                      | expression LT expression
                      | expression GT expression
                      | expression LE expression
                      | expression GE expression
                      | expression AND expression
                      | expression OR expression
                      | expression ASSIGN expression
                      | expression ADD_ASSIGN expression
                      | expression SUB_ASSIGN expression
                      | expression MUL_ASSIGN expression
                      | expression DIV_ASSIGN expression
                      | expression MOD_ASSIGN expression'''
        assignment = p[2] in ('=', '+=', '-=', '*=', '/=', '%=')
        if assignment and p[1]['type'] not in ('Identifier', 'IndexExpression'):
            raise CompileError('Assignment requires an identifier or array element.', p.slice[2].lineno,
                               p.slice[2].column)
        p[0] = node('AssignmentExpression' if assignment else 'BinaryExpression',
                    [p[1], p[3]], p.slice[2], operator=p[2])

    def p_expression_unary(self, p):
        '''expression : PLUS expression %prec UNARY
                      | MINUS expression %prec UNARY
                      | NOT expression %prec UNARY
                      | AMP expression %prec UNARY
                      | INC expression %prec UNARY
                      | DEC expression %prec UNARY'''
        p[0] = node('UnaryExpression', [p[2]], p.slice[1], operator=p[1])

    def p_expression_postfix(self, p):
        '''expression : postfix
                      | postfix INC
                      | postfix DEC'''
        p[0] = p[1] if len(p) == 2 else node('UpdateExpression', [p[1]], p.slice[2], operator=p[2])

    def p_postfix(self, p):
        '''postfix : primary
                   | postfix LPAREN arguments RPAREN
                   | postfix LBRACKET expression RBRACKET'''
        p[0] = p[1] if len(p) == 2 else node('FunctionCall' if p[2] == '(' else 'IndexExpression',
                      [p[1]] + (p[3] if isinstance(p[3], list) else [p[3]]))

    def p_arguments(self, p):
        '''arguments : argument_list
                     | empty'''
        p[0] = p[1] or []

    def p_argument_list(self, p):
        '''argument_list : expression
                         | argument_list COMMA expression'''
        p[0] = [p[1]] if len(p) == 2 else p[1] + [p[3]]

    def p_primary(self, p):
        '''primary : IDENTIFIER
                   | NUMBER
                   | STRING
                   | CHARACTER
                   | LPAREN expression RPAREN'''
        p[0] = p[2] if len(p) == 4 else node('Identifier' if p.slice[1].type == 'IDENTIFIER'
                                             else 'Literal', token=p.slice[1], value=p[1])

    def p_empty(self, p):
        'empty :'
        p[0] = None

    def p_error(self, t):
        if t:
            raise CompileError(f'Unexpected {t.value!r} ({t.type}). Check the preceding statement.',
                               t.lineno, t.column, suggestion='Check semicolons, matching delimiters, and supported declarations.')
        raise CompileError('Unexpected end of input. A statement or closing delimiter is missing.',
                           **location(self.source, len(self.source)),
                           suggestion='Complete the statement and close all parentheses and braces.')


def _with_range(rule):
    @wraps(rule)
    def reduction(self, p):
        rule(self, p)
        starts, ends = [], []
        for symbol in p.slice[1:]:
            start = getattr(symbol, 'start_offset', getattr(symbol, 'lexpos', None))
            end = getattr(symbol, 'end_offset', None)
            if end is None and getattr(symbol, 'lexpos', None) is not None:
                end = symbol.lexpos + len(str(symbol.value))
            if start is not None:
                starts.append(start)
            if end is not None:
                ends.append(end)
        p.slice[0].start_offset = min(starts) if starts else None
        p.slice[0].end_offset = max(ends) if ends else None
        if isinstance(p[0], dict) and starts and ends:
            p[0]['sourceRange'] = dict(start=min(starts), end=max(ends))
            if 'location' not in p[0]:
                p[0]['location'] = dict(**location(self.source, min(starts)), offset=min(starts))
    return reduction


for _name in list(vars(Grammar)):
    if _name.startswith('p_') and _name != 'p_error':
        setattr(Grammar, _name, _with_range(getattr(Grammar, _name)))

_grammar = Grammar()
_lock = threading.Lock()


def parse(source, raw):
    stream = iter(t for t in raw if t.type not in ('WHITESPACE', 'COMMENT', 'DIRECTIVE'))
    with _lock:
        _grammar.source = source
        return _grammar.parser.parse(lexer=None, tokenfunc=lambda: next(stream, None), tracking=False)
