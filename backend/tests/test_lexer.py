from compiler.lexer import tokenize

def test_tokens_and_coordinates():
    _, ts, errors = tokenize('int x=12;\n  x+=1.5e-2; // hi\n')
    assert not errors
    assert [(t['type'], t['lexeme']) for t in ts[:5]] == [('INT','int'),('IDENTIFIER','x'),('ASSIGN','='),('NUMBER','12'),('SEMI',';')]
    assert ts[5]['line'] == 2 and ts[5]['column'] == 3
    assert ts[6]['type'] == 'ADD_ASSIGN'
    assert ts[-1]['type'] == 'COMMENT'

def test_literals_comments_and_escapes():
    source = r'''int main(){printf("a;{\\\"}");char c='\'';/* a
b */return 0;}'''
    _, ts, errors = tokenize(source)
    assert not errors
    assert any(t['type'] == 'STRING' for t in ts)
    assert any(t['type'] == 'CHARACTER' for t in ts)
    assert next(t for t in ts if t['type'] == 'RETURN')['line'] == 2

def test_invalid_lexemes():
    for source in ('int x=@;', '/* unterminated', '"unterminated', '#define X 3\nint x;'):
        _, _, errors = tokenize(source)
        assert errors and errors[0]['category'] == 'lexical'

def test_include():
    _, ts, errors = tokenize('#include <stdio.h>\nint main(){}')
    assert not errors and ts[0]['type'] == 'DIRECTIVE'

def test_line_splicing_rejected():
    _, _, errors = tokenize('// continuation\\\nint x;')
    assert errors and 'splicing' in errors[0]['message']
