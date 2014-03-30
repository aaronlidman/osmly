![OSMLY screenshot](http://osmly.com/screenshots/example.jpg)

OSMLY is a browser based importer for collaborative item-by-item reviewing, editing, and uploading to OpenStreetMap. It aims to make simple imports easier, more cooperative, and less error prone.

###Libraries that make this possbile
- [Leaflet](leafletjs.com) for the map
- [Leaflet Label plugin](https://github.com/Leaflet/Leaflet.label) for the labels
- [Leaflet Draw plugin](https://github.com/Leaflet/Leaflet.draw) for editting
- [Leaflet Bing layer](https://github.com/shramov/leaflet-plugins/blob/master/layer/tile/Bing.js) for the Bing tiles
- [osm-auth](https://github.com/osmlab/osm-auth) for OSM authentication
- [CSS-Modal](http://drublic.github.io/css-modal/) for the modals
- [Zepto](http://zeptojs.com/) for DOM, events, ajax, and animations
- [Foundicons](http://zurb.com/playground/foundation-icons) for the icons
- [osm-and-geojson](http://github.com/aaronlidman/osm-and-geojson) for converting between osm and geojson

###Local Development
- npm install
- node index.js
- `dev-template.html` is the launching point for most of the action
    - `dev-template.html` is used for developement while `sample-template.html` should be used making new imports
    - this is totally aped from [iD](https://github.com/openstreetmap/iD)'s index.html
    - a new template, with it's own settings, is made for each import
- `make` to build
- also see [settings documentation](settings_documentation.md)

###build.py
- converts a geojson file into a sqlite database with individuals features as rows
    - makes sure geometry is valid, simplifies, seperates easy and difficult items, and gets a bounding box of each item
    - currently only works with polygons, multipolygons
- dependency: [Shapely](http://toblerity.org/shapely/)
    - pip install Shapely
- `python build.py YOURFILE.geojson` creates `YOURFILE.sqlite`
- options:
    - `--simplify FLOAT` - a simplification tolerance for [shapely's simplify function](http://toblerity.org/shapely/manual.html#object.simplify). (default: 0.0001)
    - `--names STRING` - The name property.

###server.js
- serves each item from the database that was created by `build.py`
- once running, requests are made against `http://your-ip-address/?db=YOURFILE`
- for ubuntu:
```
sudo apt-get update
sudo apt-get install -y htop git sqlite3 python-software-properties
sudo apt-add-repository --yes ppa:chris-lea/node.js
sudo apt-get update -y
sudo apt-get install -y nodejs build-essential
npm install
```

---
OSMLY was written in the [Huntington Beach Central Library](http://www.flickr.com/search/?w=88017382@N00&q=huntington%20beach%20central%20library). Everyday I'd start at the lower deck and move up as the day progressed, always on the top level by sunset. I owe that place big time.
