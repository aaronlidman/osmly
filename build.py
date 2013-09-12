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
parser.add_argument(
    '--names',
    help='The name column (or technically property)',
    type=str)

args = vars(parser.parse_args())


def isEditable(geo):
    # items that are easily editable for leaflet
    # mirrors isEditable() in osmly.item.js
    if geo.geom_type == 'Polygon' and geo.interiors:
        # geojson makes a distinction between multipolygons and polygon w/ a hole
        # osm does not
        return 'multipolygon'
    elif geo.geom_type == 'MultiPolygon':
        return 'multipolygon'
    if geo.area > MAX_EDITABLE_AREA:
        return 'too large'
    if geo.area == 0:
        return 'data problem'
    return ''


def trunc_bounds(bounds):
    return [
        _trunc(bounds[0]),
        _trunc(bounds[1]),
        _trunc(bounds[2]),
        _trunc(bounds[3])
    ]

def _trunc(dec):
    return float('{0:.5f}'.format(dec))

data = open(args['source'])
data = json.load(data)
dbName = args['source'].split('.')[0] + '.sqlite'

db_conn = sqlite3.connect(dbName)
db_conn.isolation_level = None
    # autocommit
db_c = db_conn.cursor()
db_c.execute('DROP TABLE IF EXISTS osmly')
db_c.execute('CREATE TABLE osmly (id INTEGER PRIMARY KEY, name TEXT, geo TEXT, remote TEXT,' +
             'problem TEXT, submit TEXT, comments TEXT, user TEXT, time INT, done INT)')

count = 0

for feature in data['features']:
    geo = asShape(feature['geometry'])
    bounds = trunc_bounds(geo.bounds)
    problem = isEditable(geo)
    name = ''

    # simplify(x, False) is significantly quicker, turns off preserve_topology
    # but it occasionally deletes all nodes and that upsets mapping()
    try:
        simple = geo.simplify(args['simplify'], False)
        geo = mapping(simple)
    except:
        simple = geo.simplify(args['simplify'], True)
        geo = mapping(simple)

    if 'names' in args and args['names'] in feature['properties']:
        name = feature['properties'][args['names']]

    feature['properties']['bounds'] = bounds
    feature['geometry']['coordinates'] = geo['coordinates']
    feature['properties']['id'] = count
    statement = 'INSERT INTO osmly VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);'

    db_c.execute(statement, (
        count, name, json.dumps(feature), '', problem, '', '', '', 0, 0))
    count = count + 1

print str(count) + ' items'
db_conn.close()
