/* jshint multistr:true */
// import is a reserved word but it doesn't apply to properties
osmly.import = (function() {
    var imp = {live: false};

    imp.go = function(){
        if (!imp.live) {
            imp.live = true;
            setInterface();
            bind();
            imp.next();
        } else {
            unbind();
            unsetInterface();
            imp.live = false;
        }
    };

    function bind() {
        // bottom-right buttons
        $('#josm').on('click', josm);
        $('#reset').on('click', reset);
        $('#osmlink').on('click', function(){
            window.open(osmly.osmlink);
        });
        // botton-left buttons
        $('#skip').on('click', skip);
        $('#problem').on('change', problem);
        $('#submit').on('click', submit);
        $('#add-new-tag').on('click', addTag);
        $('#tags').on('click', '.minus', function(){
            if ($('#tags tr').length > 1) this.parentNode.remove();
        });
    }

    function unbind() {
        $('#josm').off();
        $('#reset').off();
        $('#osmlink').off();
        $('#skip').off();
        $('#problem').off();
        $('#submit').off();
        $('#add-new-tag').off();
        $('#tags').off();
    }

    function setInterface() {
        $('body').append('\
            <div id="tags">\
                <table>\
                    <tbody></tbody>\
                </table>\
                <span class="k" id="add-new-tag" alt="Add a new tag">+</span>\
            </div>\
        ');

        $('body').append('\
            <div id="action-block">\
                <li id="hold-problem" style="margin-left: 0;">\
                    <select name="problem" id="problem">\
                        <option value="problem" disabled selected>Problem</option>\
                        <option value="no_park_here">no park here</option>\
                        <option value="already_mapped">already mapped</option>\
                        <option value="poor_imagery">poor imagery</option>\
                        <option value="too_difficult">too difficult</option>\
                    </select>\
                </li>\
                <li id="skip">Skip</li>\
                <li id="submit">Submit</li>\
            </div>\
        ');

        $('body').append('\
            <ul id="bottom-right">\
                <li id="reset">reset</li>\
                <li id="josm">edit in JOSM</li>\
                <li id="osmlink" style="border-bottom: none;">open at osm.org</li>\
            </ul>\
        ');
    }

    function unsetInterface() {
        $('#tags').remove();
        $('#action-block').remove();
        $('#bottom-right').remove();

        osmly.map.closePopup();
        if (imp.layer) osmly.map.removeLayer(imp.layer);
        if (imp.contextLayer) osmly.map.removeLayer(imp.contextLayer);
    }

    function displayItem() {
        imp.layer.addTo(osmly.map);

        if (imp.contextLayer) {
            imp.contextLayer.addTo(osmly.map);
            imp.contextLayer.bringToFront();
        }

        $('#notify').hide();
        $('#hold-problem, #submit, #bottom-right, #action-block').fadeIn(250);

        if (imp.isEditable) {
            $('#tags').fadeIn(250);
        } else {
            $('#hold-problem, #submit').fadeOut(250);
            $('#reusable-modal .modal-content').html(
                '<h3>This feature is too complex. <a>Edit it in JOSM?</a></h3>');
            // put an 'Edit in JOSM' button right there
                // when clicked close the modal and let the other modal open
            // literally bind, $('#josm').click()
            CSSModal.open('reusable-modal');
        }
    }

    function setItemLayer() {
        imp.layer = L.geoJson(imp.data, {
            style: osmly.settings.featureStyle,
            onEachFeature: function (feature, layer) {
                if (imp.isEditable) {
                    if (imp.data.geometry.type == 'MultiPolygon') {
                        for (var el in layer._layers) {
                            layer._layers[el].editing.enable();
                        }
                    } else {
                        layer.editing.enable();
                    }
                }
            }
        });

        osmly.map.fitBounds(imp.layer.getBounds());
    }

    function populateTags() {
        var properties = imp.data.properties;
        for (var tag in properties) {
            if (properties[tag] !== null && properties[tag] !== 'null') {
                $('#tags tbody').append(
                    '<tr>' +
                    '<td class="k" spellcheck="false" contenteditable="true">' +
                    tag + '</td>' +
                    '<td class="v" spellcheck="false" contenteditable="true">' +
                    properties[tag] + '</td>' +
                    '<td class="minus">-</td>' +
                    '</tr>');
            }
        }
    }

    imp.hideItem = function(callback) {
        $('#bottom-right, #action-block, #tags').fadeOut(250, function(){
            if (callback) callback();
        });
        osmly.map.closePopup();
        if (imp.layer) osmly.map.removeLayer(imp.layer);
        if (imp.contextLayer) osmly.map.removeLayer(imp.contextLayer);
    };

    function skip() {
        imp.hideItem();
        $('#tags tr').remove();
        leftToRight($('.foundicon-right-arrow'));
        imp.next();
    }

    function submit() {
        imp.hideItem();

        if (osmly.auth.authenticated() && token('user')) {
            osmly.connect.updateItem('submit');
            osmly.connect.openChangeset(osmly.connect.submitToOSM);
        } else {
            $('#tags tr').remove();
            imp.next();
        }
        bigUp($('.foundicon-up-arrow'));
    }

    function problem() {
        imp.hideItem();

        if (osmly.auth.authenticated() && token('user')) {
            osmly.connect.updateItem('problem', {
                problem: $('#problem').val()
            });
        }
        $('.foundicon-remove').show(function(){
            setTimeout(function(){
                $('.foundicon-remove').fadeOut(250);
            }, 250);
        });
        $('#problem').val('problem');
        $('#tags tr').remove();
        imp.next();
    }

    function josm() {
        $('#reset').trigger('click');
        osmly.connect.editInJosm(imp.id);
    }

    function reset() {
        $('#tags tr').remove();
        imp.hideItem(displayItem);
        setItemLayer();
        populateTags();
    }

    function changeset() {
        osmly.settings.changesetTags['comment'] = $('#changeset-form').text();
        osmly.connect.updateComment(function(){
            CSSModal.close();
            $('#notify').hide();
        });
    }

    function addTag() {
        $('#tags tbody').append('\
            <tr>\
            <td class="k" spellcheck="false" contenteditable="true"></td>\
            <td class="v" spellcheck="false" contenteditable="true"></td>\
            <td class="minus">-</td>\
            </tr>\
        ');
    }

    imp.next = function() {
        osmly.ui.notify('getting next item');

        $.ajax({
            url: osmly.settings.db,
            dataType: 'json',
            success: function(data) {
                nextPrep(data);
            }
        });
    };

    function nextPrep(data) {
        imp.data = data;
        imp.id = imp.data.properties.id;
        imp.bbox = imp.data.properties.bounds;
        imp.isEditable = isEditable(imp.data.geometry);

        // buffer the bounds
        imp.bbox = [
            imp.bbox[0] - 0.001,
            imp.bbox[1] - 0.001,
            imp.bbox[2] + 0.001,
            imp.bbox[3] + 0.001
        ];

        // this is here and not elsewhere because of timing issues
        setItemLayer();

        imp.prepTags();

        if (imp.isEditable) {
            imp.getOsm(imp.bbox, function() {
                populateTags();
                displayItem();
            });
        } else {
            populateTags();
            displayItem();
        }
    }

    function isEditable(geo) {
        // checks if the feature has holes, leaflet can't edit them
        if (geo.type == 'Polygon' && geo.coordinates.length > 1) return false;

        if (geo.type == 'MultiPolygon') {
            for (var a = 0, b = geo.coordinates.length; a < b; a += 1) {
                if (geo.coordinates[a].length > 1) return false;
            }
        }
        return true;
    }

    imp.prepTags = function(tags) {
        // this needs to be used for overview -> josm stuff too
        // bound to data.properties right now
        renameProperties();
        usePropertiesAsTag();
        appendTags();
    };

    function renameProperties() {
        // converts the feature key, doesn't remove old one
        // ex. NAME -> name, CAT2 -> leisure
        for (var prop in osmly.settings.renameProperty) {
            var change = osmly.settings.renameProperty[prop];
            imp.data.properties[change] = imp.data.properties[prop];
        }
    }

    function usePropertiesAsTag() {
        // filters properties to be used as tags
        for (var prop in imp.data.properties) {
            if (osmly.settings.usePropertyAsTag.indexOf(prop) === -1) {
                imp.data.properties[prop] = null;
            }
        }
    }

    function appendTags() {
        for (var append in osmly.settings.appendTag) {
            imp.data.properties[append] = osmly.settings.appendTag[append];
        }
    }

    // these might go in osmly.map as more refined functions
    imp.getOsm = function(bbox, callback) {
        osmly.ui.notify('getting nearby OSM data');
        bbox = 'bbox=' + bbox.join(',');

        $.ajax({
            url: osmly.settings.readApi + bbox,
            dataType: 'xml',
            success: function(xml) {
                osmly.ui.notify('rendering OSM data');
                imp.context = osm_geojson.osm2geojson(xml);
                imp.cleanContext = filterContext(imp.context);
                setContext(imp.cleanContext);
                callback();
            }
        });
    };

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

    function setContext(osmjson) {
        imp.contextLayer = L.geoJson(osmjson, {
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

    imp.tags = function(){
        var tgs = byId('tags'),
            trs = tgs.getElementsByTagName('tr'),
            tags = {};

        for (var a=0; a < trs.length; a++) {
            // 0 = key, 1 = value, 2 = minus
            var tds = trs[a].getElementsByTagName('td');
            if (tds[0].innerHTML !== '' && tds[1].innerHTML !== '') {
                tags[tds[0].innerHTML] = tds[1].innerHTML;
            }
        }

        return tags;
    };

    return imp;
}());
