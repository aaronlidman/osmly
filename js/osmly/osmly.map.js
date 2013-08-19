osmly.map = function() {
    var map = L.map('map', {
            center: osmly.settings.origin,
            layers: [new L.BingLayer('Arzdiw4nlOJzRwOz__qailc8NiR31Tt51dN2D7cm57NrnceZnCpgOkmJhNpGoppU')],
            zoom: osmly.settings.zoom,
            maxZoom: 20,
            fadeAnimation: false
    });

    map.on('moveend', function() {
            var coords = map.getCenter().wrap(),
                lat = coords.lat.toFixed(4).toString(),
                lng = coords.lng.toFixed(4).toString(),
                zoom = map.getZoom().toString();
            osmly.osmlink = 'http://www.openstreetmap.org/?lat=' + lat + '&lon=' + lng + '&zoom=' + zoom;
        });
    map.attributionControl.setPrefix(false);

    return map;
};
