OSMLY_JS = \
	js/osmly/osmly.js \
	js/osmly/osmly.map.js \
	js/osmly/osmly.ui.js \
	js/osmly/osmly.connect.js \
	js/osmly/osmly.item.js \
	js/osmly/osmly.overview.js

CSS = \
	js/lib/leaflet-0.6.4/leaflet.css \
	css/leaflet.label.css \
	css/general_foundicons.css \
	css/css.css \
	css/leaflet-overwrite.css \
	css/animations.css \
	css/modal.css

JS_LIBS = \
	js/lib/leaflet-0.6.4/leaflet.js \
	js/lib/jquery-2.0.3.min.js \
	js/lib/Bing.js \
	js/lib/leaflet.draw.js \
	js/lib/leaflet.label.js \
	js/lib/osm_geojson.js \
	js/lib/osmauth.min.js \
	js/lib/sha.js \
	js/lib/modal.js \
	js/lib/reqwest.js

JS_FILES = \
	$(JS_LIBS) \
	$(OSMLY_JS)

all: dist/osmly.min.js dist/osmly.min.css

dist/osmly.js: $(JS_FILES) Makefile
	@rm -f $@
	cat $(JS_FILES) >> $@

dist/osmly.min.js: dist/osmly.js Makefile
	@rm -f $@
	node_modules/.bin/uglifyjs2 $< -c -m -o $@
	rm -f dist/osmly.js

dist/osmly.css: $(CSS) Makefile
	@rm -f $@
	cat $(CSS) >> $@

dist/osmly.min.css: dist/osmly.css Makefile
	@rm -f $@
	node_modules/.bin/uglifycss $< > $@
	rm -f dist/osmly.css
