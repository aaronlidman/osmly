import sys
import os.path
import json
import collections
from shapely.geometry import asShape


# from stackoverflow somewhere, python unicode json keys
def convert(data):
    if isinstance(data, unicode):
        return str(data)
    elif isinstance(data, collections.Mapping):
        return dict(map(convert, data.iteritems()))
    elif isinstance(data, collections.Iterable):
        return type(data)(map(convert, data))
    else:
        return data


# for converting other formats to geojson, eventually
def supported_ext(ext):
    list = ['.geojson', '.json']
    supported = False
    for item in list:
        if ext.lower() == item:
            supported = True
    return supported

if len(sys.argv) != 3:
    print '2 arguments required: existing_poly potential_poly'
    sys.exit()

for arg in sys.argv[1:]:
    argext = os.path.splitext(arg)[-1]
    if supported_ext(argext):
        # convert things here
        print ''
    else:
        print 'unsupported file type ' + argext + ', geojson (.geojson or .json) only'
        sys.exit()

existing = open(sys.argv[1])
potential = open(sys.argv[2])

existing = json.load(existing)
potential = json.load(potential)

dupe_count = 0

# removing duplicate parks
for new_park in potential['features']:
    new_park = asShape(convert(new_park['geometry']))
    for old_park in existing['features']:
        old_park = asShape(convert(old_park['geometry']))
        if new_park.intersects(old_park):
            dupe_count += 1
            break

print dupe_count
