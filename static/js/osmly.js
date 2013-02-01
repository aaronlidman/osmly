window.osmly = function () {
/*
- Leaflet: leafletjs.com
- Bing plugin: github.com/shramov/leaflet-plugins/blob/master/layer/tile/Bing.js
- jQuery: jquery.com
- equalize.js plugin: github.com/tsvensen/equalize.js
- ohauth: github.com/tmcw/ohauth
- osm2geo: gist.github.com/1396990

TODO
    - cleanup html, better/unique selectors
    - log stuff, localstorage?
        - [new Date.getTime(), 'stuff happened'];
        - simple log function
    - redo osm2geo loops
    - include #tags in #action-block
    - consistent camelCase, noob
    - success + failure callbacks on every request
*/

var osmly = {
        url: 'http://api06.dev.openstreetmap.org',
        oauth_secret: 'Mon0UoBHaO3qvfgwWrMkf4QAPM0O4lITd3JRK4ff',
        readApi: 'http://www.overpass-api.de/api/xapi?map?',
        context: {}, // {key: ['some', 'tags'], otherkey: ['more', 'tags']}
        div: 'map',
        db: '', // string, no space, comma seperated; corresponds to 'database'.sqlite
        columns: '',
        center: [0,0],
        zoom: 2,
        demo: false,
        changesetAppend: [ // include specifics to the import
            ['created_by', 'osmly 0.1'],
            ['imagery_used', 'Bing']
        ]
    },
    user = {
        id: -1,
        name: 'demo',
        avatar: ''
    },
    changeset = {
        id: -1,
        expires: 0,
        comment: ''
    },
    current = {},
    log = [],
    o = {
        oauth_consumer_key: 'yx996mtweTxLsaxWNc96R7vpfZHKQdoI9hzJRFwg',
        oauth_signature_method: 'HMAC-SHA1'};

osmly.set = function (object) {
    if (typeof(object) === 'object') {
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
        center: osmly.center,
        layers: [new L.BingLayer('Anqm0F_JjIZvT0P3abS6KONpaBaKuTnITRrnYuiJCE0WOhH6ZbE4DzeT6brvKVR5')],
        zoom: osmly.zoom,
        maxZoom: 20
    });

    osmly.map = map;

    if (token('token') && token('secret')) {
        getUserDetails();
        next();
    } else {
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

    $('#instruct').click(function() {
        $('#modal, #instruction').fadeIn(200);
    });

    $('#instruction').click(function() {
        $('#instruction, #modal').fadeOut(200);
    });
};

function request_oauth() {
    var url = osmly.url + '/oauth/request_token';

    // https://github.com/systemed/iD/blob/master/js/id/oauth.js#L72
    // 642 is the smallest width before mobile layout + small text kicks in
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
        var token = ohauth.stringQs(xhr.response);
        token('ohauth_token_secret', token.oauth_token_secret);

        popup.location = osmly.url + '/oauth/authorize?' + ohauth.qsString({
            oauth_token: token.oauth_token,
            oauth_callback: location.href
        });

    });
}

// https://github.com/systemed/iD/blob/master/js/id/oauth.js#L107
function access_oauth(oauth_token) {
    var url = osmly.url + '/oauth/access_token',
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
        next();
    });
}

function getUserDetails() {
    var url = osmly.url + '/api/0.6/user/details',
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
            if (img && img[0].getAttribute('href')) {
                user.avatar = img[0].getAttribute('href');
            }
            user.username = u.getAttribute('display_name');
            user.id = u.getAttribute('id');
        });
}

