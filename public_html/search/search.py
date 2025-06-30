#!/usr/local/bin/python3.8
# -*- coding: utf-8 -*-
# wait until flup becomes 3.7 ready
import cgi
import datetime
import logging
import os
import pickle
import re
import sys
import tempfile as mytempfile
import traceback
import urllib.parse
import zipfile
import locale

import mysql.connector

querycache_hours = 1
token_lifetime_hours = 60  # 2.5 days
zip_max_mb = 500
matchcache_maxlen = 10e5
allfiles_location = "/home/suck/public_html/allfiles.txt"
rg_m3u = re.compile(r'^([\d .-]+)?(.*?)(\.\w*)?$')

logging.basicConfig(level=logging.DEBUG)


def dbinit():
    # noinspection PyGlobalUndefined
    global db, cu
    db = mysql.connector.connect(user="mp3", password="suck", database="suck", host="localhost")
    cu = db.cursor()
    logging.debug("Completed DB Connection")


def populated_allfiles_if_neccessary():
    rc = False
    global allfiles, allfiles_read_at
    allfiles_mtime = os.stat(allfiles_location).st_mtime
    if allfiles_mtime > allfiles_read_at:
        rc = True
        logging.info("reading allfiles, mine is {} seconds too old".format(allfiles_mtime - allfiles_read_at))
        allfiles = []
        allfiles_read_at = allfiles_mtime
        for i in open(allfiles_location, "r", encoding="utf8").readlines():
            allfiles.append(i[:-1])
    logging.debug("Done sucking in allfiles")
    return rc


def find_matches(rex):
    global allfiles
    rc = []
    toomany = False
    for j in allfiles:
        if rex.search(j):
            rc.append(j)
            if len(rc) >= matchcache_maxlen:
                toomany = True
                break
    return rc, toomany


def bailout(_form, *_funcargs):

    response_headers = [('Content-Type', 'text/plain')]

    response_body = "==========================================\n"\
                    "=========     B A I L O U T     ==========\n"\
                    "==========================================\n"\
                    "Function Args:\n"
    for j in _funcargs:
        response_body += "   %s\n" % j
    response_body += "==========================================\n"\
                     "Form Parameters:\n"
    for key in _form:
        response_body += "%15s: %s\n" % (key, _form.getfirst(key))
    response_body += "==========================================\n"

    return ("400 Bad Request", response_headers), bytes(response_body, "utf-8")


def yield8(string):
    return string.encode("utf-8")


