#!/usr/bin/env python

import sqlite3
from flask import Flask, request, make_response
import json
import time
import glob

app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def slash():
    if 'db' not in request.args:
        out = []
        for item in glob.glob('*.sqlite'):
            out.append(item.split('.')[0])
        response = make_response(json.dumps(out))
        return response

    if request.method == 'GET':
        response = get()
    elif request.method == 'POST':
        response = post()
    response = make_response(response)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Max-Age'] = 86400
    return response


def DB():
    conn = sqlite3.connect(request.args['db'] + '.sqlite')
    cursor = conn.cursor()
    return {
        'conn': conn,
        'c': cursor
    }


def get():
    if 'id' in request.args:
        return specific()
    elif 'overview' in request.args:
        return overview()
    elif 'qa' in request.args:
        return qa()
    else:
        return random()


def post():
    # obviously these are public facing and could be abused easily, marked all done etc...
    # taking the risk right now, if needed it can be limited with some effort
        # on osm login or changeset creation, we log them in here with a time window
        # as they perform actions that window stays open, like changesets

    # polymorphism much?
    if 'action' in request.args and 'id' in request.args:
        if request.args['action'] == 'problem':
            return problem()
        elif request.args['action'] == 'remote':
            return remote()
        elif request.args['action'] == 'submit':
            return submit()
        elif request.args['action'] == 'confirm':
            return confirm()


def random():
    db = DB()
    row = db['c'].execute(
        'SELECT geo FROM osmly WHERE problem = "" AND submit = "" ORDER BY RANDOM() LIMIT 1')
    row = row.fetchone()
    db['conn'].commit()
    db['conn'].close()
    if row:
        return row[0]
    else:
        return '0';


def specific():
    db = DB()
    row = db['c'].execute(
        'SELECT geo, remote, submit FROM osmly WHERE id = ? LIMIT 1',
        [request.args['id']]
    )
    row = row.fetchone()
    db['conn'].commit()
    db['conn'].close()
    out = row[0]
    if 'action' in request.args:
        if request.args['action'] == 'remote':
            out = row[1]
        elif request.args['action'] == 'status':
            out = {'status': 'ok'}
            if row[2] != '':
                out = {'status': 'no_go'}
            out = json.dumps(out)
    return out


def overview():
    db = DB()
    db['c'].execute('SELECT id, problem, submit, user FROM osmly ORDER BY id')
    return json.dumps(db['c'].fetchall());


def qa():
    db = DB()
    columns = 'id, geo, problem, submit, user, time'
    row = db['c'].execute(
        'SELECT ' + columns + ' FROM osmly WHERE submit != "" AND problem != "too large" AND done = 0 ORDER BY RANDOM() LIMIT 1')
    row = row.fetchone()
    db['conn'].commit()
    db['conn'].close()
    return json.dumps(row)


def submit():
    db = DB()
    submit = 1
    if request.form and 'submit' in request.form:
        submit = request.form['submit']

    db['c'].execute(
        'UPDATE osmly SET submit = ?, user = ?, time = ? WHERE id = ?',
        (submit, request.form['user'], int(time.time()), request.args['id'])
    )
    db['conn'].commit()
    db['conn'].close()
    return json.dumps({'status': 'ok'})


def problem():
    db = DB()
    db['c'].execute(
        'UPDATE osmly SET problem = ?, user = ?, time = ? WHERE id = ?',
        (request.form['problem'], request.form['user'], int(time.time()), request.args['id'])
    )
    db['conn'].commit()
    db['conn'].close()
    return json.dumps({'id': request.args['id']})


def remote():
    db = DB()
    db['c'].execute(
        'UPDATE osmly SET remote = ? WHERE id = ?',
        (request.form['remote'], request.args['id'])
    )
    db['conn'].commit()
    db['conn'].close()
    return json.dumps('remoted')


def confirm():
    db = DB()
    db['c'].execute(
        'UPDATE osmly set done = 1 WHERE id = ?',
        (request.args['id'],)
    )
    db['conn'].commit()
    db['conn'].close()
    return json.dumps('confirmed')


if __name__ == '__main__':
    app.run(debug=True)
