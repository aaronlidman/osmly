/**************************************************************************
 *                 OSM2GEO - OSM to GeoJSON converter
 * OSM to GeoJSON converter takes in a .osm XML file as input and produces
 * corresponding GeoJSON object.
 *
 * AUTHOR: P.Arunmozhi <aruntheguy@gmail.com>
 * DATE  : 26 / Nov / 2011 
 * LICENSE : WTFPL - Do What The Fuck You Want To Public License
 * LICENSE URL: http://sam.zoy.org/wtfpl/
 *
 * DEPENDENCY: OSM2GEO entirely depends on jQuery for the XML parsing and
 * DOM traversing. Make sure you include <script src="somewhere/jquery.js">
 * </script> before you include osm2geo.js
 *
 * USAGE: This script contains a single function -> geojson osm2geo(osmXML)
 * It takes in a .osm (xml) as parameter and retruns the corresponding 
 * GeoJson object.
 *
 * ***********************************************************************/
var osm2geo = function(osm) {

    var $xml = jQuery(osm),
        geo = {
            "type" : "FeatureCollection",
            "features" : []
        },
        boringTags = [
        'source',
        'source_ref',
        'source:ref',
        'history',
        'attribution',
        'created_by',
        'tiger:county',
        'tiger:tlid',
        'tiger:upload_uuid']; // other tags, http://taginfo.openstreetmap.org/keys

    // set the bounding box [minX,minY,maxX,maxY]; x -> long, y -> lat
    function getBounds(bounds){
        var bbox = [];
        bbox.push(+bounds.attr("minlon"));
        bbox.push(+bounds.attr("minlat"));
        bbox.push(+bounds.attr("maxlon"));
        bbox.push(+bounds.attr("maxlat"));

        return bbox;
    }

    geo.bbox = getBounds($xml.find("bounds"));

    // set properties for a feature
    function setProps(element){
        var properties = {},
            tags = $(element).find("tag");

        tags.each(function(index, tag){
            if (boringTags.indexOf($(tag).attr("k")) === -1) {
                properties[$(tag).attr("k")] = $(tag).attr("v");
            }
        });

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

    var $ways = $("way", $xml);

    $ways.each(function(index, ele){
        var feature = {},
            nodes = $(ele).find("nd");

        // If first and last nd are same, then its a polygon
        if ($(nodes).last().attr("ref") === $(nodes).first().attr("ref")) {
            feature = getFeature(ele, "Polygon");
            feature.geometry.coordinates.push([]);
        } else {
            feature = getFeature(ele, "LineString");
        }

        nodes.each(function(index, nd) {
            var node = $xml.find("node[id='"+$(nd).attr("ref")+"']"), // find the node with id ref'ed in way
                cords = [+node.attr("lon"), +node.attr("lat")]; // get the lat,lon of the node
            
            // If polygon push it inside the cords[[]]
            if (feature.geometry.type === "Polygon") {
                feature.geometry.coordinates[0].push(cords);
            } else {
                feature.geometry.coordinates.push(cords);
            }
        });

        geo.features.push(feature);
    });
    
    var $points = $("node:has('tag')", $xml);

    $points.each(function(index, ele){
        var feature = getFeature(ele, "Point");
        feature.geometry.coordinates.push(+$(ele).attr('lon'));
        feature.geometry.coordinates.push(+$(ele).attr('lat'));

        geo.features.push(feature);
    });

    return geo;

};