function createChangeset() {
    var url = osmly.url + '/api/0.6/changeset/create',
        token_secret = token('secret'),
        tags = '';

    for (c = 0; c < osmly.changesetAppend.length; c++) {
        tags +=
            '<tag k="' + osmly.changesetAppend[c][0] +
            '" v="' + osmly.changesetAppend[c][1] + '"/>';
    }

    var change = '<osm>' +
            '<changeset>' + tags +
            '<\/changeset>' +
        '<\/osm>';

    o.oauth_timestamp = ohauth.timestamp();
    o.oauth_nonce = ohauth.nonce();
    o.oauth_token = token('token');

    o.oauth_signature = ohauth.signature(osmly.oauth_secret, token_secret,
        ohauth.baseString('PUT', url, o));

    ohauth.xhr('PUT', url, o, change, {header: {'Content-Type': 'text/xml'}},
        function(xhr) {
            changeset.id = xhr.response;
            changeset.expires = new Date().getTime() + (3600*1000);
            console.log(changeset);
        });
}

function next() {
    notify('getting next', true);
    $('#tags li').remove();

    var request = '/?next' + '&db=' + osmly.db + '&columns=' + osmly.columns;
    request += '&time=' + new Date().getTime();

    $.ajax({
        type: 'GET',
        url: request
    }).success(function(data) {
        current = jQuery.parseJSON(data);
        if (osmly.demo) console.log(current);

        current.layer = L.geoJson(current.geo, {
            style: {
                'color': '#00FF00',
                'weight': 3,
                'opacity': 1
            },
            onEachFeature: function (feature, layer){
                if (current.geo.type === 'MultiPolygon') {
                    for (var ayer in layer._layers) {
                        layer._layers[ayer].editing.enable();
                    }
                } else {
                    layer.editing.enable();
                }
            }
        });

        map.fitBounds(current.layer.getBounds());

        getOSM();
    });
}

function setup() {
    populate_tags();

    $('#skip, #submit').click(function(){
        submit(this.id);
    });

    $('#problem').change(function(){
        submit($('#problem').val());
    });

    $('.k').keypress(function(){
        $('ul').equalize({
            children: '.k',
            equalize: 'width',
            reset: true
        });
        $('.k').width($('.k').width()+15);
    });

    display();
}

function display() {
    current.layer.addTo(map);
    current.dataLayer.addTo(map);

    $('#notify, #login').fadeOut(250);
    $('#top_right, #action-block, #tags').fadeIn(500);

    // equalize doesn't seem to work until the selector is visible
    $('ul').equalize({
            children: '.k',
            equalize: 'width',
            reset: true});
    $('.k').width($('.k').width()+15);
}

