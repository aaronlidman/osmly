#!/usr/bin/env python

import sqlite3
from flask import Flask, request, make_response
import json
import time

app = Flask(__name__)


@app.route('/', methods=['GET', 'POST'])
def slash():
    if request.method == 'POST':
        if 'problem' in request.args:
            problem(request.form['db'], request.form['id'], request.form['problem'])
        else:
            done(request.form['db'], request.form['id'])

        return json.dumps({'id': request.form['id']})

    elif request.method == 'GET':
        response = make_response(next(request.args['db']))
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response


def next(db):
    conn = sqlite3.connect(db + '.sqlite')
    row = conn.execute('SELECT geo FROM osmly WHERE problem="" AND done="" ORDER BY RANDOM() LIMIT 1')
    row = row.fetchone()
    conn.commit()
    conn.close()

    return row


def done(db, id):
    unix = int(time.time())
    conn = sqlite3.connect(db + '.sqlite')
    conn.execute(
        'UPDATE osmly SET done = ? WHERE id = ?',
        (unix, id)
    )
    conn.commit()
    conn.close()


def problem(db, id, problem):
    conn = sqlite3.connect(db + '.sqlite')
    conn.execute(
        'UPDATE osmly SET problem = ? WHERE id = ?',
        (problem, id)
    )
    conn.commit()
    conn.close()


if __name__ == '__main__':
    app.run(debug=True)
