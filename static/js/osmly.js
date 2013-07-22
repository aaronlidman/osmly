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
    consumerKey: 'yx996mtweTxLsaxWNc96R7vpfZHKQdoI9hzJRFwg',
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
};

function keyclean(x) { return x.replace(/\W/g, ''); }
// from iD

osmly.token = function(k, x) {
    if (arguments.length === 2) {
        localStorage[keyclean(osmly.settings.writeApi) + k] = x;
    }
    return localStorage[keyclean(osmly.settings.writeApi) + k];
};
// from iD

function updateChangeset(id, callback) {
    var url = osmly.settings.writeApi + '/api/0.6/changeset/' + id,
        token_secret = token('secret'),
        change = newChangesetXml();

    console.log(osmly.settings.changesetTags);
    console.log(change);

    notify('updating changeset');

    // removed ohauth
}

return osmly;
}());
