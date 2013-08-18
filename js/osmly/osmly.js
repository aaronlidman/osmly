window.osmly = (function () {
    var osmly = {};

    osmly.settings = {
        title: '',
        justMap: false,
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
        changesetTags: {
            'created_by': 'osmly',
            'osmly:version': '0',
            'imagery_used': 'Bing'
        },
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

        if (!osmly.settings.justMap) osmly.ui.initialize();
    };

    osmly.auth = osmAuth({
        oauth_secret: osmly.settings.oauth_secret,
        oauth_consumer_key: osmly.settings.consumerKey,
        auto: false,
        url: osmly.settings.writeApi
    });

    function keyclean(x) { return x.replace(/\W/g, ''); }

    osmly.token = function(k, x) {
        if (arguments.length === 2) {
            localStorage[keyclean(osmly.settings.writeApi) + k] = x;
        }
        return localStorage[keyclean(osmly.settings.writeApi) + k];
    };

    return osmly;
}());
