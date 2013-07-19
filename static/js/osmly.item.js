osmly.item = function () {
    var item = {};

    item.next = function() {
        osmly.ui.notify('getting next item');
        $('#tags li').remove();

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
            item.isEditable = isEditable(item.data.geometry);

            // setFeatureLayer() is purposefully here and not in display() due to timing issues
            // basically if we do it during display the map is still zooming and
            // midpoint nodes get all screwed up
            setItemLayer(item.data);

            renameProperties();
            usePropertiesAsTag();
            appendTags();

            if (item.isEditable) {
                getOsm(function() {
                    osmly.ui.setupItem(item.data.properties);
                    osmly.ui.displayItem(item.isEditable);
                });
            } else {
                osmly.ui.setupItem(item.data.properties);
                osmly.ui.displayItem(item.isEditable);
            }
        });
    };

    function setItemLayer(json) {
        osmly.item.layer = L.geoJson(json, {
            style: osmly.settings.featureStyle,
            onEachFeature: function (feature, layer) {
                if (item.isEditable) {
                    if (json.geometry.type == 'MultiPolygon') {
                        for (var el in layer._layers) {
                            layer._layers[el].editing.enable();
                        }
                    } else {
                        layer.editing.enable();
                    }
                }
            }
        });

        osmly.map.fitBounds(osmly.item.layer.getBounds());
    }

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

    function filterContext(osmGeoJson) {
        var geo = {
                'type' : 'FeatureCollection',
                'features' : []};

        for (var i = 0; i < osmGeoJson.features.length; i++) {
            var feature = osmGeoJson.features[i],
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

    function getOsm(callback) {
        osmly.ui.notify('getting nearby OSM data');
        var bbox = 'bbox=' + item.bbox.join(',');

        $.ajax(osmly.settings.readApi + bbox).done(function(xml) {
            osmly.ui.notify('rendering OSM data');
            item.osmContext = osm2geo(xml);
            item.filteredContext = filterContext(item.osmContext);

            setOsm(item.filteredContext);
            callback();
        });
    }

    function setOsm(osmjson) {
        osmly.item.contextLayer = L.geoJson(osmjson, {
            style: osmly.settings.contextStyle,
            onEachFeature: function(feature, layer) {
                var popup = '',
                    label = '[NO NAME] click for tags',
                    t = 0,
                    tagKeys = Object.keys(feature.properties);

                if (feature.properties) {
                    if (feature.properties.name) {
                        label = feature.properties.name;
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
    }

    function renameProperties() {
        // converts the feature key, doesn't remove old one
        // ex. NAME -> name, CAT2 -> leisure
        for (var prop in osmly.settings.renameProperty) {
            var change = osmly.settings.renameProperty[prop];
            item.data.properties[change] = item.data.properties[prop];
        }
    }

    function usePropertiesAsTag() {
        // filters properties to be used as tags
        for (var prop in item.data.properties) {
            if (osmly.settings.usePropertyAsTag.indexOf(prop) === -1) {
                item.data.properties[prop] = null;
            }
        }
    }

    function appendTags() {
        for (var append in osmly.settings.appendTag) {
            item.data.properties[append] = osmly.settings.appendTag[append];
        }
    }

    return item;
};