/* jshint multistr:true */
osmly.map = function() {
    var map = L.map('map', {
        center: osmly.settings.origin,
        layers: [new L.BingLayer('Arzdiw4nlOJzRwOz__qailc8NiR31Tt51dN2D7cm57NrnceZnCpgOkmJhNpGoppU')],
        zoom: osmly.settings.zoom,
        maxZoom: 19,
        fadeAnimation: false
    });

    L.Icon.Default.imagePath = 'dist/leaflet-images/';

    map.on('moveend', function() {
        var coords = map.getCenter().wrap(),
            lat = coords.lat.toFixed(4).toString(),
            lng = coords.lng.toFixed(4).toString(),
            zoom = map.getZoom().toString();
            osmly.osmlink = 'http://www.openstreetmap.org/#map=' + zoom + '/' + lat + '/' + lng;
    });

    map.attributionControl.setPrefix(false);
    if (osmly.settings.writeApi.split('dev').length > 1) map.attributionControl.setPrefix('DEV SERVER');

    map.osmTiles = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        maxNativeZoom: 18
    });

    map.context = function(bbox, buffer, callback){
        // gets, filters, sets, and shows context
        if (buffer) {
            bbox = [
                bbox[0] - buffer,
                bbox[1] - buffer,
                bbox[2] + buffer,
                bbox[3] + buffer
            ];
        }

        if (map.hasLayer(map.contextLayer))
            map.removeLayer(map.contextLayer);

        osmly.ui.notify('getting nearby OSM data');
        getOsm(bbox, function(xml) {
            osmly.ui.notify('rendering OSM data');
            context = filterContext(osm_geojson.osm2geojson(xml, true));
            setContext(context);
            map.addLayer(map.contextLayer);
            callback();
        });

        // for offline usage
        // setTimeout(function() {
        //     setContext('');
        //     map.addLayer(map.contextLayer);
        //     callback();
        // }, 555);
    };

    map.toggleLayer = function(layer) {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        } else {
            map.addLayer(layer);
        }
    };

    function getOsm(bbox, callback) {
        $.ajax({
            url: osmly.settings.readApi + 'bbox=' + bbox.join(','),
            dataType: 'xml',
            success: function(xml) {
                map.osmContext = xml;
                callback(xml);
            }
        });
    }

    function filterContext(geojson) {
        var geo = {
                'type' : 'FeatureCollection',
                'features' : []};

        for (var i = 0; i < geojson.features.length; i++) {
            var feature = geojson.features[i],
                match = false;

            for (var key in feature.properties) {
                if (key in osmly.settings.context &&
                    osmly.settings.context[key].indexOf(feature.properties[key]) > -1 &&
                    !match) {
                    match = true;
                }
            }

            if (match || !Object.keys(osmly.settings.context).length) {
                geo.features.push(feature);
            }
        }
        return geo;
    }

    function setContext(geojson) {
        var index = 0;
        map.contextLayer = L.geoJson(geojson, {
            style: osmly.settings.contextStyle,
            onEachFeature: function(feature, layer) {
                var popup = '',
                    label = 'NO NAME, click for tags',
                    t = 0,
                    tagKeys = Object.keys(feature.properties);

                if (feature.properties) {
                    layer.bindPopup(popup);
                        // popup is bound upfront so we can get a leaflet layer id
                        // this id is included in the 'data-layer' attribute, used for merging

                    if (feature.properties.name) label = feature.properties.name;
                    while (t < tagKeys.length) {
                        // we don't display osm_* tags but they're used for merging
                        if (tagKeys[t].split('osm_').length === 1) {
                            popup += '<li><span class="k">' + tagKeys[t] +
                            '</span>: ' + feature.properties[tagKeys[t]] + '</li>';
                        }
                        t++;
                    }
                    if (feature.geometry.type == 'Point' && osmly.mode.now == 'import') {
                        popup += '<li class="merge"\
                            data-layer-id="' + index + '"\
                            data-tags=\'' + JSON.stringify(feature.properties) + '\'\
                            style="\
                            margin-top: 10px;\
                            text-align: center;\
                            padding: 10px 0;\
                            border: 1px solid #aaa;\
                            background-color: #eee;\
                            cursor: pointer;\
                            ">Merge with import data</li>';
                    }
                    feature.properties._id = index;
                    layer._popup._content = popup;
                    layer.bindLabel(label);
                    index++;
                }
            },
            pointToLayer: function(feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 6,
                    opacity: 1,
                    fillOpacity: 0.33
                });
            }
        });
    }

    map.setFeature = function(geojson, edit, show) {
        map.featureLayer = L.geoJson(geojson, {
            style: osmly.settings.featureStyle,
            onEachFeature: function (feature, layer) {
                if (edit) {
                    if (geojson.geometry.type == 'MultiPolygon') {
                        for (var el in layer._layers) {
                            layer._layers[el].editing.enable();
                        }
                    } else if (geojson.geometry.type == 'Point') {
                       layer.options.draggable = true;
                    } else {
                       layer.editing.enable();
                    }
                }
            }
        });

        map.fitBounds(map.featureLayer.getBounds());

        if (show) {
            map.featureLayer.addTo(osmly.map);
            map.featureLayer.bringToFront();
        }
    };

    return map;
};
