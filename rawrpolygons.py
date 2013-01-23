#!/usr/bin/env python

# TODO: http://code.google.com/p/pyproj/

from xml.etree.ElementTree import ElementTree, fromstring, Element, SubElement, tostring
import sqlite3
from flask import Flask, render_template, request
import requests
import json
from shapely.geometry import asShape, mapping
import shapely.wkt
import time

import sys

app = Flask(__name__)

sqlite = {
    'db': 'laparks.sqlite',
    'table': 'parks',
    'columns': [
        'OGC_FID',
        'GEOMETRY',
        'name'],
    'where': 'shape_area < 27000000'
}
    # columns[1] is always OGC_FID
    # columns[2] is always GEOMETRY
    # everything else is optional
    # 'where': 'aland < 350000 AND aland > 500 AND skip_count < 15'


add_tag = {
    'leisure': 'park',
    'source': 'County of Los Angeles - http://egis3.lacounty.gov/dataportal/'
}

to_intersect = {
    'way': [
        'leisure=park',
        'leisure=nature_reserve',
        'leisure=garden',
        'leisure=stadium'],
    'node': []
}

to_display = {
    'way': [
        'leisure=park',
        'leisure=nature_reserve',
        'lesiure=stadium',
        'leisure=golf_course',
        'leisure=dog_park',
        'landuse=cemetery',
        'landuse=farm',
        'landuse=farmland',
        'landuse=recreation_ground',
        'amenity=college',
        'amenity=kindergarten',
        'amenity=school',
        'amenity=university',
        'amenity=grave_yard'],
    'node': [
        'leisure=park',
        'lesiure=stadium',
        'leisure=golf_course',
        'landuse=cemetery',
        'amenity=college',
        'amenity=kindergarten',
        'amenity=school',
        'amenity=university',
        'amenity=grave_yard']
}

# just to keep the queries from being too large
# in meters
# todo: redo ogr2ogr script and define srs +units=m
AREA_LIMIT = 1000

CREATED_BY = 'OSMly 0.1'


# might want to simplify all these routes to a single one
# just use the "in" method and many more arguments instead, simpler
# makes it easier to drop flask too
@app.route('/', methods=['GET', 'POST'])
def slash():
    if request.method == 'POST':
        if request.form['action'] == 'new':
            # need to check for intersection again
            # !! - try/except this - !!
                # I don't trust you
            new = json.loads(request.form['data'])
            geo = asShape(new['geo'])
            osm_json = get_osm(geo, 0)

            if intersection(osm_json['polygons']['intersect'], geo) is True:
                # an intersection between user editted data and existing OSM data
                print 'after edit intersection'
                # done() it
                return 'false'
                name = request.form['name']

            tags = prep_tags(dict(new))
            wtf = build_upload(0, new['geo']['coordinates'][0], tags)
            return wtf
            # done(request.form['id'], request.form['action'], request.form['geo'])
        else:
            # skip or report a problem
            done(request.form['id'], request.form['action'])
            status = {
                'status': 'ok',
                'id': request.form['id']
            }
            return json.dumps(status)
    else:
        # GET
        polygon = False
        if 'next' in request.args:
            while polygon is False:
                # might want to limit this loop somehow to avoid hitting xapi too hard
                # after x failures switch providers?
                # incrementally sleep for a second or two?
                # need to work around new limitation: http://wiki.openstreetmap.org/wiki/Overpass_API/versions#Overpass_API_v0.7.1
                    # CORS support too, client side intersection query?
                polygon = next_polygon()
                osm_json = get_osm(polygon['geo'])
                if intersection(osm_json['polygons']['intersect'], polygon['geo']) is False:
                    polygon = prep(polygon)
                    if polygon == 'json_problem':
                        done(polygon['id'], 'json_problem')
                        polygon = False
                    else:
                        return json.dumps({
                            'display_polys': osm_json['polygons']['display'],
                            'display_nodes': osm_json['nodes']['display'],
                            'edit': polygon
                        })
                else:
                    done(polygon['id'], 'dupe')
                    polygon = False
                    # polygon = prep(polygon)
                    # return json.dumps({
                    #     'display_polys': osm_json['polygons']['display'],
                    #     'display_nodes': osm_json['nodes']['display'],
                    #     'edit': polygon
                    # })
                    # to actually see dupe detection on leaflet
        else:
            # plain jane visit
            return render_template('poly.html')


