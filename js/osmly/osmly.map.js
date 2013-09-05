osmly.map = function() {
    var map = L.map('map', {
        center: osmly.settings.origin,
        layers: [new L.BingLayer('Arzdiw4nlOJzRwOz__qailc8NiR31Tt51dN2D7cm57NrnceZnCpgOkmJhNpGoppU')],
        zoom: osmly.settings.zoom,
        maxZoom: 20,
        fadeAnimation: false
    });

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
        maxZoom: 20,
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

        map.removeContext();
        osmly.ui.notify('getting nearby OSM data');
        getOsm(bbox, function(xml) {
            osmly.ui.notify('rendering OSM data');
            context = filterContext(osm_geojson.osm2geojson(xml));
            setContext(context);
            map.showContext();
            callback();
        });

        // for offline usage
        // setTimeout(function() {
        //     setContext('');
        //     map.showContext();
        //     callback();
        // }, 555);
    };

    map.toggleOSM = function() {
        if (map.hasLayer(map.osmTiles)) {
            map.removeOSM();
        } else {
            map.showOSM();
        }
    };

    map.showOSM = function() {
        map.osmTiles.addTo(map);
        map.osmTiles.bringToFront();
    };

    map.removeOSM = function () { map.removeLayer(map.osmTiles); };

    map.removeContext = function() {
        if (map.hasLayer(map.contextLayer)) map.removeLayer(map.contextLayer);
    };

    map.showContext = function() {
        if (!map.hasLayer(map.contextLayer)) {
            map.contextLayer.addTo(map);
            map.contextLayer.bringToFront();
        }
    };

    function getOsm(bbox, callback) {
        $.ajax({
            url: osmly.settings.readApi + 'bbox=' + bbox.join(','),
            dataType: 'xml',
            success: function(xml) {
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
        map.contextLayer = L.geoJson(geojson, {
            style: osmly.settings.contextStyle,
            onEachFeature: function(feature, layer) {
                var popup = '',
                    label = 'NO NAME, click for tags',
                    t = 0,
                    tagKeys = Object.keys(feature.properties);

                if (feature.properties) {
                    if (feature.properties.name) label = feature.properties.name;
                    while (t < tagKeys.length) {
                        popup += '<li><span class="k">' + tagKeys[t] +
                        '</span>: ' + feature.properties[tagKeys[t]] + '</li>';
                        t++;
                    }
                    layer.bindPopup(popup);
                    layer.bindLabel(label);
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
                    } else {
                        layer.editing.enable();
                    }
                }
            }
        });

        osmly.map.fitBounds(map.featureLayer.getBounds());

        if (show) {
            map.featureLayer.addTo(osmly.map);
            map.featureLayer.bringToFront();
        }
    };

    return map;
};
