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

### Current flow
- WARNING: make sure everything is approved by the appropriate OSM authorities like the [imports mailing list](http://lists.openstreetmap.org/pipermail/imports/) before importing to the main OSM API, if you aren't sure, ask somebody
    - [further details on the OSM wiki](http://wiki.openstreetmap.org/wiki/Import)
- prep the source
    - reproject to EPSG:4326 (WGS 84)
	- remove useless attributes (like official internal ids)
        - OSMLY can do this for you, see `usePropertyAsTag` setting in [settings_documentation.md](blob/master/settings_documentation.md) it takes a whitelist of properties you want to use, everything else is ignored
	- rename attributes to their osm equivalents
        - OSMLY can do this for you, see `renameProperty` setting in [settings_documentation.md](blob/master/settings_documentation.md)
	- add any needed common attribute like 'source=cityXYZ' or 'leisure=park'
        - OSMLY can also do this for you, see `appendTag` setting in [settings_documentation.md](blob/master/settings_documentation.md)
- convert your source to geojson
    - I suggest ogr2ogr or QGIS
        - [ogr2ogr geojson details](http://www.gdal.org/ogr/drv_geojson.html)
        - example ogr2ogr: `ogr2ogr -f "GeoJSON" -simplify 0.0001 -t_srs "EPSG:4326" -sql "SELECT NAME as name from parks" -progress parks.geojson parks.shp`
- run `python build.py YOURGEOJSON`
	- this makes sure geometry is valid, simplifies, seperates easy and difficult items, adds bounds for getting nearby OSM items, and converts everything to a sqlite database ready to be served up to the world

### BSD License
