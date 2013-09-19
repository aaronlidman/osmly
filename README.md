![OSMLY screenshot](https://raw.github.com/aaronlidman/osmly/master/example.jpg)

OSMLY is a browser based importer for collaborative item-by-item reviewing, editing, and uploading to OpenStreetMap. It aims to make simple imports easier, more cooperative, and less error prone, from source to upload and beyond.

These are the clientside components, serverside components are at [osmly-server](http://github.com/aaronlidman/osmly-server).

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

###Development
- get [osmly-server](http://github.com/aaronlidman/osmly-server), in that directory run `python server.py`
- in this directory (osmly) run `python -m SimpleHTTPServer` to get around some local browser restrictions
- `dev-template.html` is the launching point for most of the action
    - `dev-template.html` is used for developement while `sample-template.html` should be used making new imports
    - a new template, with it's own settings, is made for each import
- `npm install` for build dependencies (not needed if you're not building)
- `make` to build
- also see [settings documentation](settings_documentation.md)
- see serverside components at [osmly-server](http://github.com/aaronlidman/osmly-server) for more
