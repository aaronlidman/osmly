osmly.map = function() {
    var map = {},
        settings = osmly.settings;

    function initialize() {
        map.map = L.map(settings.div, {
            center: settings.origin,
            layers: [new L.BingLayer('Arzdiw4nlOJzRwOz__qailc8NiR31Tt51dN2D7cm57NrnceZnCpgOkmJhNpGoppU')],
            zoom: settings.zoom,
            maxZoom: 20
        });

        map.map.on('move', function() {
            var coords = map.map.getCenter(),
                lat = coords.lat.toFixed(4).toString(),
                lng = coords.lng.toFixed(4).toString(),
                zoom = map.map.getZoom().toString();
            osmly.osmlink = 'http://www.openstreetmap.org/?lat=' + lat + '&lon=' + lng + '&zoom=' + zoom;
        });

        map.map.attributionControl.setPrefix(false);
    }

    initialize();
    return map;
};
