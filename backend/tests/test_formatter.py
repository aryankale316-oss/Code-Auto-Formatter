import pytest
from compiler.lexer import tokenize
from compiler.parser import parse
from compiler.ast_nodes import structure

SOURCES = [
    'int main(){int x=1;return x;}',
    'int f(int n){for(int i=0;i<n;i++){while(n>0){if(i!=2){n--;}else{break;}}}return n;}',
    'int f(){if(1)if(0)return 1;else return 2;return 0;}',
    'int main(){printf(";,{}\\\"abc");char c=\'\\\'\';return 0;}',
    '// hello\nint main(){/* multi\n  line */int x=1;// end\nreturn x;}',
    'void f(){} int main(){for(;;){}return 0;}',
    '#include <stdio.h>\nint main(){printf("hi\\n");return 0;}',
    'int main(){int a[3];a[0]=-1;return !a[0];}',
    'int main(){int x=1;x=- -x;return x + +x;}',
    'int main(){// trailing spaces   \nreturn 0;}',
]
@pytest.mark.parametrize('source', SOURCES)
@pytest.mark.parametrize('indent', ['2','4','tab'])
@pytest.mark.parametrize('style', ['same-line','next-line'])
def test_structure_and_idempotence(fmt, source, indent, style):
    output = fmt(source, indent=indent, braceStyle=style)
    assert fmt(output, indent=indent, braceStyle=style) == output
    before, _, _ = tokenize(source)
    after, _, _ = tokenize(output)
    assert structure(parse(source, before)) == structure(parse(output, after))
    assert [(t.type,t.value) for t in before if t.type != 'WHITESPACE'] == [(t.type,t.value) for t in after if t.type != 'WHITESPACE']

def test_indentation_and_braces(fmt):
    output = fmt('int main(){if(1){return 0;}}', indent='2', braceStyle='next-line')
    assert output == 'int main()\n{\n  if (1)\n  {\n    return 0;\n  }\n}\n'

def test_function_blank_lines(fmt):
    source = 'void f(){}void g(){}'
    assert '}\n\nvoid' in fmt(source)
    assert '}\nvoid' in fmt(source, blankLines=False)

def test_unbraced_indentation(fmt):
    assert fmt('int f(){if(1)if(0)return 1;else return 2;return 0;}') == 'int f() {\n    if (1)\n        if (0)\n            return 1;\n        else\n            return 2;\n    return 0;\n}\n'

def test_comment_only_and_empty(fmt):
    assert fmt('') == ''
    assert fmt('// a  ') == '// a  \n'
    assert fmt('/* a\n b */') == '/* a\n b */\n'
