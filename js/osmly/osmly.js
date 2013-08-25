window.osmly = (function () {
    var osmly = {};

    osmly.settings = {
        // refer to settings_documentation.md for details
        title: '',
        db: '',
        writeApi: 'http://api06.dev.openstreetmap.org',
        oauth_secret: 'Mon0UoBHaO3qvfgwWrMkf4QAPM0O4lITd3JRK4ff',
        consumerKey: 'yx996mtweTxLsaxWNc96R7vpfZHKQdoI9hzJRFwg',
        readApi: 'http://www.overpass-api.de/api/xapi?map?',
        context: {},
        origin: [0,0],
        zoom: 2,
        demo: true,
        changesetTags: {
            'created_by': 'osmly',
            'osmly:version': '0',
            'imagery_used': 'Bing'
        },
        renameProperty: {},
        usePropertyAsTag: [],
        appendTag: {},
        featureStyle: {
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
            alert('need some settings');
        }

        osmly.map = osmly.map();
        if (settings.db) osmly.ui.initialize();
            // allows for lazy no UI mode used on dist/index.html
    };

    osmly.auth = osmAuth({
        oauth_secret: osmly.settings.oauth_secret,
        oauth_consumer_key: osmly.settings.consumerKey,
        auto: false,
        url: osmly.settings.writeApi,
        landing: window.location.origin + '/land.html'
    });

    return osmly;
}());
