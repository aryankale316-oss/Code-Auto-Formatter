import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pytest
from app import app
from compiler.lexer import tokenize
from compiler.parser import parse
from compiler.formatter import format_code
from compiler.ast_nodes import structure

@pytest.fixture
def client():
    app.config['TESTING'] = True
    return app.test_client()

@pytest.fixture
def fmt():
    def run(source, **settings):
        raw, _, errors = tokenize(source)
        assert not errors
        ast = parse(source, raw)
        return format_code(source, raw, ast, {'indent': '4', 'braceStyle': 'same-line', 'blankLines': True, **settings})
    return run
