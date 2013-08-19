osmly.item = (function () {
    var item = {};

    item.next = function() {
        osmly.ui.notify('getting next item');
        $('#tags tr').remove();

        $.ajax(osmly.settings.db).done(function(data) {
            item.data = JSON.parse(data);
            item.id = item.data.properties.id;
            item.bbox = item.data.properties.bounds;
            item.isEditable = isEditable(item.data.geometry);

            // buffer the bounds
            item.bbox = [
                item.bbox[0] - 0.001,
                item.bbox[1] - 0.001,
                item.bbox[2] + 0.001,
                item.bbox[3] + 0.001
            ];

            // this is here and not elsewhere because of timing issues
            item.setItemLayer(item.data);

            renameProperties();
            usePropertiesAsTag();
            appendTags();

            if (item.isEditable) {
                getOsm(function() {
                    osmly.ui.setupItem(item.data.properties);
                    osmly.ui.displayItem();
                });
            } else {
                osmly.ui.setupItem(item.data.properties);
                osmly.ui.displayItem();
            }
        });
    };

    item.setItemLayer = function(json) {
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
        var bbox = 'bbox=' + item.bbox.join(','),
            request = osmly.settings.readApi + bbox;

        $.ajax(request).done(function(xml) {
            osmly.ui.notify('rendering OSM data');
            item.osmContext = osm_geojson.osm2geojson(xml);
            item.filteredContext = filterContext(item.osmContext);
            setContext(item.filteredContext);
            callback();
        });
    }

    function setContext(osmjson) {
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

    item.getTags = function () {
        var tgs = document.getElementById('tags'),
            trs = tgs.getElementsByTagName('tr'),
            tags = {};

        for (var a = 0; a < trs.length; a++) {
            // 0 = key, 1 = value, 2 = minus
            var tds = trs[a].getElementsByTagName('td');
            if (tds[0].innerHTML !== '' && tds[1].innerHTML !== '') {
                tags[tds[0].innerHTML] = tds[1].innerHTML;
            }
        }

        return tags;
    };

    item.toOsm = function(geojson) {
        return osm_geojson.geojson2osm(geojson);
    };

    item.toOsmChange = function(geojson, changesetId) {
        return osm_geojson.geojson2osm(geojson, changesetId, true);
    };

    return item;
}());
