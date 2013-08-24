# WORK IN PROGRESS

![OSMLY screenshot](https://raw.github.com/aaronlidman/parks-project/master/example.jpg)

OSMLY is a browser based importer for collaborative item-by-item reviewing, editting, and uploading to OpenStreetMap. It aims to make simple imports easier, more cooperative, and less error prone, from shapefile (or whatever) to upload.

###Libraries that make this possbile
- [Leaflet](leafletjs.com) for the map
- [Leaflet Label plugin](https://github.com/Leaflet/Leaflet.label) for the labels
- [Leaflet Draw plugin](https://github.com/Leaflet/Leaflet.draw) for editting
- [Leaflet Bing layer](https://github.com/shramov/leaflet-plugins/blob/master/layer/tile/Bing.js) for the Bing tiles
- [osm-auth](https://github.com/osmlab/osm-auth) for OSM authentication
- [CSS-Modal](http://drublic.github.io/css-modal/) for the modals
- [reqwest](https://github.com/ded/reqwest) for requests
- [bonzo](https://github.com/ded/bonzo) for DOM manipulation
- [bean](https://github.com/fat/bean) for events
- [Foundicons](http://zurb.com/playground/foundation-icons) for the icons
- [Animate.css](https://github.com/daneden/animate.css) for animations

<!--
### Current flow
- prep your source
    - reproject to EPSG:4326 (WGS 84)
	- remove useless attributes (like official internal ids)
	- you don't need to rename attributes to their osm equivalents, OSMLY can do that for you
		- see renameProperty
	- you don't need to add a common attribute to everything like 'source=cityXYZ' or 'leisure=park', OSMLY can do that for you
		- see appendTag
- convert your source to geojson
    - I suggest ogr2ogr
- run `python build.py YOURGEOJSON`
	- this makes sure geometry is valid, simplifies, seperates easy and difficult items, adds bounds, and converts everything to a sqlite database ready to be served up to the world

# BSD License

-->

