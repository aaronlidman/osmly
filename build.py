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
    # basically is it a simple polygon? is it within the size?
    if geo['type'] == 'Polygon' and len(geo['coordinates']) > 1:
        return False
    elif geo['type'] == 'MultiPolygon':
        return False
    # need to limit size to square mile or something
        # anything over is too difficult
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
area = []
toolarge = []

for feature in data['features']:
    geo = asShape(feature['geometry'])
    bounds = geo.buffer(0.001).bounds
    geoarea = geo.area


    # need to get this into isEditable somehow
    # move isEditable up steam a little bit
    if geoarea > 0.00020937181:
        # 1/(69.11*69.11)
        toolarge.append(geoarea)
        print json.dumps(feature)
    else:
        area.append(geoarea)

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

    if isEditable(feature['geometry']):
        statement = "INSERT INTO osmly VALUES(?, ?, ?, ?, ?);"
        c.execute(statement, (count, json.dumps(feature), '', '', ''))
        conn.commit()
        count = count + 1
    else:
        # put it into some other file
        # print str(count) + ': ' + json.dumps(feature)
        difficult = difficult + 1


print 'total: ' + str(count)
print 'too difficult:' + str(difficult)
print 'mean area: ' + str(sum(area) / float(len(area)))
print '# too large: ' + str(len(toolarge))
conn.close()
