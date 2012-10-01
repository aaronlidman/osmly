from xml.etree.ElementTree import ElementTree, fromstring
import sqlite3
from flask import Flask, render_template
import urllib2
import json
from shapely.geometry import asShape
from shapely.geometry import LineString
from shapely.geometry import mapping
import shapely.wkt

app = Flask(__name__)

@app.route('/poly')
def poly():
	polygon = next_polygon()
	envelope = map(str, polygon.bounds)
	print envelope
	bbox = '[bbox=' + envelope[0] + ',' + envelope[1] + ',' + envelope[2] + ',' + envelope[3] + ']'
	print bbox
	osm_xml = get_osm(bbox)
	from_osm = osm_polygons(osm_xml)
	if polys_intersect(from_osm, polygon) == False:
		print 'no overlap'
		polygon = str(mapping(polygon))
		print envelope[1] + ',' + envelope[0] + ',' + envelope[3] + ',' + envelope[2]
		# start with the template + displaying polygon on the map
		return render_template('poly.html', polygon = polygon)
		# this doesn't work, leaflet needs real geojson
	else:
		print 'overlap'
		# throw up some status message about the time wait, log the overlap in the db, start with the next polygon, possibly ajax it?
		# just reload the page?
	return from_osm

def next_polygon():
	conn = sqlite3.connect('merged.sqlite')
	row = conn.execute('SELECT GEOMETRY FROM merged WHERE OGC_FID="10022"')
	poly_wkb = str(row.fetchone()[0])
	geo = shapely.wkb.loads(poly_wkb)
	return geo.simplify(0.0001)

def get_osm(bbox):
	# provider = 'http://overpass.osm.rambler.ru/cgi/xapi?'
	provider = 'http://www.overpass-api.de/api/xapi?'
	# provider = 'http://open.mapquestapi.com/xapi/api/0.6/'	
	# provider = 'http://jxapi.osm.rambler.ru/xapi/api/0.6/'
	request = provider + 'way' + bbox
	# should check for errors before returning this
	return urllib2.urlopen(request).read()

def osm_polygons(osm_string):
	# forgot about xpath, it would simplify this quite a bit
	# should like to use a pull parser to handle larger files
	geojson = {'type': 'FeatureCollection', 'features': []}
	tree = fromstring(osm_string)
	for way in tree.iterfind('way'):
		keep = 0
		for tag in way.iterfind('tag'):
			if ((tag.get('k') == 'landuse') and (tag.get('v') == 'forest')):
				keep += 1
			elif (tag.get('k') == 'leisure' and (tag.get('v') == 'park')):
				keep += 1
			elif (tag.get('k') == 'leisure' and (tag.get('v') == 'nature_reserve')):
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

def polys_intersect(polys_geojson, poly_wkt):
	# checks if poly_wkt intersects with any polygons in polys_geojson
	# returns true for intersection, false for no intersection
	polys_geojson = json.loads(polys_geojson)
	for feature in polys_geojson['features']:
		feature = asShape(feature['geometry'])
		if (feature.intersects(poly_wkt)) == True:
			return True
	return False

if __name__ == '__main__':
    app.run(debug=True)