window.osmly = (function () {
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

var osmly = {};

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

var user = {
        id: -1,
        name: 'demo'
    },
    current = {};

osmly.o = {};

osmly.o.oauth_consumer_key = osmly.settings.consumerKey;
osmly.o.oauth_signature_method = 'HMAC-SHA1';

osmly.initialize = function(settings) {
    if (typeof settings === 'object') {
        for (var obj in settings) {
            osmly.settings[obj] = settings[obj];
        }
    } else {
        console.log('missing settings, see documentation');
        return;
    }

    osmly.map = osmly.map();
    osmly.ui.initialize();
    // osmly.map = osmly.map();
    // osmly.item = osmly.item();
    // osmly.ui = osmly.ui();
    // osmly.user = osmly.user();
    // osmly.connect = osmly.connect();
};

// next 2 functions from iD: https://github.com/systemed/iD/blob/master/js/id/oauth.js
function keyclean(x) { return x.replace(/\W/g, ''); }

osmly.token = function(k, x) {
    if (arguments.length === 2) {
        localStorage[keyclean(osmly.settings.writeApi) + k] = x;
    }
    return localStorage[keyclean(osmly.settings.writeApi) + k];
};

function updateChangeset(id, callback) {
    var url = osmly.settings.writeApi + '/api/0.6/changeset/' + id,
        token_secret = token('secret'),
        change = newChangesetXml();

    console.log(osmly.settings.changesetTags);
    console.log(change);

    notify('updating changeset');

    o.oauth_timestamp = ohauth.timestamp();
    o.oauth_nonce = ohauth.nonce();
    o.oauth_token = token('token');

    o.oauth_signature = ohauth.signature(osmly.settings.oauth_secret, token_secret,
        ohauth.baseString('PUT', url, o));

    ohauth.xhr('PUT', url, o, change, {header: {'Content-Type': 'text/xml'}},
        function() {
            // don't care about the response
            if (callback) callback();
        });
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

return osmly;
}());
