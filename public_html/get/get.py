#!/usr/local/bin/python3.8
from codecs import open

import cgi
import email.utils as emut
import os
import re
import sys
import magic
import mysql.connector
import logging

re_range = re.compile(r'^\s*bytes=(\d*)-(\d*)\s*$')
valid_dirs = {'/home/www/mp3'}
logging.basicConfig(level=logging.DEBUG)


def dbinit():
    global db, cu
    db = mysql.connector.connect(user="mp3", password="suck", database="suck", host="localhost")
    cu = db.cursor()
    logging.debug("Database Connection created")


db = None
cu = None
dbinit()


def yield8(string):
    return string.encode("utf-8")


def bailout(*args, **kwargs):
    """header + str"""
    logging.debug("bailout called")
    status = kwargs.get("status")
    form = kwargs.get("form")
    if not status:
        status = '200 OK'
    bohead = (status, [('Content-Type', 'text/plain; encoding="utf-8"')])
    rc = "=============\n"
    for i in args:
        if isinstance(i, str):
            rc += "errormsg: %s\n" % i.encode("utf8")
        else:
            rc += "errormsg: %s\n" % str(i).encode("utf8")
    rc = "=============\n"
    for key in form:
        rc += "formdata received:  %20s:  %s\n" % (key, form.getfirst(key))
    rc += "=============\n"
    return bohead, rc


def application(environ, header):
    logging.debug("Starting app")
    if not db.is_connected():
        db.reconnect()
    logging.debug("database is fine")
    form = cgi.FieldStorage(fp=environ['wsgi.input'], environ=environ)

    rtext = ""
    if "token" not in form:
        bohead, text = bailout("No Token Specified .. ", form=form)
        rtext += text
    if "get" not in form:
        bohead, text = bailout("get no get ..", form=form)
        rtext += text
    if rtext:
        header(*bohead)
        yield yield8(rtext)
        return

    token = form.getfirst("token")
    getpath = form.getfirst("get")

    if "dl" in form:
        download = True
    else:
        download = False

    cu.execute("delete from tokens where expiry < sysdate()")
    db.commit()

    cu.execute("select token from tokens where token = %s", (token,))
    try:
        cu.fetchall()[0]
    except IndexError:
        bohead, text = bailout("Ungültiger Token: %s" % token, form=form)
        header(*bohead)
        yield yield8(text)
        return
    finally:
        db.commit()

    if True not in {getpath.startswith(x) for x in valid_dirs}:
        bohead, text = bailout('requested file not in a valid directory', getpath, status='403 Forbidden', form=form)
        header(*bohead)
        yield yield8(text)
        return

    try:
        mag = magic.detect_from_filename(getpath)
    except ValueError as msg:
        bohead, text = bailout("No Magic", msg, status='404 Not Found', form=form)
        header(*bohead)
        yield yield8(text)
        return

    fstat = os.stat(getpath)
    fsize = fstat.st_size
    fmtime = fstat.st_mtime
    # common headers for full and partial content
    heads = [('Content-Type', '%s' % mag.mime_type), ('Accept-Ranges', 'bytes'), ('Content-Length', '%d' % fsize),
             ('Last-Modified', emut.formatdate(fmtime))]
    if download:
        arcname = "__".join(getpath.split("/")[-3:])
        heads.append(('Content-Disposition', 'attachment; filename="%s"' % arcname))
        print(arcname, file=sys.stderr)

    getfile = open(getpath, "rb")
    if 'HTTP_RANGE' in environ:
        # Range requested: 'bytes=1357154-'
        # Range requested: 'bytes=4362632-9413851'
        hrange = environ.get('HTTP_RANGE')
        print("HTTP_RANGE: '%s'" % hrange, file=sys.stderr)
        try:
            begin, end = re_range.match(hrange).groups()
            if begin == '':
                begin = 0
            else:
                begin = int(begin)
            if end == '':
                end = fsize - 1
            else:
                end = int(end)
            assert end < fsize
            assert begin < end
        except Exception as msg:
            print(msg, file=sys.stderr)
            status = "416 Range Not Satisfiable"
            heads.append(('Content-Range', 'bytes */%d' % fsize))
            header(status, heads)
            return
        status = "206 Partial Content"
        heads.append(('Content-Range', 'bytes %d-%d/%d' % (begin, end, fsize)))
        header(status, heads)
        getfile.seek(begin)
        bytestosend = end - begin + 1
        while bytestosend > 0:
            if bytestosend >= 65536:
                chunksize = 65536
            else:
                chunksize = bytestosend
            s = getfile.read(chunksize)
            yield s
            bytestosend -= chunksize
        return

        # initial request - no range:
    else:
        status = "200 OK"
        header(status, heads)

    # payload makes no difference from now on
    while True:
        s = getfile.read(65536)
        if not s:
            break
        yield s
    return

