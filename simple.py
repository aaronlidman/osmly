#!/usr/bin/env python
# more polymorphic, less neanderthal
# under 100 lines
# figure out your .args and .form shit
    # args (uri) contains, db, id and action?
    # everything else in form (data)

import sqlite3
from flask import Flask, request, make_response
import json
import time

app = Flask(__name__)


@app.route('/', methods=['GET', 'POST'])
def slash():
    if request.method == 'POST':
        response = to_db()
    elif request.method == 'GET':
        response = get()

    # we've got new CORS issues
    response = make_response(response)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Max-Age'] = 86400
    return response


def get():
    # need osc path, use same 'osc' in request.args from to_db()
    db = request.args['db']

    conn = sqlite3.connect(db + '.sqlite')
    if 'id' in request.args:
        row = conn.execute(
            'SELECT geo FROM osmly WHERE id = ? LIMIT 1',
            [request.args['id']]
        )
    else:
        row = conn.execute(
            'SELECT geo FROM osmly WHERE problem="" AND done="" ORDER BY RANDOM() LIMIT 1'
        )
    row = row.fetchone()
    conn.commit()
    conn.close()
    return row


def to_db():
    # !!! --- notice .form and .arg mismatch --- !!!
    # how do you execute a function named by a variable?
    # request.args['action'] = 'problem' etc...
    # request.args['action']() -ish
    print request.form
    print request.args
    if 'problem' in request.form:
        print 'problem hit'
        return problem()
    elif 'osc' in request.args:
        print 'osc hit'
        return post_osc()
    else:
        return done()


def done():
    db = request.args['db']
    id = request.form['id']

    conn = sqlite3.connect(db + '.sqlite')
    c = conn.cursor()
    c.execute('UPDATE osmly SET done = ? WHERE id = ?', (log(), id))
    conn.commit()
    conn.close()
    return json.dumps({'id': request.form['id']})


def problem():
    db = request.args['db']
    id = request.form['id']
    problem = request.form['problem']

    conn = sqlite3.connect(db + '.sqlite')
    c = conn.cursor()
    c.execute(
        'UPDATE osmly SET problem = ?, done = ? WHERE id = ?',
        (problem, log(), id)
    )
    conn.commit()
    conn.close()
    return json.dumps({'id': request.form['id']})


def post_osc():
    # could do a uid check
    db = request.args['db']
    id = request.args['id']
    osc = request.form['osc']
    print osc

    conn = sqlite3.connect(db + '.sqlite')
    c = conn.cursor()
    c.execute('UPDATE osmly SET osc = ? WHERE id = ?', (osc, id))
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