def next_polygon():
    conn = sqlite3.connect(sqlite['db'])
    # row = conn.execute('SELECT OGC_FID, GEOMETRY, fullname FROM merged WHERE OGC_FID="17120"')
    # testing: 18870 is a dupe, 608, 17120 is a multi, 15997 json_problem, 12413, 10938 multi
    # 5891 has display data, 6453 has a single display node
    row = conn.execute('SELECT ' + ', '.join(sqlite['columns']) + ' FROM ' + sqlite['table'] + ' WHERE ' + sqlite['where'] + ' ORDER BY RANDOM() LIMIT 1')
    row = row.fetchone()

    polygon = {
        'id': row[0],
        'geo': shapely.wkb.loads(str(row[1])).simplify(0.00005, False),  # 0.0001 is pretty solid
        # put tags in their own key, easier clientside
    }

    for x in range(2,len(row)):
        item = sqlite['columns'][x]
        polygon[item] = row[x]

    for y, z in add_tag.iteritems():
        polygon[y] = z

    return polygon


def get_osm(shapely_obj, context=1):
    # added a context conditional to speed up reviews, still a bit messy
    # todo: use area to confirm this is a polygon, set area limitation based on CONSTANT
    if context:
        shapely_obj = shapely_obj.buffer(0.001)
        print str(shapely_obj.area)
        # 0.001 is good, 0.005 is pretty big
    envelope = map(str, shapely_obj.bounds)
    bbox = '[bbox=' + envelope[0] + ',' + envelope[1] + ',' + envelope[2] + ',' + envelope[3] + ']'
    print bbox
    # provider = 'http://overpass.osm.rambler.ru/cgi/xapi?'
    provider = 'http://www.overpass-api.de/api/xapi?'
        # todo: http://harrywood.co.uk/maps/uixapi/xapi.html
    request = provider + '*' + bbox
    # should check for http errors and such here
    osm = requests.get(request).text.encode('ascii', 'ignore')
        # had a problem with encoding on some name values
    multips = osm_multips(str(osm))
    results = {}
    results['polygons'] = osm_polygons(str(osm), context)

    if context:
        results['nodes'] = osm_nodes(str(osm), context)
    if multips:
        results['polygons']['intersect']['features'].append(multips[0])
        if context:
            results['polygons']['context']['features'].append(multips[0])

    return results


def osm_multips(osm_string):
    # looking for relations with tags that match to_intersect['way']
    # gather all the ids within that relation, then build polygons of those way
    # result ready to insert into osm_polygons['features']
    # last minute, this could be better
    ids, multi_ways = [], []
    tree = fromstring(osm_string)
    if len(to_intersect['way']) or len(to_display['way']):
        for rel in tree.iterfind('relation'):
            for tag in rel.iterfind('tag'):
                check = str(tag.get('k') + '=' + tag.get('v')).lower()
                if any(check == val for val in to_intersect['way']):
                    for member in rel.iterfind('member'):
                        if member.get('type') == 'way':
                            ids.append(member.get('ref'))

    for way in tree.iterfind('way'):
        if way.get('id') in ids:
            coords = []
            for nd in way.iterfind('nd'):
                for node in tree.iterfind('node'):
                    if (node.get('id') == nd.get('ref')):
                        coords.append([float(node.get('lon')), float(node.get('lat'))])
            poly = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [coords]
                },
                'properties': {
                    'popupContent': ''
                }
            }
            multi_ways.append(poly)

    return multi_ways


