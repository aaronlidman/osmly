#!/usr/bin/env python

import json
import sqlite3
from shapely.geometry import asShape, mapping
from optparse import OptionParser

parser = OptionParser()
(options, args) = parser.parse_args()

data = open(args[0])
data = json.load(data)

sqlite = args[0].split('.')
sqlite = sqlite[0] + '.sqlite'

conn = sqlite3.connect(sqlite)
c = conn.cursor()
c.execute("DROP TABLE IF EXISTS osmly")
c.execute('''CREATE TABLE osmly (count INT, geo TEXT, problem TEXT, done TEXT)''')
conn.commit()

count = 0

for feature in data['features']:
    geo = asShape(feature['geometry'])
    bounds = geo.buffer(0.001).bounds

    # we want to use simplify() with False param because it's faster
    # but it occasionally deletes all nodes and that upsets mapping()
    try:
        simple = geo.simplify(0.0001, False)
        geo = mapping(simple)
    except:
        simple = geo.simplify(0.0001, True)
        geo = mapping(simple)

    feature['properties']['buffer_bounds'] = bounds
    feature['geometry']['coordinates'] = geo['coordinates']

    statement = "INSERT INTO osmly VALUES(?, ?, ?, ?);"
    c.execute(statement, (count, json.dumps(feature), '', ''))
    conn.commit()

    count = count + 1

conn.close()
