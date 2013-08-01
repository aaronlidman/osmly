OSMLY_JS = \
	static/js/osmly/osmly.js \
	static/js/osmly/osmly.map.js \
	static/js/osmly/osmly.ui.js \
	static/js/osmly/osmly.connect.js \
	static/js/osmly/osmly.user.js \
	static/js/osmly/osmly.item.js

OSMLY_CSS = \
	static/css/css.css \
	static/css/general_foundicons.css \
	static/css/leaflet.css \
	static/css/leaflet.label.css \
	static/css/reveal.css \

all: dist/osmly.min.js dist/osmly.min.css

dist/osmly.js: $(OSMLY_JS) Makefile
	@rm -f $@
	cat $(OSMLY_JS) >> $@

dist/osmly.min.js: dist/osmly.js Makefile
	@rm -f $@
	node_modules/.bin/uglifyjs $< -c -m -o $@

dist/osmly.css: $(OSMLY_JS) Makefile
	@rm -f $@
	cat $(OSMLY_CSS) >> $@

dist/osmly.min.css: dist/osmly.css Makefile
	@rm -f $@
	node_modules/.bin/uglifycss $< > $@