def osm_polygons(osm_string, display=1):
    # try converting this to json and see how much easier/harder
    # also, pull parser?
    inter_json = {'type': 'FeatureCollection', 'features': []}
    disp_json = {'type': 'FeatureCollection', 'features': []}
    tree = fromstring(osm_string)

    if len(to_intersect['way']) or len(to_display['way']):
        for way in tree.iterfind('way'):
            inter_c, disp_c, props, coords = 0, 0, {}, []
            for tag in way.iterfind('tag'):
                check = str(tag.get('k') + '=' + tag.get('v')).lower()
                if any(check == val for val in to_intersect['way']):
                    inter_c += 1
                if any(check == val for val in to_display['way']):
                    disp_c += 1
                    props['tag'] = str(tag.get('v')).capitalize()
                if tag.get('k') == 'name':
                    props['name'] = ': ' + str(tag.get('v'))
            if inter_c or disp_c:
                for nd in way.iterfind('nd'):
                    # horribly inefficient, qd
                    for node in tree.iterfind('node'):
                        if (node.get('id') == nd.get('ref')):
                            coords.append([float(node.get('lon')), float(node.get('lat'))])
                poly = {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Polygon',
                        'coordinates': [coords]
                    },
                    'properties': {
                        'popupContent': ''
                    }
                }
                if 'tag' in props:
                    poly['properties']['popupContent'] += props['tag']
                if 'name' in props:
                    poly['properties']['popupContent'] += props['name']
                if inter_c:
                    inter_json['features'].append(poly)
                if disp_c and display:
                    disp_json['features'].append(poly)

    return {
        'intersect': inter_json,
        'display': disp_json
    }


def osm_nodes(osm_string, display):
    inter_json = {'type': 'FeatureCollection', 'features': []}
    disp_json = {'type': 'FeatureCollection', 'features': []}
    tree = fromstring(osm_string)

    if len(to_intersect['node']) or len(to_display['node']):
        for node in tree.iterfind('node'):
            inter_c, disp_c, props, coords = 0, 0, {}, []
            for tag in node.iterfind('tag'):
                check = str(tag.get('k') + '=' + tag.get('v')).lower()
                if any(check == val for val in to_intersect['node']):
                    inter_c += 1
                if any(check == val for val in to_display['node']):
                    disp_c += 1
                    props['tag'] = str(tag.get('v')).capitalize()
                if tag.get('k') == 'name':
                    props['name'] = ': ' + str(tag.get('v'))
            if inter_c or disp_c:
                coords = [float(node.get('lon')), float(node.get('lat'))]
                pnt = {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': coords
                    },
                    'properties': {
                        'popupContent': ''
                    }
                }
                if 'tag' in props:
                    pnt['properties']['popupContent'] += props['tag']
                if 'name' in props:
                    pnt['properties']['popupContent'] += props['name']
                if inter_c:
                    inter_json['features'].append(pnt)
                if disp_c and display:
                    disp_json['features'].append(pnt)

    return {
        'intersect': inter_json,
        'display': disp_json
    }


def intersection(osm_geojson, other_geo, other='wkt'):
    # returns true for intersection, false for no intersection
    # osm_geojson = json.loads(osm_geojson)
    for feature in osm_geojson['features']:
        # todo: remove need for wkt/json conditional
        feature = asShape(feature['geometry'])
        if other == 'wkt':
            if feature.intersects(other_geo) is True:
                return True
        elif other == 'geojson':
            return False
            # yes, premature
    return False


def prep(polygon):
    polygon['geo'] = mapping(polygon['geo'])
    polygon['geo']['coordinates'] = listit(polygon['geo']['coordinates'])
    try:
        # there's a rare issue with mapping(), everything ends up as a single key/value
        # I think I got it, looking out for others
        if (len(polygon['geo']['coordinates']) > 1):
            # multipolygon, just the first one
            polygon['geo']['coordinates'] = [polygon['geo']['coordinates'][0]]
        del polygon['geo']['coordinates'][0][-1]
        # remove the start/end polygon connecting point, leaflet should understand this
    except:
        return 'json_problem'
    return polygon


