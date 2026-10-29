import os
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from compiler.lexer import tokenize
from compiler.parser import parse
from compiler.formatter import format_code
from compiler.analyzer import statistics
from compiler.diagnostics import CompileError

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 128 * 1024
CORS(app, resources={r'/api/*': {'origins': ['http://localhost:5173', 'http://127.0.0.1:5173']}})
DEFAULTS = dict(indent='4', braceStyle='same-line', blankLines=True)


@app.get('/api/health')
def health():
    return jsonify(ok=True, data=dict(status='healthy', language='C subset', parser='PLY LALR(1)'))


@app.post('/api/<action>')
def pipeline(action):
    if action not in ('tokenize', 'parse', 'format', 'analyze'):
        return jsonify(ok=False, diagnostics=[dict(category='request', message='Unknown endpoint.')]), 404
    start = time.perf_counter()
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get('source'), str):
        return jsonify(ok=False, diagnostics=[dict(category='request', message='Send a JSON object with a source string.')]), 400
    source = payload['source']
    if len(source) > 50000 or len(source.splitlines()) > 3000:
        return jsonify(ok=False, diagnostics=[dict(category='request', message='Maximum source size is 50,000 characters and 3,000 lines.')]), 413
    settings = payload.get('options', {})
    if not isinstance(settings, dict):
        return jsonify(ok=False, diagnostics=[dict(category='request', message='options must be an object.')]), 400
    options = {**DEFAULTS, **settings}
    if (options['indent'] not in ('2', '4', 'tab') or options['braceStyle'] not in ('same-line', 'next-line')
            or type(options['blankLines']) is not bool or set(settings) - set(DEFAULTS)):
        return jsonify(ok=False, diagnostics=[dict(category='request', message='Invalid formatting options.')]), 400
    raw, table, errors = tokenize(source)
    ast, output = None, None
    if not errors and action != 'tokenize':
        try:
            ast = parse(source, raw)
            pending = [(ast, 0)]
            while pending:
                current, depth = pending.pop()
                if depth > 150:
                    ast = None
                    raise CompileError('AST nesting exceeds the supported limit of 150 levels.',
                                       suggestion='Use a smaller expression or reduce statement nesting.')
                pending.extend((child, depth + 1) for child in current.get('children', []))
            if action == 'format':
                output = format_code(source, raw, ast, options)
        except CompileError as exc:
            errors.append(exc.diagnostic)
        except RecursionError:
            ast = None
            errors.append(dict(category='syntax', message='Source nesting exceeds the supported limit.', line=1, column=1))
    stats = statistics(source, table, ast, errors, output)
    stats['executionMs'] = round((time.perf_counter() - start) * 1000, 3)
    return jsonify(ok=not errors, data=dict(tokens=table, ast=ast, formatted=output, statistics=stats),
                   diagnostics=errors), 422 if errors else 200


@app.errorhandler(Exception)
def handle_error(error):
    status = error.code if isinstance(error, HTTPException) else 500
    if status == 500:
        app.logger.exception('Unhandled compiler request')
    return jsonify(ok=False, diagnostics=[dict(category='request' if status < 500 else 'internal',
                    message=error.description if isinstance(error, HTTPException) else 'Internal analysis error.')]), status


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=int(os.environ.get('PORT', '5000')), debug=False)
