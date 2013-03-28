#!/usr/bin/env python
# more polymorphic, less neanderthal

import sqlite3
from flask import Flask, request, make_response
import json
import time

app = Flask(__name__)


@app.route('/', methods=['GET', 'POST'])
def slash():
    if request.method == 'POST':
        response = post()
    elif request.method == 'GET':
        response = get()

    response = make_response(response)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Max-Age'] = 86400
    return response


def get():
    # need osc path, use same 'osc' in request.args from post()
    conn = sqlite3.connect(request.args['db'] + '.sqlite')
    if 'id' in request.args:
        row = conn.execute(
            'SELECT geo, osc FROM osmly WHERE id = ? LIMIT 1',
            [request.args['id']]
        )
    else:
        row = conn.execute(
            'SELECT geo FROM osmly WHERE problem="" AND done="" ORDER BY RANDOM() LIMIT 1'
        )
    row = row.fetchone()
    conn.commit()
    conn.close()
    if 'action' in request.args and request.args['action'] == 'osc':
        return row[1]

    return row


def post():
    # how do you execute a function named by a variable?
    # map .args['action'] directly to functions here rather than a growing list
    # request.args['action'] = 'problem' etc...
    # request.args['action']() -> problem()
    if 'action' in request.args:
        if request.args['action'] == 'problem':
            return problem()
        elif request.args['action'] == 'osc':
            return post_osc()
    else:
        return done()


def done():
    conn = sqlite3.connect(request.args['db'] + '.sqlite')
    c = conn.cursor()
    c.execute(
        'UPDATE osmly SET done = ? WHERE id = ?',
        (log(), request.args['id'])
    )
    conn.commit()
    conn.close()
    return json.dumps({'id': request.args['id']})


def problem():
    conn = sqlite3.connect(request.args['db'] + '.sqlite')
    c = conn.cursor()
    c.execute(
        'UPDATE osmly SET problem = ?, done = ? WHERE id = ?',
        (request.form['problem'], log(), request.args['id'])
    )
    conn.commit()
    conn.close()
    return json.dumps({'id': request.args['id']})


def post_osc():
    # could do a uid check if needed
    conn = sqlite3.connect(request.args['db'] + '.sqlite')
    c = conn.cursor()
    c.execute(
        'UPDATE osmly SET osc = ? WHERE id = ?',
        (request.form['osc'], request.args['id'])
    )
    conn.commit()
    conn.close()
    return json.dumps({'id': 'ugg'})


def log():
    if 'user' in request.form:
        user = request.form['user']
    else:
        user = -1
    return json.dumps({
        'user': user,
        'time': int(time.time())
    })


if __name__ == '__main__':
    app.run(debug=True)
