window.osmly = function () {
/*
- Leaflet: leafletjs.com
- Bing plugin: github.com/shramov/leaflet-plugins/blob/master/layer/tile/Bing.js
- jQuery: jquery.com
- equalize.js plugin: github.com/tsvensen/equalize.js
- ohauth: github.com/tmcw/ohauth
- osm2geo: gist.github.com/1396990

TODO
    - use http://cdnjs.com/ for libraries?
    - success + failure callbacks on every request
    - common ohauth.xhr function
    - group oauth functions like iD
        - https://github.com/systemed/iD/blob/master/js/id/oauth.js#L53
        - same idea can be applied to changesets, submitting?, setup, L.toGeoJson
    - refactor
    - keypress shortcuts
        - W + S, zoom in/out on pointer
        - A + D, open problem menu, skip
    - eventually, decouple ui
    - crossbrowser test ui
        - especially modal and tag stuff
    - reset button functionality
    - remote JOSM file functionality
*/

var osmly = {
        featuresApi: '',
        db: '',
        writeApi: 'http://api06.dev.openstreetmap.org',
        oauth_secret: 'Mon0UoBHaO3qvfgwWrMkf4QAPM0O4lITd3JRK4ff',
        readApi: 'http://www.overpass-api.de/api/xapi?map?',
        context: {}, // {key: ['some', 'tags'], otherkey: ['more', 'tags']}
        div: 'map',
        origin: [0,0],
        zoom: 2,
        demo: false,
        changesetTags: [ // include specifics to the import
            ['created_by', 'osmly'],
            ['osmly:version', '0'],
            ['imagery_used', 'Bing']
        ],
        renameProperty: {}, // {'MEssy55': 'clean'}, only converts key not value
        usePropertyAsTag: [], // just keys
        appendTag: {}, // {'key': 'value'}, will overwrite existing tags
        consumerKey: 'yx996mtweTxLsaxWNc96R7vpfZHKQdoI9hzJRFwg'
    },
    user = {
        id: -1,
        name: 'demo'
    },
    current = {},
    o = {
        oauth_consumer_key: osmly.consumerKey,
        oauth_signature_method: 'HMAC-SHA1'};

osmly.set = function(object) {
    if (typeof object === 'object') {
        for (var obj in object) {
            osmly[obj] = object[obj];
        }
        return osmly;
    } else {
        return false;
    }
};

osmly.go = function() {
    map = L.map(osmly.div, {
        center: osmly.origin,
        layers: [new L.BingLayer('Anqm0F_JjIZvT0P3abS6KONpaBaKuTnITRrnYuiJCE0WOhH6ZbE4DzeT6brvKVR5')],
        zoom: osmly.zoom,
        maxZoom: 20
    });

    osmly.map = map;

    if (!osmly.demo && token('token') && token('secret')) {
        userDetailsUI();
        next();
    } else {
        if (osmly.demo) $('#login').text('Demonstration »');

        $('#login').fadeIn(500);
    }

    map.on('move', function() {
        var coords = map.getCenter(),
            lat = coords.lat.toFixed(4).toString(),
            lng = coords.lng.toFixed(4).toString(),
            zoom = map.getZoom().toString();
            string = '<span id="prefix_text">' +
                '<a href="http://www.openstreetmap.org/?lat=' + lat +
                '&lon=' + lng + '&zoom=' + zoom + '" target="_blank">' +
                lat + ', ' + lng + '</a>' +
                '</span>';
        map.attributionControl.setPrefix(string);
    });

    $('#login').click(function() {
        notify('');

        if (osmly.demo) {
            $('#login').fadeOut(500);
            next();
        } else {
            $('#login').fadeOut(500);
            request_oauth();
        }
    });

    $('#instruction').click(function() {
        $('#instruction-modal').reveal({
             animation: 'fade',
             animationspeed: 200,
             closeonbackgroundclick: true,
             dismissmodalclass: 'close-reveal-modal'
        });
    });

    $('#changeset').click(function(e) {
        e.preventDefault();
        $('#changeset-modal').reveal({
             animation: 'fade',
             animationspeed: 200,
             closeonbackgroundclick: true,
             dismissmodalclass: 'close-reveal-modal'
        });
    });

    $('#update-change').click(function() {
        osmly.changesetTags.push(['comment', $('#changeset-form').text()]);
        updateChangeset(token('changeset_id'), function() {
            $('#changeset-modal').trigger('reveal:close');
            $('#notify').fadeOut(250);
        });
    });

    $('#reset').click(function() {
        reset();
    });
};

// next 2 functions from iD: https://github.com/systemed/iD/blob/master/js/id/oauth.js
function keyclean(x) { return x.replace(/\W/g, ''); }

function token(k, x) {
    if (arguments.length === 2) {
        localStorage[keyclean(osmly.writeApi) + k] = x;
    }
    return localStorage[keyclean(osmly.writeApi) + k];
}

function request_oauth() {
    var url = osmly.writeApi + '/oauth/request_token';

    // https://github.com/systemed/iD/blob/master/js/id/oauth.js#L72
    var w = 650, h = 500,
    settings = [
        ['width', w], ['height', h],
        ['left', screen.width / 2 - w / 2],
        ['top', screen.height / 2 - h / 2]].map(function(x) {
            return x.join('=');
        }).join(','),
    popup = window.open('about:blank', 'oauth_window', settings),
    locationCheck = window.setInterval(function() {
        if (popup.closed) return window.clearInterval(locationCheck);
        if (popup.location.search) {
            var search = popup.location.search,
            oauth_token = ohauth.stringQs(search.slice(1));
            popup.close();
            access_oauth(oauth_token);
            window.clearInterval(locationCheck);
        }
    }, 100);

    o.oauth_timestamp = ohauth.timestamp();
    o.oauth_nonce = ohauth.nonce();
    o.oauth_signature = ohauth.signature(osmly.oauth_secret, '',
        ohauth.baseString('POST', url, o));

    ohauth.xhr('POST', url, o, null, {}, function(xhr) {
        var string = ohauth.stringQs(xhr.response);
        token('ohauth_token_secret', string.oauth_token_secret);

        popup.location = osmly.writeApi + '/oauth/authorize?' + ohauth.qsString({
            oauth_token: string.oauth_token,
            oauth_callback: location.href
        });

    });
}

// https://github.com/systemed/iD/blob/master/js/id/oauth.js#L107
function access_oauth(oauth_token) {
    var url = osmly.writeApi + '/oauth/access_token',
        token_secret = token('ohauth_token_secret');

    o.oauth_timestamp = ohauth.timestamp();
    o.oauth_nonce = ohauth.nonce();
    o.oauth_token = oauth_token.oauth_token;

    if (!token_secret) return console.error('Required token not found');

    o.oauth_signature = ohauth.signature(osmly.oauth_secret, token_secret,
        ohauth.baseString('POST', url, o));

    ohauth.xhr('POST', url, o, null, {}, function(xhr) {
        var access_token = ohauth.stringQs(xhr.response);
        token('token', access_token.oauth_token);
        token('secret', access_token.oauth_token_secret);

        getUserDetails();
        userDetailsUI();
        next();
    });
}

function getUserDetails() {
    // this is all pretty stupid, we just need the username
    // we're only using the username to link the user to their own profile
        // ~50 lines for one link, a tiny convenience
    // probably removing soon
    var url = osmly.writeApi + '/api/0.6/user/details',
        token_secret = token('secret');

    o.oauth_timestamp = ohauth.timestamp();
    o.oauth_nonce = ohauth.nonce();
    o.oauth_token = token('token');

    o.oauth_signature = ohauth.signature(osmly.oauth_secret, token_secret,
        ohauth.baseString('GET', url, o));

    ohauth.xhr('GET', url, o, '', {},
        function(xhr) {
            var u = xhr.responseXML.getElementsByTagName('user')[0],
                img = u.getElementsByTagName('img');

            user.name = u.getAttribute('display_name');
            user.id = u.getAttribute('id');

            if (img.length) {
                user.avatar = img[0].getAttribute('href');
            }

            // not using the id or avatar for anything yet
            token('userName', user.name);
            token('userId', user.id);
            token('userAvatar', user.avatar);
        });
}

function userDetailsUI() {
    $('#user')
        .html('<a href="' + osmly.writeApi + '/user/' +
            token('userName') + '" target="_blank">' + token('userName') + '</a>')
        .fadeIn(500);
}

function next() {
    notify('getting next');
    $('#tags li').remove();

    var current = {},
        request = osmly.featuresApi + 'db=' + osmly.db;
    // var request = osmly.featuresApi + 'db=' + osmly.db + '&id=1047';
    // var request = osmly.featuresApi + 'db=' + osmly.db + '&id=1108';
    // var request = osmly.featuresApi + 'db=' + osmly.db + '&id=810';

    $.ajax({
        type: 'GET',
        url: request
    }).success(function(data) {
        data = JSON.parse(data);
        current.feature = data;
        current.id = current.feature.properties.id;


        // fixes same first/last node issue
        // fix coming to leaflet any day now
        // --- delete w/ leaflet update
        // this is one hell of a mess but I really don't care
        if (current.feature.geometry.coordinates.length > 1) {
            if (current.feature.geometry.type == "MultiPolygon") {
                var aa = current.feature.geometry.coordinates.length;
                while (aa--) {
                    current.feature.geometry.coordinates[aa][0].pop();
                }
            } else if (current.feature.geometry.type == "Polygon"){
                var bb = current.feature.geometry.coordinates.length;
                while (bb--) {
                    current.feature.geometry.coordinates[bb].pop();
                }
            }
        } else {
            current.feature.geometry.coordinates[0].pop();
        }
        // ^^ --- to delete w/ leaflet update


        if (osmly.demo) console.log(current);

        osmly.current = current;

        setFeatureLayer();
        getSetOSM();
    });
}

function setFeatureLayer() {
    osmly.current.layer = L.geoJson(osmly.current.feature, {
        style: {
            'color': '#00FF00',
            'weight': 3,
            'opacity': 1
        },
        onEachFeature: function (feature, layer) {
            if (osmly.current.feature.geometry.type == 'MultiPolygon') {
                for (var ayer in layer._layers) {
                    layer._layers[ayer].editing.enable();
                }
            } else {
                layer.editing.enable();
            }
        }
    });

    map.fitBounds(osmly.current.layer.getBounds());
}

function reset() {
    map.closePopup();
    map.removeLayer(osmly.current.layer);
    setFeatureLayer();
    osmly.current.layer.addTo(map);
    osmly.current.dataLayer.bringToFront();
}

function newChangesetXml() {
    var c = osmly.changesetTags.length,
        tags = '';

    console.log(osmly.changesetTags);

    while (c--) {
        tags +=
            '<tag k="' + osmly.changesetTags[c][0] +
            '" v="' + osmly.changesetTags[c][1] + '"/>';
    }

    return '<osm><changeset>' + tags + '<\/changeset><\/osm>';
}

function createChangeset(callback) {
    var url = osmly.writeApi + '/api/0.6/changeset/create',
        token_secret = token('secret'),
        change = newChangesetXml();

    notify('creating a new changeset');

    o.oauth_timestamp = ohauth.timestamp();
    o.oauth_nonce = ohauth.nonce();
    o.oauth_token = token('token');

    o.oauth_signature = ohauth.signature(osmly.oauth_secret, token_secret,
        ohauth.baseString('PUT', url, o));

    ohauth.xhr('PUT', url, o, change, {header: {'Content-Type': 'text/xml'}},
        function(xhr) {
            var id = xhr.response + '';

            token('changeset_id', id);

            callback();
        });
}

function updateChangeset(id, callback) {
    var url = osmly.writeApi + '/api/0.6/changeset/' + id,
        token_secret = token('secret'),
        change = newChangesetXml();

    console.log(osmly.changesetTags);
    console.log(change);

    notify('updating changeset');

    o.oauth_timestamp = ohauth.timestamp();
    o.oauth_nonce = ohauth.nonce();
    o.oauth_token = token('token');

    o.oauth_signature = ohauth.signature(osmly.oauth_secret, token_secret,
        ohauth.baseString('PUT', url, o));

    ohauth.xhr('PUT', url, o, change, {header: {'Content-Type': 'text/xml'}},
        function(xhr) {
            // don't care about the response
            if (callback) callback();
        });
}

function changesetIsOpen(id, callback) {
    if (!id) createChangeset(callback);

    notify('checking changeset status');

    $.ajax({
        type: 'GET',
        url: osmly.writeApi + '/api/0.6/changeset/' + id,
        cache: false
    }).success(function(xml) {
        // need a failure case, dev server fails pretty often
        var cs = xml.getElementsByTagName('changeset');

        if (cs[0].getAttribute('open') === 'true') {
            callback();
        } else {
            createChangeset(callback);
        }
    });
}

function setup() {
    populateTags();

    $('#skip, #submit').click(function() {
        console.log(toGeoJson(osmly.current.layer));
        submit(this.id);
    });

    $('#problem').change(function() {
        submit($('#problem').val());
    });

    $('.k, .v').keypress(function() {
        equalizeTags();
    });

    $('.minus').click(function() {
        if ($('#tags li').length > 1) {
            $(this).parent().remove();
            equalizeTags();
        }
    });

    $('#add-new-tag').click(function() {
        // what a freakin mess, what have I done
        $('#tags ul').append(
            '<li>' +
            '<span class="k" spellcheck="false" contenteditable="true"></span>' +
            '<span class="v" spellcheck="false" contenteditable="true"></span>' +
            '<span class="minus">-</span>' +
            '</li>');

        equalizeTags();

        $('.k, .v').keypress(function() {
            equalizeTags();
        });

        $('.minus').click(function() {
            if ($('#tags li').length > 1) {
                $(this).parent().remove();
                equalizeTags();
            }
        });

    });

    console.log(window);
    display();
}

function display() {
    osmly.current.layer.addTo(map);
    osmly.current.dataLayer.addTo(map);

    $('#notify, #login').fadeOut(250);
    $('#top-right, #bottom-right, #action-block, #tags').fadeIn(500);

    equalizeTags();
}

function renameProperties() {
    // converts the feature tag key
    // ex. NAME -> name
    // ex. CAT2 -> leisure
    for (var prop in osmly.renameProperty) {
        var change = osmly.renameProperty[prop];
        osmly.current.feature.properties[change] = osmly.current.feature.properties[prop];
    }
}

function usePropertiesAsTag() {
    // only keeps specified properties to be used as tags
    for (var prop in osmly.current.feature.properties) {
        if (osmly.usePropertyAsTag.indexOf(prop) === -1) {
            osmly.current.feature.properties[prop] = null;
        }
    }
}

function appendTags() {
    for (var append in osmly.appendTag) {
        osmly.current.feature.properties[append] = osmly.appendTag[append];
    }
}

function populateTags() {
    renameProperties();
    usePropertiesAsTag();
    appendTags();

    osmly.current.feature.properties = sortObject(osmly.current.feature.properties);

    for (var tag in osmly.current.feature.properties) {
        if (osmly.current.feature.properties[tag] !== 'null' && osmly.current.feature.properties[tag] !== null) {
            $('#tags ul').append(
                '<li>' +
                '<span class="k" spellcheck="false" contenteditable="true">' +
                tag + '</span>' +
                '<span class="v" spellcheck="false" contenteditable="true">' +
                osmly.current.feature.properties[tag] + '</span>' +
                '<span class="minus">-</span>' +
                '</li>');
        }
    }
}

// doesn't work until the selectors are visibile?
function equalizeTags() {
    // janky & inefficient, need to look into how the plugin works
    $('ul').equalize({
        children: '.k',
        equalize: 'width',
        reset: true});
    $('.k').width($('.k').width()+10);

    $('ul').equalize({
        children: '.v',
        equalize: 'width',
        reset: true});
    $('.v').width($('.v').width()+10);
}

// http://stackoverflow.com/a/1359808
function sortObject(o) {
    var sorted = {},
    key, a = [];

    for (key in o) {
        if (o.hasOwnProperty(key)) {
            a.push(key);
        }
    }

    a.sort();

    for (key = 0; key < a.length; key++) {
        sorted[a[key]] = o[a[key]];
    }
    return sorted;
}

// next 3 functions from a Leaflet issue: https://github.com/Leaflet/Leaflet/issues/712
function toGeoJson(target) {
    // will want to convert layer groups in the future
    if (target instanceof L.Polygon) {
        //Polygon
        var coords = latLngsToCoords(target.getLatLngs());
        return {
            coordinates: [coords],
            type: 'Polygon'
        };
    } else if (target instanceof L.FeatureGroup) {
        //Multi point and GeometryCollection
        var multi = [];
        var layers = target._layers;
        var points = true;

        for (var stamp in layers) {
            var json = toGeoJson(layers[stamp]);
            multi.push(json);
            if (json.type !== 'Point') {
                points = false;
            }
        }

        if (points) {
            var coords = multi.map(function(geo) {
                return geo.coordinates;
            });

            return {
                coordinates: coords,
                type: 'MultiPoint'
            };
        } else {
            return {
                geometries: multi,
                type: 'GeometryCollection'
            };
        }
    }
}

function latLngToCoords(latlng) {
    var lng = Math.round(latlng.lng*1000000)/1000000;
    var lat = Math.round(latlng.lat*1000000)/1000000;
    return [lng, lat];
}

function latLngsToCoords(arrLatlng) {
    var coords = [];
    arrLatlng.forEach(function(latlng) {
        coords.push(latLngToCoords(latlng));
    },
    this);
    return coords;
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

// geojson object, tags [[k,v],[k,v],[k,v]]
// returns xml string
function toOsmChange(geojson, tags) {
    // this is all up in the air and very limited to this specific toGeoJSON output
    // need to figure out holes in polygons/multipolygons
    // actual leaflet toGeoJSON is coming?
        // https://github.com/Leaflet/Leaflet/pull/1462
    var osmChange = '<osmChange version="0.6" generator="osmly"><create>',
        nodes = '',
        ways = '',
        relations = '',
        count = -1;

    if (geojson.geometries[0].geometries && geojson.geometries[0].geometries.length > 1) {
        // relations aren't ment to be comprehensive, just passable to be editted in JOSM
        var a = geojson.geometries[0].geometries.length,
            wayz = [],
            coords = [];

        relations += '<relation id="' + count + '" changeset="' + token('changeset_id') + '">';
        count--;

        while (a--) {
            relations += '<member type="way" ref="' + count + '" role="outer" />';
            wayz.push(count);
            coords.push(geojson.geometries[0].geometries[a].coordinates[0]);
            count--;
        }

        for (var tag in tags) {
            relations += '<tag k="' + tags[tag][0] + '" v="' + tags[tag][1] + '"/>';
        }

        relations += '<tag k="type" v="multipolygon" />';
        relations += '</relation>';
    }

    if (relations === '') {
        // var j = geojson.geometries[i].coordinates[0].length;
        var coords = [geojson.geometries[0].coordinates[0]];
    }

    var b = coords.length;
    while (b--) {
        var c = coords[b].length,
            nds = [];

        while (c--) {
            var lon = coords[b][c][0],
                lat = coords[b][c][1];

            nodes += '<node id="' + count + '" lat="' + lat + '" lon="' + lon +
            '" changeset="' + token('changeset_id') + '"/>';
                // might need version="0"
            nds.push(count);
            count--;
        }

        if (relations === '') {
            ways += '<way id="' + count + '" changeset="' + token('changeset_id') + '">';
        } else {
            ways += '<way id="' + wayz[b] + '" changeset="' + token('changeset_id') + '">';
            // the order on this isn't significant because they all use the same tags in the end
        }

        // wrap around node for polygons, check geojson feature type in the future
        nds.push(nds[0]);

        var d = nds.length;
        while (d--) {
            ways += '<nd ref="' + nds[d] + '"/>';
        }

        if (relations === '') {
            for (var tag in tags) {
                ways += '<tag k="' + tags[tag][0] + '" v="' + tags[tag][1] + '"/>';
            }
        }

        ways += '</way>';
        count--;
    }

    osmChange += nodes + ways +  relations;
    osmChange += '</create></osmChange>';

    return osmChange;
}

// this really sucks
function submit(result) {
    teardown();

    if (osmly.demo) {
        console.log(osmly.current);

        if (result === 'submit') {
            var geojson = toGeoJson(osmly.current.layer);
            console.log(toOsmChange(geojson, getTags()));
        }

        if (result != 'skip') {
            $.ajax({
                type: 'POST',
                url: osmly.featuresApi + 'db=' + osmly.db,
                crossDomain: true,
                data: {db: osmly.db, id: osmly.current.id, problem: result, user: user.name}
            }).done(function(msg) {
                // not worth slowing down/complicating over, it's reproducable
            });
        }

        next();
    } else {
        if (result != 'skip') {
            $.ajax({
                type: 'POST',
                url: osmly.featuresApi + 'db=' + osmly.db,
                crossDomain: true,
                data: {db: osmly.db, id: osmly.current.id, problem: result, user: user.name}
            }).done(function(msg) {
                // not worth slowing down/complicating over, it's reproducable
            });
        }

        if (result === 'submit') {
            changesetIsOpen(token('changeset_id'), submitToOSM);
        } else {
            next();
        }
    }

    if (result !== 'skip' && result !== 'submit') result = 'problem';

    $('#d-' + result)
        .show()
        .fadeOut(750);
}

function submitToOSM() {
    var id = token('changeset_id');

    $('#changeset').fadeIn(500);

    $('#changeset-link')
        .html('<a href="' + osmly.writeApi + '/browse/changeset/' +
            id + '" target="_blank">Details on osm.org »</a>');

    var url = osmly.writeApi + '/api/0.6/changeset/' + id + '/upload',
        token_secret = token('secret'),
        geojson = toGeoJson(osmly.current.layer),
        osmChange = toOsmChange(geojson, getTags());

    notify('uploading to OSM');

    o.oauth_timestamp = ohauth.timestamp();
    o.oauth_nonce = ohauth.nonce();
    o.oauth_token = token('token');

    o.oauth_signature = ohauth.signature(osmly.oauth_secret, token_secret,
        ohauth.baseString('POST', url, o));

    ohauth.xhr('POST', url, o, osmChange, {header: {'Content-Type': 'text/xml'}},
        function(xhr) {
            next();
        });
}

function teardown() {
    $('#problem, #skip, #submit, .minus, #add-new-tag').unbind();
    $('.k, .v').unbind();
    $('#action-block, #tags, #bottom-right').hide();
    map.closePopup();
    $('#problem').val('problem'); // resets problem menu
    map.removeLayer(osmly.current.layer);
    map.removeLayer(osmly.current.dataLayer);
}

function getSetOSM() {
    notify('getting context');

    var bbox = osmly.current.feature.properties.buffer_bounds;
    bbox = 'bbox=' + bbox.join(',');

    $.ajax({
        type: 'GET',
        url: osmly.readApi + bbox
    }).success(function(xml) {
        notify('building context');

        // seperate lists so the user can switch between them
        osmly.osmContext = osm2geo(xml);
        osmly.simpleContext = filterContext(osmly.osmContext);

        console.log(JSON.stringify(osmly.osmContext));
        console.log(JSON.stringify(osmly.simpleContext));

        osmly.current.dataLayer = L.geoJson(osmly.simpleContext, {
            style: {
                'color': '#FFFF00',
                'weight': 3,
                'opacity': 0.75
            },
            onEachFeature: function(feature, layer) {
                // hovering displays the name
                // clicking displays all tags
                var popup = '',
                    label = null,
                    t = 0,
                    tagKeys = Object.keys(feature.properties);

                if (feature.properties) {
                    if (!feature.properties.name) {
                        label = '[NO NAME] click for tags';
                    } else {
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
                    opacity: 0.75,
                    fillOpacity: 0.5
                });
            }
        });

        setup();
    });
}

function filterContext(osmGeoJson) {
    var features = osmGeoJson.features,
        geo = {
            'type' : 'FeatureCollection',
            'features' : []},
        i = features.length;

    while (i--) {
        var feature = features[i],
            match = false;
        
        for (var key in feature.properties) {
            if (key in osmly.context &&
                osmly.context[key].indexOf(feature.properties[key]) > -1 &&
                !match) {

                match = true;
            }
        }

        if (match || !Object.keys(osmly.context).length) {
            geo.features.push(feature);
        }
    }

    return geo;
}

function notify(string) {
    if (string !== '') string = '<span>' + string + '</span>';
    string = '<img src="static/images/loader.gif" />' + string;

    $('#notify')
        .html(string)
        .show();

    // don't forget to hide #notify later
    // $('#notify').fadeOut(250);
}

return osmly;
};