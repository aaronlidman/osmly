// https://gist.github.com/aaronlidman/4712709
var osm2geo = function(osm) {
    var xml = parse(osm),
        geo = {
            "type" : "FeatureCollection",
            "features" : []
        },
        nodesCache = cacheNodes();

    function parse(xml) {
        var string = new XMLSerializer().serializeToString(xml),
            parser = new DOMParser();
        return parser.parseFromString(string, 'text/xml');
    }

    // set the bounding box [minX,minY,maxX,maxY]; x -> long, y -> lat
    function getBounds(bounds) {
        var bbox = [];

        if (bounds.length) {
            bbox = [
                +bounds[0].getAttribute('minlon'),
                +bounds[0].getAttribute('minlat'),
                +bounds[0].getAttribute('maxlon'),
                +bounds[0].getAttribute('maxlat')
            ];
        }

        return bbox;
    }

    geo.bbox = getBounds(xml.getElementsByTagName('bounds'));

    // set properties for a feature
    function setProps(element){
        var properties = {},
            tags = element.getElementsByTagName('tag'),
            t = tags.length;

        while (t--) {
            properties[tags[t].getAttribute('k')] = tags[t].getAttribute('v');
        }

        return properties;
    }

    // create a feature of given type
    function getFeature(element, type){
        return {
            "geometry" : {
                "type" : type,
                "coordinates" : []
            },
            "type" : "Feature",
            "properties" : setProps(element)
        };
    }

    function cacheNodes() {
        var nodes = xml.getElementsByTagName('node'),
            n = nodes.length,
            coords = {};
            withTags = [];

        while (n--) {
            var tags = nodes[n].getElementsByTagName('tag');

            coords[nodes[n].getAttribute('id')] =
                [nodes[n].getAttribute('lon'), nodes[n].getAttribute('lat')];

            if (tags.length) withTags.push(nodes[n]);
        }

        return {
            coords: coords,
            withTags: withTags
        };
    }

    function buildRelations() {
        // features, multipolygons halfway done
        // done, a list of feature refs that will finish the features and the multipolygons they belong to
        var relations = xml.getElementsByTagName('relation'),
            r = relations.length,
            features = [],
            done = {},
            count = 0;

        while (r--) {
            var tags = [],
                type = false;

            // don't know it's a multipolygon for sure, check the type
            // or enforce so it's just type=multipolygon we're parsing
                // probably simpler
            feature = getFeature(relations[r], "MultiPolygon");

            if (feature.properties.type == 'multipolygon') {
                // other types require more work that I don't have time for right now

                feature.geometry.coordinates.push([]);

                // // probably going away
                // // if we can get actual multipolygons working this can go away
                // // if not, then we're just going to copy tags to all child ways/nodes
                // var relTags = relations[r].getElementsByTagName('tag'),
                //     x = relTags.length;
                // while (x--) {
                //     if (relTags[x].getAttribute('k') == 'type') {
                //         type = relTags[x].getAttribute('k');
                //     } else {
                //         tags.push([relTags[x].getAttribute('k'), relTags[x].getAttribute('v')]);
                //     }
                // }

                var members = relations[r].getElementsByTagName('member'),
                    m = members.length;
                while (m--) {
                    done[members[m].getAttribute('ref')] = count;
                    // feature.geometry.coordinates[0].push([]);

                    // .getAttribute('role') stuff would go somewhere around here
                }

                console.log(feature);

                delete feature.properties.type;
                features[count] = feature;
                count++;
            }
        }

        return {
            features: features,
            done: done
        };
    }

    var relational = buildRelations();
    console.log(relational);

    var ways = xml.getElementsByTagName('way');

    var w = ways.length;
    while (w--) {
        var feature = {},
            nds = ways[w].getElementsByTagName('nd');

        // If first and last nd are the same then its a polygon
        if (nds[0].getAttribute('ref') === nds[nds.length-1].getAttribute('ref')) {
            feature = getFeature(ways[w], "Polygon");
            feature.geometry.coordinates.push([]);
        } else {
            feature = getFeature(ways[w], "LineString");
        }

        var n = nds.length;
        while (n--) {
            var cords = nodesCache.coords[nds[n].getAttribute('ref')];

            if (feature.geometry.type === "Polygon") {
                feature.geometry.coordinates[0].push(cords);
            } else {
                feature.geometry.coordinates.push(cords);
            }
        }

        if (relational.done[ways[w].getAttribute('id')]) {
            var relCount = relational.done[ways[w].getAttribute('id')];
            console.log('relational.features[relCount].geometry');
            console.log(relational.features[relCount].geometry);
            relational.features[relCount].geometry.coordinates[0].push(feature.geometry.coordinates);
        } else {
            geo.features.push(feature);
        }
    }

    var r = relational.features.length;
    while (r--) {
        console.log(relational.features[r]);
        geo.features.push(relational.features[r]);
    }
    
    var points = nodesCache.withTags,
        p = points.length;

    while (p--) {
        var feature = getFeature(points[p], "Point");

        feature.geometry.coordinates = [
            points[p].getAttribute('lon'),
            points[p].getAttribute('lat')
        ];

        geo.features.push(feature);
    }

    return geo;
};