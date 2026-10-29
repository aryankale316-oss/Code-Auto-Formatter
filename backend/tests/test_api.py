import pytest

@pytest.mark.parametrize('endpoint', ['format','tokenize','parse','analyze'])
def test_success_schema(client, endpoint):
    r = client.post('/api/'+endpoint,json={'source':'int main(){return 0;}'})
    assert r.status_code == 200
    body = r.get_json()
    assert body['ok'] and body['diagnostics'] == []
    assert {'tokens','ast','formatted','statistics'} <= body['data'].keys()
    assert body['data']['statistics']['tokens'] == 9
    if endpoint == 'format': assert body['data']['formatted'].endswith('\n')

@pytest.mark.parametrize('payload', [None,[],{}, {'source':123}, {'source':'int x;', 'options':[]}, {'source':'int x;', 'options':{'indent':'8'}}, {'source':'int x;','options':{'blankLines':'true'}}])
def test_validation(client, payload):
    r = client.post('/api/format',json=payload)
    assert r.status_code == 400 and not r.get_json()['ok']

def test_diagnostic(client):
    r = client.post('/api/format',json={'source':'int main(){\nreturn 0\n}'})
    assert r.status_code == 422
    body = r.get_json()
    assert body['data']['formatted'] is None
    assert body['diagnostics'][0]['line'] == 3
    assert body['diagnostics'][0]['suggestion']

def test_lexical_error(client):
    r = client.post('/api/tokenize',json={'source':'int x=@;'})
    assert r.status_code == 422
    assert r.get_json()['diagnostics'][0]['category'] == 'lexical'

def test_limits_and_routes(client):
    assert client.post('/api/format',json={'source':'a'*50001}).status_code == 413
    assert client.post('/api/format',data='x'*140000,content_type='application/json').status_code == 413
    assert client.post('/api/missing',json={'source':''}).status_code == 404
    assert client.get('/api/health').get_json()['data']['status'] == 'healthy'

def test_options_change_output(client):
    source = 'int main(){return 0;}'
    data = client.post('/api/format',json={'source':source,'options':{'indent':'tab','braceStyle':'next-line'}}).get_json()['data']
    assert data['formatted'] == 'int main()\n{\n\treturn 0;\n}\n'
    assert data['statistics']['linesChanged'] == 4

def test_complexity_limit(client):
    r = client.post('/api/format', json={'source':'int x='+'1+'*400+'1;'})
    assert r.status_code == 422
    assert 'nesting' in r.get_json()['diagnostics'][0]['message']

def test_empty_source(client):
    r = client.post('/api/format',json={'source':''})
    assert r.status_code == 200 and r.get_json()['data']['formatted'] == ''

def test_bom_source(client):
    r = client.post('/api/format',json={'source':'\ufeffint main(){return 0;}'})
    assert r.status_code == 200
    assert r.get_json()['data']['formatted'].startswith('int main')
