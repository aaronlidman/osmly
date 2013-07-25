#!/usr/bin/env python

# converts a geojson file, from ogr2ogr, to a sqlite database with individuals features as rows
# run: python build.py file.geojson
# creates a sqlite db, named file.sqlite

# TODO:
#   size limitation, figure out the units, use bounds instead

import json
import sqlite3
from shapely.geometry import asShape, mapping
from argparse import ArgumentParser

# MAX_EDITABLE_AREA = 1/float(69.11*69.11)
    # square mile
MAX_EDITABLE_AREA = 1/float(138.22*138.22)
    # half sqaure mile
    # obviously not very accurate but it's good enough

parser = ArgumentParser()

parser.add_argument(
    'source',
    help='Source geojson file to parse')
parser.add_argument(
    '--simplify',
    help='Simplification tolerance.',
    type=float,
    default=0.0001)

args = vars(parser.parse_args())


def isEditable(geo):
    # items that are easily editable for leaflet
    # mirrors isEditable() in osmly.item.js
    if geo.geom_type == 'Polygon' and geo.interiors:
        # rare but happens
        return False
    elif geo.geom_type == 'MultiPolygon':
        return False

    if geo.area > MAX_EDITABLE_AREA:
        return False
    return True

data = open(args['source'])
data = json.load(data)

sqlite = args['source'].split('.')
sqlite = sqlite[0] + '.sqlite'

conn = sqlite3.connect(sqlite)
c = conn.cursor()
c.execute("DROP TABLE IF EXISTS osmly")
c.execute('''CREATE TABLE osmly (id INT, geo TEXT, osc TEXT, problem TEXT, done TEXT)''')
conn.commit()

count = 0
difficult = 0

for feature in data['features']:
    geo = asShape(feature['geometry'])
    bounds = geo.buffer(0.001).bounds
    geoarea = geo.area
    editable = isEditable(geo)

    # we want to use simplify() with False param because it's faster
    # but it occasionally deletes all nodes and that upsets mapping()
    try:
        simple = geo.simplify(args['simplify'], False)
        geo = mapping(simple)
    except:
        simple = geo.simplify(args['simplify'], True)
        geo = mapping(simple)

    feature['properties']['id'] = count
    feature['properties']['buffer_bounds'] = bounds
    feature['geometry']['coordinates'] = geo['coordinates']

    if editable:
        statement = "INSERT INTO osmly VALUES(?, ?, ?, ?, ?);"
        c.execute(statement, (count, json.dumps(feature), '', '', ''))
        conn.commit()
        count = count + 1
    else:
        # put it into some other file
        # print str(count) + ': ' + json.dumps(feature)
        difficult = difficult + 1


print 'leaflet editable: ' + str(count)
print 'too difficult: ' + str(difficult)
conn.close()
