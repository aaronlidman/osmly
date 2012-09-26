from xml.etree.ElementTree import ElementTree, fromstring
import sqlite3
import ogr
from flask import Flask, jsonify
import urllib2

app = Flask(__name__)

@app.route('/poly')
def poly():
	polygon = next_polygon().Buffer(0.002)
	envelope = map(str, polygon.GetEnvelope())
	bbox = '[bbox=' + envelope[0] + ',' + envelope[2] + ',' + envelope[1] + ',' + envelope[3] + ']'
	osm_xml = get_osm(bbox)
	return filter_ways(osm_xml)
	# traverse the xml
		# check attributes of each way
		# find leisure=park, leisure=nature_reserve, natural=wood, landuse=cemetery, amenity=grave_yard

def next_polygon():
	conn = sqlite3.connect('merged.sqlite')
	row = conn.execute('SELECT GEOMETRY FROM merged WHERE OGC_FID="9844"')
	poly_wkb = str(row.fetchone()[0])
	geo = ogr.CreateGeometryFromWkb(poly_wkb)
	return geo.Simplify(0.0001)

def get_osm(bbox):
	# provider = 'http://overpass.osm.rambler.ru/cgi/xapi?'
	provider = 'http://www.overpass-api.de/api/xapi?'
	# provider = 'http://open.mapquestapi.com/xapi/api/0.6/'	
	# provider = 'http://jxapi.osm.rambler.ru/xapi/api/0.6/'
	request = provider + 'way' + bbox
	# should check for errors before returning this
	# returns osm xml
	return urllib2.urlopen(request).read()

def filter_ways(osm_string):
	tree = fromstring(osm_string)
	for way in tree.iterfind('way'):
		for tag in way.iterfind('tag'):
			if ((tag.get('k') == 'landuse') and (tag.get('v') == 'forest')):
				# get the points and check for an intersection
				print 'forest'
			elif (tag.get('k') == 'leisure' and (tag.get('v') == 'park')):
				print 'park'
			elif (tag.get('k') == 'leisure' and (tag.get('v') == 'nature_reserve')):
				print 'n_r'

		print type(way)

	return 'yea boy'

if __name__ == '__main__':
    app.run(debug=True)

# http://open.mapquestapi.com/xapi/api/0.6/node[leisure=park][bbox=-77.3092635973702,38.77052546647185,-76.75994719114213,39.01102601823265]