import sys
def application (environ, start_response):
    sys.stderr.write("Sers")
    sys.stderr.flush()
    start_response ("400 Bad Request", [('Content-Type', 'text/plain')])
    yield b"Hallo"
    return