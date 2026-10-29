def node(kind, children=None, token=None, **fields):
    result = dict(type=kind, children=children or [], **fields)
    if token is not None:
        result['location'] = dict(line=token.lineno, column=token.column, offset=token.lexpos)
    return result


def structure(value):
    """Drop source coordinates when comparing reparsed trees."""
    if isinstance(value, dict):
        return {k: structure(v) for k, v in value.items() if k not in ('location', 'sourceRange')}
    if isinstance(value, list):
        return [structure(v) for v in value]
    return value
