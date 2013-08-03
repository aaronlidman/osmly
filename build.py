#!/usr/bin/env python

# converts a geojson file with polygons to a sqlite database with individuals features as rows
# run: python build.py file.geojson
# creates two sqlite databases, named [file].sqlite and [file]-difficult.sqlite
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
        return False
    elif geo.geom_type == 'MultiPolygon':
        return False
    if geo.area > MAX_EDITABLE_AREA:
        return False
    if geo.area == 0:
        return False
    return True

data = open(args['source'])
data = json.load(data)
dbName = args['source'].split('.')[0] + '.sqlite'

db_conn = sqlite3.connect(dbName)
db_c = db_conn.cursor()
db_c.execute('DROP TABLE IF EXISTS osmly')
db_c.execute('CREATE TABLE osmly (id INTEGER PRIMARY KEY, geo TEXT, remote TEXT,' +
             'problem TEXT, done TEXT, difficulty INT, bounds TEXT, area REAL, comments TEXT)')
db_conn.commit()

count = 0
easy_count = 0
diff_count = 0

for feature in data['features']:
    geo = asShape(feature['geometry'])
    boundz = geo.bounds
    bounds = [0, 1, 2, 3]
    geoarea = geo.area
    editable = isEditable(geo)

    bounds[0] = float('{0:.5f}'.format(boundz[0]))
    bounds[1] = float('{0:.5f}'.format(boundz[1]))
    bounds[2] = float('{0:.5f}'.format(boundz[2]))
    bounds[3] = float('{0:.5f}'.format(boundz[3]))

    # we want to use simplify() with False because it's faster
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
    statement = 'INSERT INTO osmly VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?);'

    if editable:
        difficulty = 0
        easy_count = easy_count + 1
    else:
        difficulty = 1
        diff_count = diff_count + 1

    db_c.execute(statement, (count, json.dumps(feature), '', '', '', difficulty, json.dumps(bounds), geoarea, ''))
    db_conn.commit()
        # need to bulk these up, transaction
    count = count + 1

print str(count) + ' items'
print str(easy_count) + ' easy, ' + str(diff_count) + ' difficult'
db_conn.close()
