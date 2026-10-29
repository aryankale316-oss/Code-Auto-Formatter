import pytest
from compiler.lexer import tokenize
from compiler.parser import parse
from compiler.diagnostics import CompileError

def tree(source):
    raw, _, errors = tokenize(source)
    assert not errors
    return parse(source, raw)

@pytest.mark.parametrize('source', [
    'int x; float y=1.2; char c=\'a\';',
    'int f(int n){for(int i=0;i<n;i++){while(n>0){if(i==2){break;}else{n--;}}}return n;}',
    'int main(void){int a[5];a[0]=1;printf("%d",a[0]);return 0;}',
    'void f(){return;} int main(){f();return 0;}',
    'int main(){for(;;);while(0){}if(1)if(0)return 1;else return 2;return 0;}',
])
def test_valid(source):
    assert tree(source)['type'] == 'Program'

@pytest.mark.parametrize('source', ['int main(){int x=1 return x;}', 'int main( { }', 'int main(){', 'int x=;', 'int main(){if()return 0;}', 'int *p;', 'struct X {int n;};', 'int f();', 'int main(){switch(x){}}', 'int main(){1=2;}'])
def test_invalid(source):
    with pytest.raises(CompileError) as err:
        tree(source)
    d = err.value.diagnostic
    assert d['category'] == 'syntax' and d['line'] >= 1 and d['column'] >= 1

def test_precedence():
    ast = tree('int x=1+2*3;')
    expression = ast['children'][0]['children'][0]['children'][0]
    assert expression['operator'] == '+'
    assert expression['children'][1]['operator'] == '*'

def test_dangling_else():
    ast = tree('int f(){if(1)if(0)return 1;else return 2;}')
    outer = ast['children'][0]['children'][-1]['children'][0]
    assert len(outer['children']) == 2
    assert len(outer['children'][1]['children']) == 3
