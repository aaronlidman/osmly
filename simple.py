#!/usr/bin/env python

import sqlite3
from flask import Flask, request, make_response
import json
import time

app = Flask(__name__)


@app.route('/', methods=['GET', 'POST'])
def slash():
    if request.method == 'POST':
        log = json.dumps({
            'user': request.form['user'],
            'time': int(time.time())
        })

        if 'problem' in request.args:
            problem(request.form['db'], request.form['id'], request.form['problem'], log)
        else:
            done(request.form['db'], request.form['id'], log)

        response = make_response(json.dumps({'id': request.form['id']}))

    elif request.method == 'GET':
        response = make_response(next(request.args['db']))

    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Max-Age'] = 86400
    return response


def next(db):
    conn = sqlite3.connect(db + '.sqlite')
    row = conn.execute('SELECT geo FROM osmly WHERE problem="" AND done="" ORDER BY RANDOM() LIMIT 1')
    row = row.fetchone()
    conn.commit()
    conn.close()
    return row


def done(db, id, log):
    conn = sqlite3.connect(db + '.sqlite')
    c = conn.cursor()
    c.execute('UPDATE osmly SET done = ? WHERE count = ?', (log, id))
    conn.commit()
    conn.close()


def problem(db, id, problem, log):
    conn = sqlite3.connect(db + '.sqlite')
    c = conn.cursor()
    c.execute('UPDATE osmly SET problem = ?, done = ? WHERE count = ?', (problem, log, id))
    conn.commit()
    conn.close()


if __name__ == '__main__':
    app.run(debug=True)
