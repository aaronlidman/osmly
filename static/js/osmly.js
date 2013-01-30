window.osmly = function () {
/*
- Leaflet: leafletjs.com
- Bing plugin: github.com/shramov/leaflet-plugins/blob/master/layer/tile/Bing.js
- jQuery: jquery.com
- equalize.js plugin: github.com/tsvensen/equalize.js
- ohauth: github.com/tmcw/ohauth
- osm2geo: gist.github.com/1396990

TODO
    - namespace cookies
    - cleanup html, better/unique selectors
    - overzooming, https://github.com/systemed/iD/commit/5254f06522ac42c47cdd7f50858b62e7ffb9f236
    - possibly move all SS transport within GeoJSON properties
        - make tags work w/ those properties
    - cleaner commenting
    - log stuff, localstorage?
        - [new Date.getTime(), 'stuff happened'];
        - simple log function
    - redo osm2geo loops
    - include #tags in #action-block
    - consistent camelCase, noob
    - success + failure callbacks on every request
*/

var osmly = {
        host: 'http://api06.dev.openstreetmap.org',
        oauth_secret: 'Mon0UoBHaO3qvfgwWrMkf4QAPM0O4lITd3JRK4ff',
        readApi: 'http://www.overpass-api.de/api/xapi?map?',
        contextualize: [], // 'key=value'
        div: 'map',
        db: '', // string, no space, comma seperated; corresponds to 'database'.sqlite
        columns: '',
        center: [0,0],
        zoom: 2,
        demo: false
    },
    user = {
        userId: -1,
        userName: 'demo'
    },
    current = {},
    log = [];
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

    if (cookie('token') && cookie('secret')) {
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
    var url = osmly.host + '/oauth/request_token';

    // https://github.com/systemed/iD/blob/master/js/id/oauth.js#L72
    // 642 is the smallest width before mobile layout + small text kicks in
    var w = 642, h = 450,
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
        cookie('ohauth_token_secret', token.oauth_token_secret);

        popup.location = osmly.host + '/oauth/authorize?' + ohauth.qsString({
            oauth_token: token.oauth_token,
            oauth_callback: location.href
        });

    });
}

// https://github.com/systemed/iD/blob/master/js/id/oauth.js#L107
function access_oauth(oauth_token) {
    var url = osmly.host + '/oauth/access_token',
        token_secret = cookie('ohauth_token_secret');

    o.oauth_timestamp = ohauth.timestamp();
    o.oauth_nonce = ohauth.nonce();
    o.oauth_token = oauth_token.oauth_token;

    if (!token_secret) return console.error('Required token not found');

    o.oauth_signature = ohauth.signature(osmly.oauth_secret, token_secret,
        ohauth.baseString('POST', url, o));

    ohauth.xhr('POST', url, o, null, {}, function(xhr) {
        var access_token = ohauth.stringQs(xhr.response);
        cookie('token', access_token.oauth_token);
        cookie('secret', access_token.oauth_token_secret);
        o.oauth_timestamp = ohauth.timestamp();
        o.oauth_nonce = ohauth.nonce();
        o.oauth_token = access_token.oauth_token;
        token_secret = access_token.oauth_token_secret;
                
        next();
    });
}

// function createChangeset() {
//     // changeset stuff
//     var url = osmly.host + '/api/0.6/changeset/create',
//         token_secret = cookie('secret');
//     o.oauth_signature = ohauth.signature(osmly.oauth_secret, token_secret,
//         ohauth.baseString('PUT', url, o));

//     ohauth.xhr('PUT', url, o, change, { header: { 'Content-Type': 'text/xml' } },
//         function(xhr) {
//             console.log('Changeset: ' + xhr.response);
//         });
// }

function cookie(k, v) {
    if (arguments.length === 2) {
        // via: http://stackoverflow.com/a/3795002
        var expire = new Date();
        var msecs = expire.getTime();
        msecs += 31557600000; // a year
        expire.setTime(msecs);

        document.cookie =
            k.toString() + '=' + v.toString() +
            ';expires=' + expire.toGMTString() +
            ';path=/';
    }
    var regex = new RegExp(k.toString() + '=([^;]+)');
    var check = document.cookie.match(regex);

    if (check) return check[1];
    return check;
}

function next() {
    notify('getting next', true);

    var request = '/?next' + '&db=' + osmly.db + '&columns=' + osmly.columns;
    request += '&time=' + new Date().getTime();
    if (osmly.demo) console.log(request);

    $.ajax({
        type: 'GET',
        url: request
    }).success(function(data) {
        current = jQuery.parseJSON(data);
        if (osmly.demo) console.log(current);
        console.log(current);

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

function submit(result) {
    // need to save geojson before next next()
    teardown();

    if (osmly.demo) {
        if (result != 'skip' && result != 'submit') result = 'problem';
        next();
    } else {
        $.ajax({
            type: 'POST',
            url: '/',
            data: {id: current.id, action: result}
        }).done(function(msg) {
            // not worth slowing down/complicating over, it's reproducable
        });

        if (result == 'submit') {
            // data['edit']['geo']['coordinates'] = littleboots.toGeoJSON(polygon)['geometries'][0]['coordinates'];
            // teardown() before might cause a problem here, move it to after
            // upload to osm.org
            // then do fadeOut and next()
            // wait for the .done
            next();
        } else {
            if (result != 'skip') result = 'problem';
            next();
        }
    }

    $('#d-' + result)
        .show()
        .fadeOut(500);
}

function teardown() {
    $('#problem, #skip, #submit').unbind();
    $('#action-block, #tags').hide();
    map.closePopup();
    $('#problem').val('problem'); // resets problem menu
    map.removeLayer(current.layer);
    map.removeLayer(current.dataLayer);
    $('#tags li').remove();
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

        console.log(osmly.osmContext);
        console.log(osmly.simpleContext);

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
                } else if (
                    feature.properties.name === null &&
                    feature.properties.name === 'null') {
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
            if (key in osmly.contextualize &&
                osmly.contextualize[key].indexOf(feature.properties[key]) > -1) {
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

return osmly;
};