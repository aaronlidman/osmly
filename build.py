#!/usr/bin/env python

import os
import errno
import json
from shapely.geometry import asShape, mapping

file = open('parks-small.geojson')
data = json.load(file)

count = 0

# http://stackoverflow.com/a/5032238
try:
    os.makedirs('features')
except OSError as exception:
    if exception.errno != errno.EEXIST:
        raise

for feature in data['features']:
    geo = asShape(feature['geometry'])
    # we want to use simplify() with False param because it's much faster
    # but it occasionally deletes all nodes and that upsets mapping()
    try:
        simple = geo.simplify(0.0001, False)
        geo = mapping(simple)
    except:
        simple = geo.simplify(0.0001, True)
        geo = mapping(simple)

    feature['geometry']['coordinates'] = geo['coordinates']

    fileName = 'features/' + str(count) + '.json'
    f = open(fileName, 'w+')
    f.write(json.dumps(feature))
    f.close()

    count = count + 1
