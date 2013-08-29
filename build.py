#!/usr/bin/env python

# converts a geojson file with polygons to a sqlite database with individuals features as rows
# run: python build.py file.geojson
# creates a sqlite database named [file].sqlite
    # [file] is taken from the source file
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
        # geojson makes a distinction between multipolygons and polygon w/ a hole
        # osm does not
        # actually a holey polygon, 'complex polygon'
        return 'multipolygon'
    elif geo.geom_type == 'MultiPolygon':
        return 'multipolygon'
    if geo.area > MAX_EDITABLE_AREA:
        return 'too large'
    if geo.area == 0:
        return 'data problem'
    return ''


def trunc_bounds(bounds):
    out = [1, 2, 3, 4]
    out[0] = float('{0:.5f}'.format(bounds[0]))
    out[1] = float('{0:.5f}'.format(bounds[1]))
    out[2] = float('{0:.5f}'.format(bounds[2]))
    out[3] = float('{0:.5f}'.format(bounds[3]))
    return out

data = open(args['source'])
data = json.load(data)
dbName = args['source'].split('.')[0] + '.sqlite'

db_conn = sqlite3.connect(dbName)
db_conn.isolation_level = None
    # autocommit
db_c = db_conn.cursor()
db_c.execute('DROP TABLE IF EXISTS osmly')
db_c.execute('CREATE TABLE osmly (id INTEGER PRIMARY KEY, geo TEXT, remote TEXT,' +
             'problem TEXT, submit INT, comments TEXT, user TEXT, time INT, done INT)')

count = 0

for feature in data['features']:
    geo = asShape(feature['geometry'])
    bounds = trunc_bounds(geo.bounds)
    problem = isEditable(geo)

    # simplify(x, False) is faster, turns off preserve_topology
    # but it occasionally deletes all nodes and that upsets mapping()
    try:
        simple = geo.simplify(0.0001, False)
        geo = mapping(simple)
    except:
        simple = geo.simplify(0.0001, True)
        geo = mapping(simple)

    feature['properties']['bounds'] = bounds
    feature['geometry']['coordinates'] = geo['coordinates']
    feature['properties']['id'] = count
    statement = 'INSERT INTO osmly VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);'

    # refer to CREATE TABLE, lame I know
    db_c.execute(statement, (
        count, json.dumps(feature), '', problem, 0, '', '', 0, 0))
    count = count + 1

print str(count) + ' items'
db_conn.close()
