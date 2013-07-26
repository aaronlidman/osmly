// only Point, Polygon, MultiPolygon for now
// basic structure from:
// https://github.com/JasonSanford/GeoJSON-to-Google-Maps
var geo2osm = function(geo, changeset) {
    function togeojson(geo) {
        var nodes = '',
            ways = '',
            relations = '',
            count = -1,
            changeset = changeset || false;

        switch (geo.type) {
            case 'Point':
                nodes += '<node id="' + count + '" lat="' + geo.coordinates[1] +
                '" lon="' + geo.coordinates[0] + '">';
                nodes += propertiesToTags(geo.properties);
                nodes += '</node>';
                break;

            case 'MultiPoint':
                break;
            case 'LineString':
                break;
            case 'MultiLineString':
                break;
            case 'Polygon':
                if (geo.coordinates.length > 1) {
                    for (var i = 0; i < geo.coordinates.length; i++) {}
                    // need to make a multipolygon
                    // first coord list is outter, rest are inner
                } else {
                    // just a simple polygon
                    for (var j = 0; j < geo.coordinates[0].length; j++) {

                    }
                }
                break;

        }

        return osm;
    }

    function propertiesToTags(properties) {
        var tags = '';
        for (var tag in properties) {
            tags += '<tag k="' + tag + '" v="' + properties[tag] + '"/>';
        }
        return tags;
    }

    var obj;


    switch (geojson.type) {
        case 'FeatureCollection':
            if (geo.features) {
                obj = [];
                for (var i = 0; i < geo.features.length; i++){
                    obj.push(togeojson(geo.features[i].geometry));
                }
            } else {
                console.log('Invalid GeoJSON object: FeatureCollection object missing \"features\" member.');
            }
            break;

        case 'GeometryCollection':
            if (geo.geometries) {
                obj = [];
                for (var j = 0; j < geo.geometries.length; j++){
                    obj.push(togeojson(geo.geometries[j]));
                }
            } else {
                console.log('Invalid GeoJSON object: GeometryCollection object missing \"geometries\" member.');
            }
            break;

        case 'Feature':
            if (geojson.properties && geojson.geometry) {
                obj = togeojson(geojson.geometry);
            } else {
                console.log('Invalid GeoJSON object: Feature object missing \"properties\" or \"geometry\" member.');
            }
            break;

        case 'Point':
        case 'MultiPoint':
        case 'LineString':
        case 'MultiLineString':
        case 'Polygon':
        case 'MultiPolygon':
            if (geojson.coordinates) {
                obj = togeojson(geojson);
            } else {
                console.log('Invalid GeoJSON object: Geometry object missing \"coordinates\" member.');
            }
            break;

        default:
            console.log('Invalid GeoJSON object: GeoJSON object must be one of \"Point\", \"LineString\", \"Polygon\", \"MultiPolygon\", \"Feature\", \"FeatureCollection\" or \"GeometryCollection\".');
    }

    return obj;
};