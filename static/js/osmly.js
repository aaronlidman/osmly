window.osmly = function () {
/*
TODO
    - success + failure callbacks on every request
        - replace .success, .error, .complete w/ .done, .fail, .always
    - common ohauth.xhr function
    - group oauth functions like iD
        - https://github.com/systemed/iD/blob/master/js/id/oauth.js#L53
        - same idea can be applied to changesets, submitting?
    - crossbrowser test ui
        - especially modal and tag stuff
    - check if done, again, before submitting to osm
    - confirm toOsm multipolygons are valid in josm
        - they're not
    - bind link in validFeature(), unbind on click
    - getSetOsm(), setup(), and display() interaction is a mess
    - instructions modal limits min-height
    - rethink loading
        - zoom to, load feature while osm is downloading
        - when osm is done bring in UI and editing points
        - allows for a few seconds of planning
    - bigger action buttons
    - get for loops figured out, consistency, noob
        - for vs for-in
    - handle tags better
        - make then self contained with geojson properties
        - available to edit tags for multiple items
*/

osmly.settings = {
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
    consumerKey: 'yx996mtweTxLsaxWNc96R7vpfZHKQdoI9hzJRFwg',
    featureStyle: {
        // http://leafletjs.com/reference.html#path-options
        color: '#00FF00',
        weight: 3,
        opacity: 1,
        clickable: false
    },
    contextStyle: {
        color: '#FFFF00',
        fillOpacity: 0.3,
        weight: 3,
        opacity: 1
    }
};

var settings = osmly.settings,
    user = {
        id: -1,
        name: 'demo'
    },
    current = {},
    o = {
        oauth_consumer_key: settings.consumerKey,
        oauth_signature_method: 'HMAC-SHA1'
    };

osmly.go = function(object) {
    if (typeof object === 'object') {
        for (var obj in object) {
            osmly.settings[obj] = object[obj];
        }
    }

    osmly.map = osmly.map();
    osmly.ui = osmly.ui();
    osmly.user = osmly.user();
    osmly.item = osmly.item();
};

// next 2 functions from iD: https://github.com/systemed/iD/blob/master/js/id/oauth.js
function keyclean(x) { return x.replace(/\W/g, ''); }

function token(k, x) {
    if (arguments.length === 2) {
        localStorage[keyclean(settings.writeApi) + k] = x;
    }
    return localStorage[keyclean(settings.writeApi) + k];
}

function request_oauth() {
    var url = osmly.settings.writeApi + '/oauth/request_token';

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
    o.oauth_signature = ohauth.signature(osmly.settings.oauth_secret, '',
        ohauth.baseString('POST', url, o));

    ohauth.xhr('POST', url, o, null, {}, function(xhr) {
        var string = ohauth.stringQs(xhr.response);
        token('ohauth_token_secret', string.oauth_token_secret);

        popup.location = osmly.settings.writeApi + '/oauth/authorize?' + ohauth.qsString({
            oauth_token: string.oauth_token,
            oauth_callback: location.href
        });

    });
}

// https://github.com/systemed/iD/blob/master/js/id/oauth.js#L107
function access_oauth(oauth_token) {
    var url = settings.writeApi + '/oauth/access_token',
        token_secret = token('ohauth_token_secret');

    o.oauth_timestamp = ohauth.timestamp();
    o.oauth_nonce = ohauth.nonce();
    o.oauth_token = oauth_token.oauth_token;

    if (!token_secret) return console.error('Required token not found');

    o.oauth_signature = ohauth.signature(settings.oauth_secret, token_secret,
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
    var url = settings.writeApi + '/api/0.6/user/details',
        token_secret = token('secret');

    o.oauth_timestamp = ohauth.timestamp();
    o.oauth_nonce = ohauth.nonce();
    o.oauth_token = token('token');

    o.oauth_signature = ohauth.signature(settings.oauth_secret, token_secret,
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
        .html('<a href="' + settings.writeApi + '/user/' +
            token('userName') + '" target="_blank">' + token('userName') + '</a>')
        .fadeIn(500);
}

function setFeatureLayer() {
    osmly.current.layer = L.geoJson(osmly.current.feature, {
        style: settings.featureStyle,
        onEachFeature: function (feature, layer) {
            if (osmly.current.isEditable) {
                if (osmly.current.feature.geometry.type == 'MultiPolygon') {
                    for (var ayer in layer._layers) {
                        layer._layers[ayer].editing.enable();
                    }
                } else {
                    layer.editing.enable();
                }

            }

        }
    });

    map.fitBounds(osmly.current.layer.getBounds());
}

function newChangesetXml() {
    var c = settings.changesetTags.length,
        tags = '';

    console.log(settings.changesetTags);

    while (c--) {
        tags +=
            '<tag k="' + settings.changesetTags[c][0] +
            '" v="' + settings.changesetTags[c][1] + '"/>';
    }

    return '<osm><changeset>' + tags + '<\/changeset><\/osm>';
}

function createChangeset(callback) {
    var url = settings.writeApi + '/api/0.6/changeset/create',
        token_secret = token('secret'),
        change = newChangesetXml();

    notify('creating a new changeset');

    o.oauth_timestamp = ohauth.timestamp();
    o.oauth_nonce = ohauth.nonce();
    o.oauth_token = token('token');

    o.oauth_signature = ohauth.signature(settings.oauth_secret, token_secret,
        ohauth.baseString('PUT', url, o));

    ohauth.xhr('PUT', url, o, change, {header: {'Content-Type': 'text/xml'}},
        function(xhr) {
            var id = xhr.response + '';

            token('changeset_id', id);

            callback();
        });
}

function updateChangeset(id, callback) {
    var url = settings.writeApi + '/api/0.6/changeset/' + id,
        token_secret = token('secret'),
        change = newChangesetXml();

    console.log(settings.changesetTags);
    console.log(change);

    notify('updating changeset');

    o.oauth_timestamp = ohauth.timestamp();
    o.oauth_nonce = ohauth.nonce();
    o.oauth_token = token('token');

    o.oauth_signature = ohauth.signature(settings.oauth_secret, token_secret,
        ohauth.baseString('PUT', url, o));

    ohauth.xhr('PUT', url, o, change, {header: {'Content-Type': 'text/xml'}},
        function() {
            // don't care about the response
            if (callback) callback();
        });
}

function changesetIsOpen(id, callback) {
    if (!id) createChangeset(callback);

    notify('checking changeset status');

    $.ajax({
        url: settings.writeApi + '/api/0.6/changeset/' + id,
        cache: false
    }).done(function(xml) {
        // need a failure case, dev server fails pretty often
        var cs = xml.getElementsByTagName('changeset');

        if (cs[0].getAttribute('open') === 'true') {
            callback();
        } else {
            createChangeset(callback);
        }
    });
}

function setup(reset) {
    if (!reset) {
        renameProperties();
        usePropertiesAsTag();
        appendTags();
    }

    populateTags();

    $('#skip, #submit').click(function() {
        submit(event.target.id);
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

    $('#reset').click(function() {
        teardown();
        $('#tags li').remove();
        setFeatureLayer();
        setup('reset');
        display();
    });
}

function display() {
    osmly.current.layer.addTo(map);

    if (osmly.current.dataLayer) {
        osmly.current.dataLayer.addTo(map);
        osmly.current.dataLayer.bringToFront();
    }

    $('#notify, #login').fadeOut(250);
    $('#top-right, #bottom-right, #action-block').fadeIn(250);

    if (osmly.current.isEditable) {
        $('#tags').fadeIn(250);
        equalizeTags();

    } else {
        $('#problem, #submit').hide();
        $('#reusable-modal span').html(
            'This feature is too complex. <a>Edit it in JOSM?</a>');
        // put an 'Edit in JOSM' button right there, when clicked close the modal and let the other modal open
        // literally bind, $('#josm').click()
            $('#reusable-modal').reveal({
                 animation: 'fade',
                 animationspeed: 200,
                 closeonbackgroundclick: true,
                 dismissmodalclass: 'close-reveal-modal'
            });
    }
}

function renameProperties() {
    // converts the feature key, for osm tags
    // ex. NAME -> name, CAT2 -> leisure
    for (var prop in settings.renameProperty) {
        var change = settings.renameProperty[prop];
        osmly.current.feature.properties[change] = osmly.current.feature.properties[prop];
    }
}

function usePropertiesAsTag() {
    // filters properties to be used as tags
    for (var prop in osmly.current.feature.properties) {
        if (settings.usePropertyAsTag.indexOf(prop) === -1) {
            osmly.current.feature.properties[prop] = null;
        }
    }
}

function appendTags() {
    for (var append in settings.appendTag) {
        osmly.current.feature.properties[append] = settings.appendTag[append];
    }
}

function populateTags() {
    for (var tag in osmly.current.feature.properties) {
        if (osmly.current.feature.properties[tag] !== 'null' &&
            osmly.current.feature.properties[tag] !== null) {
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
    $('.k').width( $('.k').width() + 12);

    $('ul').equalize({
        children: '.v',
        equalize: 'width',
        reset: true});
    $('.v').width( $('.v').width() + 12);
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

function toOsm(geojson) {
    return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<osm version="0.6" generator="osmly">' + innerOsm(geojson) + '</osm>';
}

function toOsmChange(geojson) {
    return '<osmChange version="0.6" generator="osmly"><create>' +
        innerOsm(geojson) + '</create></osmChange>';
}

// geojson object, tags [[k,v],[k,v],[k,v]]
function innerOsm(geojson) {
    // currently not equipped for tags on individual features, just tags everything with var tags
    var nodes = '',
        ways = '',
        relations = '',
        count = -1;
        tags = getTags(),
        changeset = 0;

    if (token('changeset_id')) changeset = token('changeset_id');

    for (var a = 0, b = geojson.geometries.length; a < b; a += 1) {
        var geo = geojson.geometries[a];

        if (geo.type == 'MultiPolygon') {
            addRelation(geo);
        } else if (geo.type == 'Polygon') {
            addPolygon(geo);
        }
    }

    function addRelation(rel) {
        var r = relation(rel);
        relations += r;
    }

    function relation(rel) {
        var relStr = '',
            members = '',
            rCoords = rel.coordinates;

        for (var a = 0, b = rCoords.length; a < b; a += 1) {
            for (var c = 0, d = rCoords[a].length; c < d; c += 1) {

                var poly = addPolygon({coordinates: [rCoords[a][c]]}),
                    role = ((rel.type == 'Polygon' && c > 0) ? 'inner': 'outer');

                members += '<member type="way" ref="' + poly + '" role="' + role + '"/>';
            }
        }

        // need to figure out how to remove tags from the inner way
        // just do the property tags?

        relStr += '<relation id="' + count + '" changeset="' + changeset + '">';
        relStr += members;
        relStr += '<tag k="type" v="multipolygon"/></relation>';

        count--;

        return relStr;
    }

    function addPolygon(poly) {
        var p = polygon(poly);
        ways += p.way;
        return p.id;
    }

    function polygon(poly) {
        var nds = [];

        if (poly.coordinates.length === 1){
            var polyC = poly.coordinates[0];

            // length-1 because osm xml doesn't need repeating nodes
            // we instead use a reference to the first node
            for (var a = 0, b = polyC.length-1; a < b; a += 1) {
                nds.push(count);
                addNode(polyC[a][1], polyC[a][0]);
            }
            nds.push(nds[0]); // first node = last

            return way(nds, tags);
        } else {
            // polygon with a hole, make into a relation w/ inner
            // console.log('before: ' + String(poly.coordinates));
            poly.coordinates = [poly.coordinates];
            // console.log('after: ' + String(poly.coordinates));
            addRelation(poly);
            return {id: null, way: ''};
        }
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
        // nds and tags as unprocessed arrays

        // for temporary external tags, will go away soon, then use tagz or rename to tags
        var tagStr = '';
        for (var a = 0, b = tags.length; a < b; a += 1) {
            tagStr += '<tag k="' + tags[a][0] + '" v="' + tags[a][1] + '"/>';
        }


        var w = '<way id="' + count + '" changeset="' + changeset + '">' +
        buildNds(nds) + tagStr + '</way>';
        count--;

        return {
            id: count + 1,
            way: w
        };
    }

    return nodes + ways + relations;
}

// this really sucks
function submit(result) {
    teardown();

    if (result != 'skip') {
        $.ajax({
            type: 'POST',
            url: settings.featuresApi + 'db=' + settings.db + '&id=' + osmly.current.id + '&action=problem',
            crossDomain: true,
            data: {problem: result, user: user.name}
        });
        // no callback, not worth slowing down/complicating over, it's reproducable
    }

    if (settings.demo) {
        console.log(osmly.current.layer.toGeoJSON());
        if (result === 'submit') {
            var geojson = osmly.current.layer.toGeoJSON();
            console.log(toOsm(geojson));
            console.log(toOsmChange(geojson));
        }

        next();
    } else {
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
        .html('<a href="' + settings.writeApi + '/browse/changeset/' +
            id + '" target="_blank">Details on osm.org »</a>');

    var url = settings.writeApi + '/api/0.6/changeset/' + id + '/upload',
        token_secret = token('secret'),
        geojson = osmly.current.layer.toGeoJSON(),
        osmChange = toOsmChange(geojson);

    notify('uploading to OSM');

    o.oauth_timestamp = ohauth.timestamp();
    o.oauth_nonce = ohauth.nonce();
    o.oauth_token = token('token');

    o.oauth_signature = ohauth.signature(settings.oauth_secret, token_secret,
        ohauth.baseString('POST', url, o));

    ohauth.xhr('POST', url, o, osmChange, {header: {'Content-Type': 'text/xml'}},
        function() {
            next();
        });
}

function teardown() {
    $('#action-block, #tags, #bottom-right').hide();
    $('#problem, #skip, #submit, .minus, #add-new-tag, #reset').unbind();
    $('.k, .v').unbind();
    $('#problem').val('problem'); // resets problem menu
    $("#problem, #submit").removeAttr('style');

    map.closePopup();
    map.removeLayer(osmly.current.layer);

    if (osmly.current.dataLayer) map.removeLayer(osmly.current.dataLayer);
}

return osmly;
};
