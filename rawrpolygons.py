from xml.etree.ElementTree import ElementTree, fromstring, Element, SubElement, tostring
import sqlite3
from flask import Flask, render_template, request
import urllib2
import json
from shapely.geometry import asShape, mapping
import shapely.wkt
import time

import sys

app = Flask(__name__)


@app.route('/poly', methods=['GET', 'POST'])
def poly():
    if request.method == 'POST':
        if request.form['action'] == 'new':
            # need to check for intersection again
            # maybe try/except this?
            new = json.loads(request.form['geo'])
            geo = asShape(new)
            # need to load it into shapely, no bounds object yet
            # qd, just copied from the regular 'next' case below
            envelope = map(str, geo.bounds)
            bbox = '[bbox=' + envelope[0] + ',' + envelope[1] + ',' + envelope[2] + ',' + envelope[3] + ']'
            osm_xml = get_osm(bbox)
            osm_json = osm_polygons(osm_xml)
            if polys_intersect(osm_json, geo) is True:
                # an intersection between user editted data and existing OSM data
                print 'after edit intersection'
                # done() it
                return 'false'
            # check if an open changeset exist for use by osmparks
                # if not, start a new changeset
            print new['coordinates'][0]
            wtf = build_upload(0, new['coordinates'][0])
            print request.form['name'] + ':'
            print new
            return 'got new'
            # done(request.form['id'], request.form['action'], request.form['geo'])
        else:
            # skip or report a problem
            done(request.form['id'], request.form['action'])
            status = {}
            status['status'] = 'ok'
            status['id'] = request.form['id']
            return json.dumps(status)
    else:
        polygon = False
        if 'next' in request.args:
            while polygon is False:
                # might want to limit this loop somehow to avoid hitting xapi too hard
                # after x failures switch providers?
                # incrementally sleep for a second or two?
                polygon = next_polygon()
                # print 'polygon: ' + str(polygon['id'])
                envelope = map(str, polygon['geo'].bounds)
                bbox = '[bbox=' + envelope[0] + ',' + envelope[1] + ',' + envelope[2] + ',' + envelope[3] + ']'
                osm_xml = get_osm(bbox)
                osm_json = osm_polygons(osm_xml)
                if polys_intersect(osm_json, polygon['geo']) is False:
                    polygon = prep(polygon)
                    if polygon == 'json_problem':
                        done(polygon['id'], 'json_problem')
                        polygon = False
                    else:
                        polygon['bounds'] = envelope[1], envelope[0], envelope[3], envelope[2]
                        return json.dumps(polygon)
                else:
                    done(polygon['id'], 'dupe')
                    polygon = False
        else:
            # plain jane visit
            return render_template('poly.html')


def next_polygon():
    conn = sqlite3.connect('merged.sqlite')
    # row = conn.execute('SELECT OGC_FID, GEOMETRY, fullname FROM merged WHERE OGC_FID="12413"')
    # testing: 18870 is a dupe, 608 is a multi, 15997 json_problem, 12413 multi
    # row = conn.execute('SELECT OGC_FID, GEOMETRY, fullname FROM merged WHERE awater = 0 AND aland < 350000 AND aland > 500 AND skip_count < 15 ORDER BY RANDOM() LIMIT 1')
    row = conn.execute('SELECT OGC_FID, GEOMETRY, fullname FROM merged WHERE aland < 350000 AND aland > 500 AND skip_count < 15 ORDER BY RANDOM() LIMIT 1')
    row = row.fetchone()
    poly_wkb = str(row[1])
    polygon = {}
    polygon['id'] = row[0]
    polygon['geo'] = shapely.wkb.loads(poly_wkb).simplify(0.0001)
    polygon['name'] = row[2]
    return polygon


def get_osm(bbox):
    # provider = 'http://overpass.osm.rambler.ru/cgi/xapi?'
    provider = 'http://www.overpass-api.de/api/xapi?'
    # provider = 'http://jxapi.osm.rambler.ru/xapi/api/0.6/'
    request = provider + 'way' + bbox
    # should check for errors and such
    return urllib2.urlopen(request).read()


