osmly.item = function () {

    var item = {};

    next = function() {
        var request = osmly.settings.featuresApi + 'db=' + osmly.settings.db;
            // request = settings.featuresApi + 'db=' + settings.db + '&id=1047';
                // simple multipolygon
            // request = settings.featuresApi + 'db=' + settings.db + '&id=1108';
                // poly
            // request = settings.featuresApi + 'db=' + settings.db + '&id=810';
                // poly with a hole
            // request = settings.featuresApi + 'db=' + settings.db + '&id=1129';
                // multipolygon with a hole
            // request = settings.featuresApi + 'db=' + settings.db + '&id=1146';
                // context multipolygon isn't showing up, very important it does
            // there was a multipolygon w/ only one coords array in it that screwed things up, didn't get id
                // structured like a polygon, just had type of multipolygon
                // try/catch?

        $.ajax(request).done(function(data) {
            item.data = JSON.parse(data);
            item.id = item.data.properties.id;
            item.bbox = item.data.properties.buffer_bounds;

            // setFeatureLayer() is purposefully here and not in display() due to timing issues
            // basically if we do it during display the map is still zooming and
            // midpoint nodes get all screwed up
            setFeatureLayer();

            if (isEditable(item.data.geometry)) {
                getSetOSM(function() {
                    setup();
                    display();
                });
            } else {
                setup();
                display();
            }
        });
    };

    // checks if the feature has holes, leaflet can't edit them
    function isEditable(geo) {
        if (geo.type == 'Polygon' && geo.coordinates.length > 1) {
            return false;
        }

        if (geo.type == 'MultiPolygon') {
            for (var a = 0, b = geo.coordinates.length; a < b; a += 1) {
                if (geo.coordinates[a].length > 1) return false;
            }
        }

        return true;
    }

    function getSetOSM(callback) {
        osmly.ui.notify('getting nearby OSM data');
        var bbox = 'bbox=' + item.bbox.join(',');

        $.ajax(osmly.settings.readApi + bbox).done(function(xml) {
            osmly.ui.notify('rendering OSM data');
            item.osmContext = osm2geo(xml);
            item.simpleContext = filterContext(osmly.osmContext);

            osmly.current.dataLayer = L.geoJson(osmly.osmContext, {
                style: settings.contextStyle,
                onEachFeature: function(feature, layer) {
                    // hovering displays the name
                    // clicking displays all tags
                    var popup = '',
                        label = null,
                        t = 0,
                        tagKeys = Object.keys(feature.properties);

                    if (feature.properties) {
                        if (feature.properties.name) {
                            label = feature.properties.name;
                        } else {
                            label = '[NO NAME] click for tags';
                        }

                        while (t < tagKeys.length) {
                            popup += '<li><span class="b">' + tagKeys[t] +
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

            callback();
        });
    }

    function filterContext(osmGeoJson) {
        var geo = {
                'type' : 'FeatureCollection',
                'features' : []};

        for (var i = 0; i < osmGeoJson.features.length; i++) {
            var feature = osmGeoJson.features[i],
                match = false;

            for (var key in feature.properties) {
                if (key in settings.context &&
                    settings.context[key].indexOf(feature.properties[key]) > -1 &&
                    !match) {

                    match = true;
                }
            }

            if (match || !Object.keys(settings.context).length) {
                geo.features.push(feature);
            }
        }

        return geo;
    }

    return item;
};