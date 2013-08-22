OSMLY_JS = \
	js/osmly/osmly.js \
	js/osmly/osmly.map.js \
	js/osmly/osmly.ui.js \
	js/osmly/osmly.connect.js \
	js/osmly/osmly.item.js \
	js/osmly/osmly.overview.js \
	js/osmly/common.js

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
	js/lib/Bing.js \
	js/lib/leaflet.draw.js \
	js/lib/leaflet.label.js \
	js/lib/osm_geojson.js \
	js/lib/osmauth.min.js \
	js/lib/sha.js \
	js/lib/modal.js \
	js/lib/reqwest.js \
	js/lib/bean.js \
	js/lib/bonzo.js

all: dist/osmly.min.js  dist/libs.min.js dist/osmly.min.css

dist/osmly.js: $(OSMLY_JS) Makefile
	@rm -f $@
	cat $(OSMLY_JS) >> $@

dist/osmly.min.js: dist/osmly.js Makefile
	@rm -f $@
	node_modules/.bin/uglifyjs2 $< -c -m -o $@
	rm -f dist/osmly.js

dist/libs.js: $(JS_LIBS) Makefile
	@rm -f $@
	cat $(JS_LIBS) >> $@

dist/libs.min.js: dist/libs.js Makefile
	@rm -f $@
	node_modules/.bin/uglifyjs2 $< -c -m -o $@
	rm -f dist/libs.js

dist/osmly.css: $(CSS) Makefile
	@rm -f $@
	cat $(CSS) >> $@

dist/osmly.min.css: dist/osmly.css Makefile
	@rm -f $@
	node_modules/.bin/uglifycss $< > $@
	rm -f dist/osmly.css

clean:
	rm -f dist/osmly*
	rm -f dist/libs*