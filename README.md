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