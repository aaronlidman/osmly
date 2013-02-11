#!/usr/bin/env python

import sqlite3
from flask import Flask, render_template, request
import json
from shapely.geometry import mapping, MultiPolygon, box
import shapely.wkb
import time
import random

app = Flask(__name__)

sqlite = {
    'db': 'laparks.sqlite',
    'table': 'parks',  # need to standardize table naming
    'columns': ['OGC_FID', 'GEOMETRY'],
    'where': '1=1'
}
    # columns[1] is always OGC_FID
    # columns[2] is always GEOMETRY
    # other columns are optional and get used as tags

# adds a common tag to everything
# tags will override columns that are named the same
add_tag = {}

# in kilometers, to limit clientside query size
AREA_LIMIT = 5
    # 2.6 is a square mile


@app.route('/', methods=['GET', 'POST'])
def slash():
    if request.method == 'POST':
        # log: uploaded, skipped, or reported
        done(request.form['id'], request.form['action'])
        status = {
            'status': 'ok',
            'id': request.form['id']
            #  returning the id in order to keep a log in localstorage
            #  we'll pull this log every few minutes
        }
        return json.dumps(status)
        #  maybe return a new one? one less request, less delay, complexity?

    elif request.method == 'GET':

        if 'next' in request.args:
            get_set_params(request.args)
            polygon = clean_up(next())
            return json.dumps(polygon)
        else:
            # plain jane visit
            return render_template('index.html')


def get_set_params(args):
    # args is immutable
    # todo: if empty? ''
    # todo: if whitespace? columns = 'name, source'
    if 'db' in args:
        if ',' in args['db']:
            db = args['db'].split(',')
            db = [x.strip() for x in db]
            db = random.choice(db)
        else:
            db = args['db'].strip()

        sqlite['db'] = db + ".sqlite"

    # just return all columns? sort it out clientside?
    if 'columns' in args:
        if ',' in args['columns']:
            columns = args['columns'].split(',')
        else:
            columns = [args['columns']]

        columns = [x.strip() for x in columns]
        sqlite['columns'].extend(columns)

    # sqlite['where'] += ' AND unixtime < strftime("%s","now")'
    # sqlite['where'] += ' AND OGC_FID = 1057'
    # sqlite['where'] += ' AND OGC_FID = 56'


def next():
    conn = sqlite3.connect(sqlite['db'])
    conn.row_factory = sqlite3.Row
    columns = ', '.join(sqlite['columns'])
    # no placeholders on columns or table: http://stackoverflow.com/q/8841488
    row = conn.execute(
        'SELECT %s FROM %s WHERE %s ORDER BY RANDOM() LIMIT 1'
        % (columns, sqlite['table'], sqlite['where'])
    )
    row = row.fetchone()
    # tried unixtime in sqlite strftime("%s","now"), python takes %s literally
    conn.execute(
        'UPDATE %s SET unixtime = %s WHERE OGC_FID = %d'
        % (sqlite['table'], int(time.time()) + 300, row[0])
    )
    # this SELECT then UPDATE is the best I could figure out
    # mostly because of 'ORDER BY RANDOM()' better idea? one statement?
    conn.commit()
    conn.close()

    geo = shapely.wkb.loads(str(row[1]))

    if geo.geom_type == 'MultiPolygon':
        # leaflet can't edit the inner of multipolygons
        # most of the time they're unnecessary
        p_list = []
        for p in geo:
            p_list += [list(p.exterior.coords)]
        print p_list
        geo = MultiPolygon(p_list)
        # too many problems, probably going to scrap

    bounds = geo.buffer(0.001).bounds
    bounds = box(bounds[0], bounds[1], bounds[2], bounds[3])
    print bounds.area
    if bounds.area > km2deg(AREA_LIMIT):
        # done(row[0], 'big')
        print 'too big: ' + str(bounds.area)
        slash()

    envelope = map(str, bounds.bounds)
    bbox = ('bbox=' +
        envelope[0] + ',' +
        envelope[1] + ',' +
        envelope[2] + ',' +
        envelope[3])
        # do it clientside later

    polygon = {
        'id': row[0],
        'bbox': bbox,
        'db': sqlite['db'].split('.')[0],
        'geo': geo.simplify(0.0001, False),  # 0.0001 is pretty solid
        'tags': {}
    }

    row = dict(row)
    del row['OGC_FID']
    del row['GEOMETRY']

    # tags from source
    for k, v in row.iteritems():
        polygon['tags'][k] = v

    # additional specified tags
    for k, v in add_tag.iteritems():
        polygon['tags'][k] = v

    return polygon


def distance(one, two):
    return (one[0] - two[0])**2 + (one[1] - two[1])**2


def clean_up(polygon):
    # there's a really rare mapping problem with some multipolygons
    # should try/except it and move around it
    polygon['geo'] = mapping(polygon['geo'])
    polygon['geo']['coordinates'] = listit(polygon['geo']['coordinates'])
        # listit() is for converting tuples to a list so it can be modified
    if (len(polygon['geo']['coordinates']) > 1):
        # multipolygon, just the first one
        polygon['geo']['type'] = 'MultiPolygon'
    else:
        del polygon['geo']['coordinates'][0][-1]
    # removes the start/end polygon connecting point, leaflet should know this
    # fix is coming: https://github.com/Leaflet/Leaflet/commit/4551633b9c08fd653a1c30556d5868a4c9ef2b04#L0L10
    return polygon


def done(id, result):
    # a few columns have been added to the original table
    # ALTER TABLE parks ADD skip_count NUMERIC NOT NULL DEFAULT 0
    # ALTER TABLE parks ADD unixtime NUMERIC NOT NULL DEFAULT 0
    # ALTER TABLE parks ADD result TEXT
    print result
    unix = int(time.time())
    try:
        conn = sqlite3.connect('merged.sqlite')
        if result == 'skip':
            conn.execute(
                'UPDATE merged SET skip_count = skip_count + ?, unixtime = ? WHERE OGC_FID = ?',
                (1, unix, id)
            )
        else:
            conn.execute(
                'UPDATE merged SET result = ?, unixtime = ? WHERE OGC_FID = ?',
                (result, unix, id)
            )
        conn.commit()
        conn.close()
    except sqlite3.OperationalError:
        # add the new columns, can it done in a single statement?
        return 'ok'


def listit(t):
    # http://stackoverflow.com/q/1014352
    return list(map(listit, t)) if isinstance(t, (list, tuple)) else t


def km2deg(km):
    # because our srs is defined in deg, shapely returns area as deg
    # this roughly converts sq km to sq deg, roughly
    degrees = km / (510072000 / (129600 / 3.1415926535))
    return degrees


if __name__ == '__main__':
    app.run(debug=True)
