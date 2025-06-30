#!/usr/bin/env/python3.8

def application(environ, start_response):
    status = '200 OK'
    output = 'Hello Wörld!'.encode("utf8")

    response_headers = [('Content-type', 'text/plain'),
                        ('Content-Length', str(len(output)))]
    start_response(status, response_headers)

    return [output]
