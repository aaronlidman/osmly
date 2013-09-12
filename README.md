These are the server components to [osmly](http://github.com/aaronlidman/osmly).

##Use cases
- build your own database for use with osmly
    - see `build.py`
- run your own instance of osmly
    - see `server.py`

##build.py
- converts a geojson file to a special sqlite database with individuals features as rows for osmly
    - makes sure geometry is valid, simplifies, seperates easy and difficult items, and gets a bounding box of each item
    - currently only works with polygons, multipolygons
- dependency: [Shapely](http://toblerity.org/shapely/)
- `python build.py YOURFILE.geojson` creates `YOURFILE.sqlite`
- options:
    - `--simplify FLOAT` - Simplification tolerance for [shapely's simplify function](http://toblerity.org/shapely/manual.html#object.simplify). (default: 0.0001)
    - `--names STRING` - The name property.

##server.py
- a simple application that serves requests against an osmly database
- dependency: [Flask](http://flask.pocoo.org/)
- local server: `python server.py`
- remote Ubuntu server:
    - `sh setup.sh` will install all necessary dependencies and run the server
    - __BEWARE__: this is ment for a dedicated ubuntu server, it doesn't play nice with any existing nginx, uwsgi, or flask instances that might be running
- once running, requests are made against `http://your-ip-address/?db=YOURFILE`
    - no sqlite extension needed on the db query
    - this entry point is used by the osmly client, see the `db` setting in the osmly [settings documentation](https://github.com/aaronlidman/osmly/blob/master/settings_documentation.md).

<!--
### Current flow
- WARNING: make sure everything is approved by the appropriate OSM authorities like the [imports mailing list](http://lists.openstreetmap.org/pipermail/imports/) before importing to the main OSM API, if you aren't sure, ask somebody
    - [further details on the OSM wiki](http://wiki.openstreetmap.org/wiki/Import)
- prep the source
    - remove conflicting duplicates
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
    - this makes sure geometry is valid, simplifies, seperates easy and difficult items, adds bounds, and converts everything to a sqlite database ready to be served up to the world
-->