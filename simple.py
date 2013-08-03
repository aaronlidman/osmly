#!/usr/bin/env python

import sqlite3
from flask import Flask, request, make_response
import json
import time

app = Flask(__name__)


@app.route('/', methods=['GET', 'POST'])
def slash():
    if request.method == 'GET':
        response = get()
    elif request.method == 'POST':
        response = post()
    response = make_response(response)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Max-Age'] = 86400
    return response


def get():
    conn = sqlite3.connect(request.args['db'] + '.sqlite')
    if 'id' in request.args:
        row = conn.execute(
            'SELECT geo, remote FROM osmly WHERE id = ? LIMIT 1',
            [request.args['id']]
        )
    else:
        row = conn.execute(
            'SELECT geo FROM osmly WHERE problem="" AND done=0 AND difficulty=0 ORDER BY RANDOM() LIMIT 1'
        )
    row = row.fetchone()
    conn.commit()
    conn.close()

    if 'action' in request.args and request.args['action'] == 'remote':
        return row[1]

    return row[0]


def post():
    # obviously these are public facing and could be abused easily, marked all done
    # taking the risk right now, if needed it can easily be limited
        # on osm login or changeset creation, we log them in here with a window
        # as they perform actions that window stays open, like changesets

    # polymorphism much?
    if 'action' in request.args and 'id' in request.args:
        if request.args['action'] == 'problem':
            return problem()
        elif request.args['action'] == 'remote':
            return post_remote()
        elif request.args['action'] == 'submit':
            return done()
    else:
        a = 1
        # idk


def done():
    conn = sqlite3.connect(request.args['db'] + '.sqlite')
    c = conn.cursor()
    c.execute(
        'UPDATE osmly SET done = ?, user = ?, time = ? WHERE id = ?',
        (1, request.form['user'], int(time.time()), request.args['id'])
    )
    conn.commit()
    conn.close()
    return json.dumps({'id': request.args['id']})


def problem():
    conn = sqlite3.connect(request.args['db'] + '.sqlite')
    c = conn.cursor()
    c.execute(
        'UPDATE osmly SET problem = ?, user = ?, time = ? WHERE id = ?',
        (request.form['problem'], request.form['user'], int(time.time()), request.args['id'])
    )
    conn.commit()
    conn.close()
    return json.dumps({'id': request.args['id']})


def post_remote():
    conn = sqlite3.connect(request.args['db'] + '.sqlite')
    c = conn.cursor()
    c.execute(
        'UPDATE osmly SET remote = ? WHERE id = ?',
        (request.form['remote'], request.args['id'])
    )
    conn.commit()
    conn.close()
    return json.dumps('remoted')

if __name__ == '__main__':
    app.run(debug=True)
