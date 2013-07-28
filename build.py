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
dbName = args['source'].split('.')

editableDB = dbName[0] + '.sqlite'
edit_conn = sqlite3.connect(editableDB)
edit_c = edit_conn.cursor()
edit_c.execute("DROP TABLE IF EXISTS osmly")
edit_c.execute('''CREATE TABLE osmly (id INT, geo TEXT, remote TEXT, problem TEXT, done TEXT)''')
edit_conn.commit()

difficultDB = dbName[0] + '-difficult.sqlite'
diff_conn = sqlite3.connect(difficultDB)
diff_c = diff_conn.cursor()
diff_c.execute("DROP TABLE IF EXISTS osmly")
diff_c.execute('''CREATE TABLE osmly (id INT, geo TEXT, remote TEXT, problem TEXT, done TEXT)''')
diff_conn.commit()

count = 0

for feature in data['features']:
    geo = asShape(feature['geometry'])
    bounds = geo.bounds
    geoarea = geo.area
    editable = isEditable(geo)
    geo = mapping(geo)

    feature['properties']['id'] = count
    feature['properties']['bounds'] = bounds
    feature['geometry']['coordinates'] = geo['coordinates']

    statement = "INSERT INTO osmly VALUES(?, ?, ?, ?, ?);"

    if editable:
        edit_c.execute(statement, (count, json.dumps(feature), '', '', ''))
        edit_conn.commit()
    else:
        diff_c.execute(statement, (count, json.dumps(feature), '', '', ''))
        diff_conn.commit()
    count = count + 1


print '# of items: ' + str(count)
edit_conn.close()
diff_conn.close()