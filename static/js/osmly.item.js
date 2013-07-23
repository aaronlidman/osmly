osmly.item = (function () {
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
            item.setItemLayer(item.data);

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

    function getTags() {
        var $tags = $('#tags li'),
            tags = [];

        $tags.each(function(i,ele) {
            var k = $(ele).children('.k').text(),
                v = $(ele).children('.v').text();

            if (k !== '' && v !== '') tags.push([k,v]);
        });

        return tags;
    }

    item.toOsm = function(geojson) {
        // tags are contains within geojson.properties
        // if needed, getTags() has user-editted tags
        return '<?xml version="1.0" encoding="UTF-8"?>' +
        '<osm version="0.6" generator="osmly">' + innerOsm(geojson) + '</osm>';
    };

    function innerOsm(geojson) {
        // NOT COMPRESHENSIVE at all, adding features as I need them
            // only testing against leaflet.toGeoJSON output
        var nodes = '',
            ways = '',
            relations = '',
            count = -1,
            changeset = 0;

        if (osmly.token('changeset_id')) changeset = osmly.token('changeset_id');

        for (var a = 0, b = geojson.features.length; a < b; a += 1) {
            var geo = geojson.features[a];
            if (geo.geometry.type == 'Polygon') {
                addPolygon(geo);
            } else if (geo.geometry.type == 'MultiPolygon') {
                addRelation(geo);
            }
        }

        function addPolygon(poly) {
            var p = polygon(poly);
            ways += p.way;
            return p.id;
        }

        function polygon(poly) {
            var nds = [];

            if (poly.geometry.coordinates.length === 1){
                var polyC = poly.geometry.coordinates[0];
                // length-1, osm xml doesn't need repeating nodes
                // use a ref to the first node instead
                for (var c = 0, d = polyC.length-1; c < d; c += 1) {
                    nds.push(count);
                    addNode(polyC[c][1], polyC[c][0]);
                }
                nds.push(nds[0]);
                return way(nds, poly.properties);
            } else {
                // polygon with a hole, make into a relation w/ inner(s)
                poly.geometry.coordinates = [poly.geometry.coordinates];
                    // coordinate structure of a multipolygon
                addRelation(poly);
                return {id: null, way: ''};
            }
        }

        function addRelation(rel) {
            var relStr = '',
                members = '',
                rCoords = rel.geometry.coordinates;

            for (var a = 0, b = rCoords.length; a < b; a += 1) {
                for (var c = 0, d = rCoords[a].length; c < d; c += 1) {
                    var poly = addPolygon({
                        properties: false,
                        coordinates: [rCoords[a][c]]
                    });
                    var role = 'outer';
                        // just let the user fix it in JOSM, polygon-in-polygon?
                    members += '<member type="way" ref="' + poly + '" role="' + role + '"/>';
                }
            }

            rel.properties['type'] = 'multipolygon';
            relStr += '<relation id="' + count + '" changeset="' + changeset + '">';
            relStr += members;
            relStr += cleanTags(rel.properties);
            relStr += '</relation>';
            count--;

            relations += relStr;
        }

        // geojson = lon,lat / osm = lat,lon
        function addNode(lat, lon) {
            var n = '<node id="' + count + '" lat="' + lat + '" lon="' + lon +
            '" changeset="' + changeset + '"/>';
            count--;
            nodes += n;
        }

        function buildNds(array) {
            var xml = '';
            for (var a = 0, b = array.length; a < b; a += 1) {
                xml += '<nd ref="' + array[a] + '"/>';
            }
            return xml;
        }

        function way(nds, tags) {
            tags = tags || [];

            var w = '<way id="' + count + '" changeset="' + changeset + '">' +
            buildNds(nds) + cleanTags(tags) + '</way>';
            count--;

            return {
                id: count + 1,
                way: w
            };
        }

        function cleanTags(tags) {
            var tagStr = '';
            for (var tag in tags) {
                if (tags[tag] != null){
                    tagStr += '<tag k="' + tag + '" v="' + tags[tag] + '"/>';
                }
            }
            return tagStr;
        }

        return nodes + ways + relations;
    }

    return item;
}());