def application(environ, start_response):

    try:
        returnbody = ""
        if not db.is_connected():
            db.reconnect()
            logging.debug("db connection established")
        if populated_allfiles_if_neccessary():
            cu.execute("delete from querycache")
            db.commit()
            logging.debug("cleared querycache after reading allfiles")
        form = cgi.FieldStorage(fp=environ['wsgi.input'], environ=environ)
        remote_user = environ["REMOTE_USER"]
        logging.debug("Form Data: " + str(form))
        logging.debug("setlocale: " + locale.setlocale(category=locale.LC_ALL, locale='en_US.UTF-8'))
        logging.debug("remote_user: " + remote_user)
        valid_modes = {'Vorschau', 'Playlist', 'm3u', 'zipdatei', 'Debug'}

        mymode = form.getfirst("Mode")
        regex_form = form.getfirst("Regex")
        logging.info(f"Request Data: {mymode}, {regex_form}")
        if mymode not in valid_modes:
            logging.debug(f"Invalid Mode: {mymode}")
            header, body = bailout(form, "Invalid Mode ('%s')" % mymode)
            start_response(*header)
            yield body
            return

        if mymode == "Debug":
            logging.debug("entering Debug Mode")
            header, body = bailout(form, "Bailout on Mode Debug, Connected User: %s\n" % remote_user)
            returnbody += body.decode("utf-8") + "\n"
            cu.execute("select query, expiry from querycache order by expiry")
            returnbody += "Saved queries:\n"
            for saved, expiry in cu.fetchall():
                returnbody += "   %s (expiry: %s)\n" % (saved, expiry)
            returnbody += "==========================================\n"
            cu.execute("select token,expiry from tokens order by expiry")
            returnbody += "active tokens:\n"
            for t, e in cu.fetchall():
                returnbody += "   %s: %s\n" % (e, t)
            returnbody += "==========================================\n"
            db.commit()

            start_response(*header)
            yield bytes(returnbody, "utf-8")
            return

        if not regex_form:  # empty regex makes no sense
            header, body = bailout(form, "Need a Regex")
            start_response(*header)
            yield body
            return

        regex_u = regex_form.rstrip().lower()  # -> u''
        regex_filename = ''.join(filter(lambda x: x.isalnum(), regex_u))
        if len(regex_u) < 4:
            header, body = bailout(form, "Regex too short")
            start_response(*header)
            yield body
            return

        # ## zipdatei, Vorschau, playlist, m3u -- all need matches ###
        cu.execute("delete from querycache where expiry < sysdate()")
        db.commit()

        # find a db-stored "query" that is a substring of regex
        cu.execute("select query from querycache")
        query_db = None
        for dbq, in cu.fetchall():
            assert (isinstance(dbq, str))
            assert (isinstance(regex_u, str))
            if dbq in regex_u:  # wenn dbq ein substring von regex_u ist, dann kann dbq verwendet werden
                query_db = dbq
                logging.info("found matching dbq: /%s/, regex_u: /%s/" % (dbq, regex_u))
                break  # right match found
        db.commit()
        regex_u_rex = re.compile(regex_u, re.IGNORECASE | re.UNICODE)
        # found query (in db) is a substring of regex (user) or None
        if query_db:
            cu.execute("select pickle from querycache where query = %s", (query_db,))
            matches = pickle.loads(cu.fetchall()[0][0])
            db.commit()
            if query_db != regex_u:
                logging.info(u"now reducing matchlist")
                remove = set()
                for m in matches:  # reduce matches list
                    if not regex_u_rex.search(m):
                        remove.add(m)
                matches = sorted(set(matches) - remove)

        # no query (in db), so do regex query in database
        else:
            matches, toomany = find_matches(regex_u_rex)
            cu.execute("insert into querycache (query, expiry, pickle) values (%s, %s, %s)",
                       (regex_u, datetime.datetime.now() + datetime.timedelta(hours=querycache_hours),
                        pickle.dumps(matches)))
            db.commit()

        # insert or update token in database
        expires_in = datetime.datetime.now() + datetime.timedelta(hours=token_lifetime_hours)
        cu.execute("select token from tokens where token like %s", ('%%%s' % remote_user,))
        try:
            token, = cu.fetchall()[0]
            cu.execute("update tokens set expiry = %s where token = %s", (expires_in, token))
            # token = token.encode('utf-8')
        except IndexError:
            tmpfil = mytempfile.mkstemp(prefix="mp3_")[1]
            os.unlink(tmpfil)
            token = tmpfil + "_" + remote_user
            cu.execute('insert into tokens (token,expiry) values (%s, %s)', (token, expires_in))
        finally:
            db.commit()

        # now build urldict for Vorschau and Playlist and zipdatei we need also the urls resp. utf-8 strings
        urldict = {}
        for match in matches:
            getpar = "token=%s&get=%s" % (urllib.parse.quote(token), urllib.parse.quote(match))
            url = 'http://mp3.graf.priv.at/get/get.py?%s' % getpar
            urldict[match] = url

        # ###### zipdatei MODE #######
        if mymode == "zipdatei":
            # Berechnung ob zu gross
            size = 0
            for f in matches:
                size += os.stat(f.encode("utf8")).st_size
            size /= 1024 ** 2
            if size > zip_max_mb:
                header, body = bailout(form, "Maximal %dMB unterstützt, es wären aber %d. Schränke die Regex ein!" %
                                       (zip_max_mb, size))
                start_response(*header)
                yield body
                return
            
            tf = mytempfile.TemporaryFile()
            zf = zipfile.ZipFile(tf, "w")
            content = set()
            for match in matches:
                arcname = "/".join(match.split("/")[-3:])
                if arcname not in content:
                    content.add(arcname)
                    zf.write(match, arcname)
            zf.close()
            heads = [('Content-Type', 'application/zip'),
                     ('Content-Disposition', 'attachment; filename="%s.zip"' % regex_filename),
                     ('Content-Length', '%d' % tf.tell())]
            start_response('200 OK', heads)
            tf.seek(0)
            while True:
                s = tf.read(65536)
                if not s:
                    break
                yield s
            tf.close()
            return

        if mymode == "Vorschau":
            matchcount = str(len(matches))
            matchfmt = "%%0%sd" % str(len(matchcount))
            start_response('200 OK', [('Content-Type', 'text/html; encoding="utf-8"')])
            yield b"<!DOCTYPE html>\n"
            yield b"<html><head>\n"
            yield b"<title>Juke</title>\n"
            yield b"""<link rel="icon" type="image/x-icon" href="/favicon.ico"/>"""
            yield b"""<link rel="stylesheet" href="../juke.css"/>"""
            yield b"</head><body>\n"
            yield bytes("<center><h3>Vorschau: <i>%s</i> ergibt %s Treffer!</h3></center>\n" %
                        (form.getfirst("Regex"), matchcount), "utf-8")
            yield b"<ul>\n"
            matchno = 0
            for match in matches:
                matchno += 1
                matchnostr = matchfmt % matchno
                arcname = "/".join(match.split("/")[4:])
                yield bytes('<li><a href="%s&dl=1">%s</a>: <a href="%s">%s</a></li>\n' %
                        (urldict[match], matchnostr, urldict[match], arcname), "utf-8")
            yield bytes("</ul></body></html>", "utf-8")
            return

        elif mymode == "m3u":
            heads = [('Content-Type', 'audio/x-mpepurl'),
                     ('Content-Disposition', 'attachment; filename="%s.m3u8"' % regex_filename)]
            start_response('200 OK', heads)
            yield b'#EXTM3U\n\n'
            for match in matches:
                artist, album, trackname = match.split('/')[-3:]
                artist = "%s / %s" % (artist, album)
                maybetrack = rg_m3u.match(trackname)
                if maybetrack:
                    trackname = maybetrack.group(2)
                artist = ''.join(filter(lambda x: x != '-', artist))
                trackname = ''.join(filter(lambda x: x != '-', trackname))
                yield yield8('#EXTINF:-1, %s / %s\n' % (artist, trackname))
                yield yield8(urldict[match] + '\n\n')
            return

        else:
            header, body = bailout(form, "WTF? - Mode: %s" % mymode)
            start_response(*header)
            yield body
            return

    except Exception as msg:
        logging.error("Crash Report:")
        logging.error(msg)
        exc_type, exc_value, exc_traceback = sys.exc_info()
        logging.error(traceback.format_tb(exc_traceback))
        header, body = bailout(form, str(msg))
        start_response(*header)
        yield body
        return
    
    finally:
        return


dbinit()
allfiles_read_at = 0
allfiles = []
if populated_allfiles_if_neccessary():  # allfiles wird populated
    cu.execute("delete from querycache")
    db.commit()
    logging.debug("cleared querycache after reading allfiles")