def osm_polygons(osm_string):
    # xpath might simplify this a bit, forgot about it
    geojson = {'type': 'FeatureCollection', 'features': []}
    tree = fromstring(osm_string)
    for way in tree.iterfind('way'):
        keep = 0
        for tag in way.iterfind('tag'):
            # better way?
            if ((tag.get('k') == 'leisure') and (tag.get('v') == 'park')):
                keep += 1
            elif (tag.get('k') == 'landuse' and (tag.get('v') == 'forest')):
                keep += 1
            elif (tag.get('k') == 'leisure' and (tag.get('v') == 'nature_reserve')):
                keep += 1
            elif (tag.get('k') == 'leisure' and (tag.get('v') == 'garden')):
                keep += 1
            elif (tag.get('k') == 'natural' and (tag.get('v') == 'wood')):
                keep += 1
            elif (tag.get('k') == 'leisure' and (tag.get('v') == 'stadium')):
                keep += 1
        if (keep > 0):
            coordinates = []
            for nd in way.iterfind('nd'):
                for node in tree.iterfind('node'):
                    if (node.get('id') == nd.get('ref')):
                        coordinates.append([float(node.get('lon')), float(node.get('lat'))])
            polygon = {
                'type': 'Feature',
                'geometry': {
                    'type': 'LineString',
                    'coordinates': coordinates
                },
                'properties': 'null'
            }
            geojson['features'].append(polygon)

    return json.dumps(geojson)


def polys_intersect(osm_geojson, other_geo, other='wkt'):
    # returns true for intersection, false for no intersection
    osm_geojson = json.loads(osm_geojson)
    for feature in osm_geojson['features']:
        print feature['geometry']
        feature = asShape(feature['geometry'])
        if other == 'wkt':
            if feature.intersects(other_geo) is True:
                return True
        elif other == 'geojson':
            return False
    return False


def prep(polygon):
    polygon['geo'] = mapping(polygon['geo'])
    polygon['geo']['coordinates'] = listit(polygon['geo']['coordinates'])
    if (len(polygon['geo']['coordinates']) > 1):
        # multipolygon, just the outer
        # what if there is more than 1 inner?
        del polygon['geo']['coordinates'][-1]
    try:
        del polygon['geo']['coordinates'][0][-1]
        # wkt needs that connecting point, geojson doesn't
    except:
        # there's some rare issue in mapping
        # ends up as a single key with a everything else as a value
        return 'json_problem'
    # print polygon
    return polygon


def done(id, result, geo_after=False):
    # a few columns have been added to the original 'merged' table
    # skip_count has been zeroed
    # should add date column
    # print id
    # print result
    # print geo_after
    try:
        conn = sqlite3.connect('merged.sqlite')
        if result == 'skip':
            conn.execute('UPDATE merged SET skip_count = skip_count + ? WHERE OGC_FID = ?', (1, id))
        elif result == 'new':
            conn.execute('UPDATE merged SET result = ? WHERE OGC_FID = ?', (result, id))
        else:
            conn.execute('UPDATE merged SET result = ? WHERE OGC_FID = ?', (result, id))
        conn.commit()
        conn.close()
    except sqlite3.OperationalError:
        # add the new columns, can it done in a single statement?
        # conn = sqlite3.connect('merged.sqlite')
        return 'ok'


def build_upload(changeset, coordinates):
    # diff upload, osmChange format
    # http://wiki.openstreetmap.org/wiki/API_v0.6#Diff_upload:_POST_.2Fapi.2F0.6.2Fchangeset.2F.23id.2Fupload
    # http://gitorious.org/osm-poi-tools/monetdb/blobs/4885d983bcbd563c31250fce9741f28b1127a001/oscparser.py
    osmchange = Element('osmChange', version='0.6')
    # osmchange.set('version', '0.6')
    create = SubElement(osmchange, 'create')
    nodes = []
    nds = []
    count = 1
    tstamp = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    for coord in coordinates:
        id = '-' + str(count)
        nodes.append(Element('node', id=id, lat=str(coord[1]), lon=str(coord[0]), timestamp=tstamp))
        nds.append(Element('nd', ref=id))
        count = count + 1
    # adding polygon wrap around node
    nds.append(nds[0])
    create.extend(nodes)
    way = SubElement(create, 'way', id='-'+str(count), timestamp=tstamp)
    way.extend(nds)
    parkify = SubElement(way, 'tag', k='leisure', v='park')
    return tostring(osmchange)


def listit(t):
    # http://stackoverflow.com/questions/1014352/how-do-i-convert-a-nested-tuple-of-tuples-and-lists-to-lists-of-lists-in-python
    return list(map(listit, t)) if isinstance(t, (list, tuple)) else t


if __name__ == '__main__':
    app.run(debug=True)