function populate_tags() {
    current.tags = sortObject(current.tags);

    for (var tag in current.tags) {
        if (current.tags[tag] !== 'null' && current.tags[tag] !== null) {
            $('#tags ul').append(
            '<li>' +
            '<span class="k" spellcheck="false" contenteditable="true">' +
            tag + '</span>' +
            '<span class="v" spellcheck="false" contenteditable="true">' +
            current.tags[tag] + '</span>' +
            '</li>');
        }
    }
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
            var coords = multi.map(function(geo){
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

    $tags.each(function(i,ele){
        var k = $(ele).children('.k').text();
        var v = $(ele).children('.v').text();
        tags.push([k,v]);
    });

    return tags;
}

// geojson object, tags [[k,v],[k,v], [k,v]], changeset int
// returns xml string
function toOsmChange(geojson, tags, changeset) {
    // if geometries > 1 the same tags are added to each way
    // relations? anything with more than one geometry to append w/ all ways in it
    var osmChange = '<osmChange version="0.6" generator="osmly"><create>',
        nodes = '',
        ways = '',
        count = -1;
        // relations soon

    for (var i = 0, g = geojson.geometries.length; i < g; i++) {
        var nds = [];

        for (var j = 0, c = geojson.geometries[i].coordinates[0].length; j < c; j++) {
            var lon = geojson.geometries[i].coordinates[0][j][0],
                lat = geojson.geometries[i].coordinates[0][j][1];
            nodes += '<node id="' + count + '" lat="' + lat + '" lon="' + lon + '" changeset="' + changeset + '"/>';
                // might need version="0"
            nds.push(count);
            count--;
        }
        // wrap around node for polygons
        nds.push(nds[0]);

        ways += '<way id="' + count + '" changeset="' + changeset + '">';
        for (var k = 0, w = nds.length; k < w; k++) {
            ways += '<nd ref="' + nds[k] + '"/>';
        }

        for (var tag in tags) {
            ways += '<tag k="' + tags[tag][0] + '" v="' + tags[tag][1] + '"/>';
        }

        ways += '</way>';
        count--;
    }

    osmChange += nodes + ways;
    osmChange += '</create></osmChange>';

    return osmChange;
}

function submit(result) {
    teardown();

    if (osmly.demo) {
        if (result != 'skip' && result != 'submit') result = 'problem';
        if (result === 'submit') {
            console.log(toGeoJson(current.layer));
            console.log(toOsmChange(toGeoJson(current.layer), getTags(), 5329));
        }
        next();
    } else {
        // submission to osmly.com to mark it as done
        $.ajax({
            type: 'POST',
            url: '/',
            data: {id: current.id, action: result}
        }).done(function(msg) {
            // not worth slowing down/complicating over, it's reproducable
        });

        if (result == 'submit') {
            // get tags, build osmChange
            var data = toGeoJson(current.layer);
            submitToOSM(data, next);
            // next();
        } else {
            if (result != 'skip') result = 'problem';
            next();
        }
    }

    $('#d-' + result)
        .show()
        .fadeOut(500);
}

function submitToOSM(osmChange, callback) {
    if (changeset.id === -1 || new Date().getTime()+20000 > changeset.expires) {
        createChangeset();
    }
}

function teardown() {
    $('#problem, #skip, #submit').unbind();
    $('#action-block, #tags').hide();
    map.closePopup();
    $('#problem').val('problem'); // resets problem menu
    map.removeLayer(current.layer);
    map.removeLayer(current.dataLayer);
}

function getOSM() {
    notify('getting context', true);

    $.ajax({
        type: 'GET',
        url: osmly.readApi + current.bbox
    }).success(function(xml) {
        notify('building context', true);

        // seperate lists so the user can switch between them
        osmly.osmContext = osm2geo(xml);
        osmly.simpleContext = simplifyContext(osmly.osmContext);

        // console.log(osmly.osmContext);
        // console.log(osmly.simpleContext);

        current.dataLayer = L.geoJson(osmly.simpleContext, {
            style: {
                'color': '#FFFF00',
                'weight': 2,
                'opacity': 1
            },
            onEachFeature: function(feature, layer) {
                var popupContent = null;
                if (feature.properties && feature.properties.name) {
                    popupContent = feature.properties.name;
                } else if (feature.properties.name == null) {
                        popupContent = '[NO NAME]';
                }
                layer.bindPopup(popupContent);
            },
            pointToLayer: function(feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 5,
                    opacity: 1,
                    fillOpacity: 0.5
                });
            }
        });

        setup();
    });
}

function simplifyContext(osmGeoJson) {
    var features = osmGeoJson.features;
    var geo = {
            'type' : 'FeatureCollection',
            'features' : []
        };

    for (var i = 0, f = features.length; i < f; i++) {
        var feature = features[i];
        
        for (var key in feature.properties) {
            if (key in osmly.context &&
                osmly.context[key].indexOf(feature.properties[key]) > -1) {
                    geo.features.push(feature);
            }
        }
    }

    return geo;
}

function notify(string, spinner) {
    // string = '', just a spinner
    if (string !== '') string = '<span>' + string + '</span>'; spinner = true;
    if (spinner) string = '<img src="/static/images/loader.gif" />' + string;

    $('#notify')
        .html(string)
        .show();

    // don't forget to hide #notify later
    // $('#notify').fadeOut(250);
}

// next 2 functions from iD: https://github.com/systemed/iD/blob/master/js/id/oauth.js
function keyclean(x) { return x.replace(/\W/g, ''); }

function token(k, x) {
    if (arguments.length == 2) {
        localStorage[keyclean(osmly.url) + k] = x;
    }
    return localStorage[keyclean(osmly.url) + k];
}

return osmly;
};