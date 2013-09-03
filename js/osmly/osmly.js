window.osmly = (function () {
    var osmly = {
        settings: settings
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
        if (settings.db) osmly.ui.go();
            // allows for lazy no UI mode used on dist/index.html
    };

    osmly.auth = osmAuth({
        oauth_secret: osmly.settings.oauth_secret,
        oauth_consumer_key: osmly.settings.consumerKey,
        auto: false,
        url: osmly.settings.writeApi,
        landing: location.protocol + "//" + location.host + '/land.html'
    });

    return osmly;
}());
