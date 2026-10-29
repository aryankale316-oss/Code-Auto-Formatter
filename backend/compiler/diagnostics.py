class CompileError(Exception):
    def __init__(self, message, line=1, column=1, category='syntax', suggestion=None):
        self.diagnostic = dict(category=category, message=message, line=line,
                               column=column, suggestion=suggestion)
        super().__init__(message)


def location(source, offset):
    return dict(line=source.count('\n', 0, offset) + 1,
                column=offset - source.rfind('\n', 0, offset))