def done(id, result, geo_after=False):
    # a few columns have been added to the original table
    # ALTER TABLE parks ADD skip_count NUMERIC NOT NULL DEFAULT 0
    # ALTER TABLE parks ADD unixtime NUMERIC
    # ALTER TABLE parks ADD result TEXT
    unix = int(time.time())
    try:
        conn = sqlite3.connect('merged.sqlite')
        if result == 'skip':
            conn.execute('UPDATE merged SET skip_count = skip_count + ?, unixtime = ? WHERE OGC_FID = ?', (1, unix, id))
        elif result == 'new':
            conn.execute('UPDATE merged SET result = ?, unixtime = ? WHERE OGC_FID = ?', (result, unix, id))
        else:
            conn.execute('UPDATE merged SET result = ?, unixtime = ? WHERE OGC_FID = ?', (result, unix, id))
        conn.commit()
        conn.close()
    except sqlite3.OperationalError:
        # add the new columns, can it done in a single statement?
        # conn = sqlite3.connect('merged.sqlite')
        return 'ok'


def changeset(userid):
    # creates a new changeset or finds an open one already created by us
    # returns the changeset id
    id = 0
    baseurl = 'http://api06.dev.openstreetmap.org/api/0.6/changesets?&open=1&user='
    query = baseurl + userid
    # should check for errors and such
    r = requests.get(query)
    result = fromstring(r.text)
    for cset in result.iterfind('changeset'):
        if cset.get('open') == 'true':
            for tag in cset.iterfind('tag'):
                if (tag.get('k') == 'created_by' and tag.get('v') == CREATED_BY):
                    id = cset.get('id')
    if id == 0:
        id = False
        # no open changeset, need to create one
        # http://wiki.openstreetmap.org/wiki/API_v0.6#Create:_PUT_.2Fapi.2F0.6.2Fchangeset.2Fcreate
        # need to get OAuth working first
    return id


def build_upload(changeset, coordinates, tags):
    # diff upload, osmChange format
    # http://wiki.openstreetmap.org/wiki/API_v0.6#Diff_upload:_POST_.2Fapi.2F0.6.2Fchangeset.2F.23id.2Fupload
    # http://gitorious.org/osm-poi-tools/monetdb/blobs/4885d983bcbd563c31250fce9741f28b1127a001/oscparser.py
    # replace name bullshit w/ support for a dict of k/v tags to apply to way
    osmchange = Element('osmChange', version='0.6')
    create = SubElement(osmchange, 'create')
    nodes = []
    nds = []
    count = 1
    tstamp = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    changeset = str(changeset)
    for coord in coordinates:
        id = '-' + str(count)
        nodes.append(Element('node', id=id, lat=str(coord[1]), lon=str(coord[0]), changeset=changeset, timestamp=tstamp))
        nds.append(Element('nd', ref=id))
        count = count + 1
    # adding polygon wrap around node
    nds.append(nds[0])
    create.extend(nodes)
    way = SubElement(create, 'way', id='-' + str(count), changeset=changeset, timestamp=tstamp)
    way.extend(nds)

    if type(tags) == type(dict()) and len(tags) > 0:
        for k, v in tags.iteritems():
            SubElement(way, 'tag', k=k, v=v)

    return tostring(osmchange)


def prep_tags(tags):
    del tags['geo']
    del tags['id']

    if tags['name'] == '':
        del tags['name']

    return tags

def listit(t):
    # http://stackoverflow.com/q/1014352
    return list(map(listit, t)) if isinstance(t, (list, tuple)) else t


if __name__ == '__main__':
    app.run(debug=True)
