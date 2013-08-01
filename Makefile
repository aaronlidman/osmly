OSMLY_JS = \
	js/osmly/osmly.js \
	js/osmly/osmly.map.js \
	js/osmly/osmly.ui.js \
	js/osmly/osmly.connect.js \
	js/osmly/osmly.item.js

CSS = \
	css/css.css \
	js/lib/leaflet-0.6.4/leaflet.css \
	css/leaflet.label.css \
	css/general_foundicons.css \
	css/reveal.css \

JS_LIBS = \
	js/lib/leaflet-0.6.4/leaflet.js \
	js/lib/jquery-2.0.3.min.js \
	js/lib/Bing.js \
	js/lib/equalize.js \
	js/lib/geo2osm.js \
	js/lib/jquery.reveal.js \
	js/lib/leaflet.draw.js \
	js/lib/leaflet.label.js \
	js/lib/osm2geo.js \
	js/lib/osmauth.min.js \
	js/lib/sha.js

JS_FILES = \
	$(OSMLY_JS) \
	$(JS_LIBS)

all: dist/osmly.min.js dist/osmly.min.css

dist/osmly.js: $(JS_FILES) Makefile
	@rm -f $@
	cat $(JS_FILES) >> $@

dist/osmly.min.js: dist/osmly.js Makefile
	@rm -f $@
	node_modules/.bin/uglifyjs $< -c -m -o $@

dist/osmly.css: $(CSS) Makefile
	@rm -f $@
	cat $(CSS) >> $@

dist/osmly.min.css: dist/osmly.css Makefile
	@rm -f $@
	node_modules/.bin/uglifycss $< > $@
