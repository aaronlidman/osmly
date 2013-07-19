osmly.map = function() {
    var map = {};

    map = L.map(osmly.settings.div, {
            center: osmly.settings.origin,
            layers: [new L.BingLayer('Arzdiw4nlOJzRwOz__qailc8NiR31Tt51dN2D7cm57NrnceZnCpgOkmJhNpGoppU')],
            zoom: osmly.settings.zoom,
            maxZoom: 20
        });

    map.on('move', function() {
            var coords = map.getCenter(),
                lat = coords.lat.toFixed(4).toString(),
                lng = coords.lng.toFixed(4).toString(),
                zoom = map.getZoom().toString();
            osmly.osmlink = 'http://www.openstreetmap.org/?lat=' + lat + '&lon=' + lng + '&zoom=' + zoom;
        });

    map.attributionControl.setPrefix(false);

    return map;
};
