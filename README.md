# WORK IN PROGRESS

<!--

![OSMLY screenshot](https://raw.github.com/aaronlidman/parks-project/master/example.jpg)

OSMLY is a browser based importer for collaborative item-by-item reviewing, editting, and uploading to OpenStreetMap. It aims to make simple imports easier, more cooperative, and less error prone, from shapefile (or whatever) to upload.

### Current flow
- prep your source
	- remove useless attributes (like official internal ids)
        - OSMLY can also do this for you but it makes the database much smaller if you do it before hand
	- you don't need to rename attributes to their osm equivalents, OSMLY can do that for you
		- see renameProperty
	- you don't need to add a common attribute to everything like 'source=cityXYZ' or 'leisure=park', OSMLY can do that for you
		- see appendTag
- convert your source to geojson
    - I suggest ogr2ogr
- run `python build.py YOURGEOJSON`
	- this cleans up the source, simplifies the geometry a bit (tolerance = 0.0001), adds bounds, and converts everything to a sqlite database ready to be served up to the world

# BSD License
-->