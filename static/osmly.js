window.osmly = function() {
/*
    - Leaflet, leafletjs.com
        - Bing plugin, github.com/shramov/leaflet-plugins/blob/master/layer/tile/Bing.js
    - jQuery, jquery.com
    - ohauth, github.com/tmcw/ohauth

    TODO
        - namespace cookies
        - cleanup html, better/unique selectors
        - tag table, move to right side, like JOSM
        - update leaflet
            - reimplement hardcoded fixes
        - update + localize jquery
        - reset/normalize css
        - simple queue/checkout system to avoid simultaneous editting

    IMPROVEMENTS
        - better/simple way of diplaying?
*/

    var osmly = {
            host: 'http://api06.dev.openstreetmap.org',
            oauth_secret: 'Mon0UoBHaO3qvfgwWrMkf4QAPM0O4lITd3JRK4ff',
            xapi: 'http://www.overpass-api.de/api/xapi?map?',
            div: 'map',
            db: '', // string, no space, comma seperated; corresponds to 'database'.sqlite
            columns: '',
            center: [0,0],
            zoom: 2
        },
        user = 0,
        current = {},
        o = {
            oauth_consumer_key: 'yx996mtweTxLsaxWNc96R7vpfZHKQdoI9hzJRFwg',
            oauth_signature_method: 'HMAC-SHA1'},
        edit_style = {
            "color": "#00FF00",
            "weight": 2,
            "opacity": 1};

    osmly.set = function (object) {
        for (var obj in object) {
            osmly[obj] = object[obj];
        }
        return osmly;
    };

    osmly.go = function() {
        map = L.map(osmly.div, {
            center: osmly.center,
            layers: [new L.BingLayer("Anqm0F_JjIZvT0P3abS6KONpaBaKuTnITRrnYuiJCE0WOhH6ZbE4DzeT6brvKVR5")],
            zoom: osmly.zoom,
            maxZoom: 18
                // need to figure out z18+ bing
        });

        osmly.map = map;

        if (cookie('token') && cookie('secret')) {
            setTimeout(next, 2000);
        } else if (getVar().oauth_token) {
            // limbo situation?
            console.log('back from osm.org');
            access_oauth();
        } else {
            // no auth of any kind
            $('#login').fadeIn();
        }

        map.on('move', function() {
            var coords = map.getCenter(),
                lat = coords.lat.toFixed(4).toString(),
                lng = coords.lng.toFixed(4).toString(),
                zoom = map.getZoom().toString();
                string = '<span id="prefix_text">' + 
                    '<a href="http://www.openstreetmap.org/?lat=' + lat +
                    '&lon=' + lng + '&zoom=' + zoom + '" target="_blank">' + 
                    lat + ', ' + lng + '</a>' + 
                    '</span>';
            map.attributionControl.setPrefix(string);
        });

        $("#login").click(function() {
            // throw up a spinner
            request_oauth();
        });

        $("#instruct").click(function() {
            $("#modal").fadeIn(200);
            $("#instruction").fadeIn(200);
        });

        $("#instruction").click(function() {
            $("#instruction").fadeOut(200);
            $("#modal").fadeOut(200);
        });
    };

    function request_oauth() {
        var url = osmly.host + '/oauth/request_token';

        o.oauth_timestamp = ohauth.timestamp();
        o.oauth_nonce = ohauth.nonce();
        o.oauth_signature = ohauth.signature(osmly.oauth_secret, '',
            ohauth.baseString('POST', url, o));

        ohauth.xhr('POST', url, o, null, {}, function(xhr) {
            var token = ohauth.stringQs(xhr.response);
            cookie('ohauth_token_secret', token.oauth_token_secret);
            // document.cookie = 'ohauth_token_secret=' + token.oauth_token_secret;
            var at = osmly.host + '/oauth/authorize?';
            console.log('redirecting');
            window.location = at + ohauth.qsString({
                oauth_token: token.oauth_token,
                oauth_callback: location.href
            });
        });
    }

    function access_oauth() {
        var oauth_token = ohauth.stringQs(location.search.slice(1));
        o.oauth_timestamp = ohauth.timestamp();
        o.oauth_nonce = ohauth.nonce();
        o.oauth_token = oauth_token.oauth_token;
        var url = osmly.host + '/oauth/access_token';
        var token_secret = cookie('ohauth_token_secret');
        if (!token_secret) return console.error('Required token not found');
        o.oauth_signature = ohauth.signature(osmly.oauth_secret, token_secret,
            ohauth.baseString('POST', url, o));
        ohauth.xhr('POST', url, o, null, {}, function(xhr) {
            var access_token = ohauth.stringQs(xhr.response);
            cookie('token', access_token.oauth_token);
            cookie('secret', access_token.oauth_token_secret);
            // o.oauth_token = access_token.oauth_token;
            o.oauth_timestamp = ohauth.timestamp();
            o.oauth_nonce = ohauth.nonce();
            // token_secret = access_token.oauth_token_secret;
            o.oauth_token = document.cookie.match(/token=([^;]+)/)[1];
            token_secret = document.cookie.match(/secret=([^;]+)/)[1];
            console.log(String.fromCharCode(0x2713) + ' login');
            history.pushState(null, null, '/');
            next();
            // changeset stuff
            // var url = osmly.host + '/api/0.6/changeset/create';
            // o.oauth_signature = ohauth.signature(osmly.oauth_secret, token_secret,
            //     ohauth.baseString('PUT', url, o));
            // console.log(o);
            // ohauth.xhr('PUT', url, o, change, { header: { 'Content-Type': 'text/xml' } },
            //     function(xhr) {
            //         console.log('Changeset: ' + xhr.response);
            //     });
        });
    }  

    function cookie(k, v) {
    // todo: namespace to api host
        if (arguments.length == 2) {
            // via: http://stackoverflow.com/a/3795002
            var expire = new Date();
            var msecs = expire.getTime();
            msecs += 31557600000; // a year
            expire.setTime(msecs);

            console.log(expire);
            console.log(expire.toGMTString());
            document.cookie = 
                k.toString() + '=' + v.toString() +
                ';expires=' + expire.toGMTString() +
                ';path=/';
        }
        var regex = new RegExp(k.toString() + '=([^;]+)');
        var check = document.cookie.match(regex);

        if (check) return check[1];
        return check;
    }

    function getVar() {
        return ohauth.stringQs(location.search.slice(1));
    }

    function next() {
        var request = '/?next' + '&db=' + osmly.db + '&columns=' + osmly.columns;
        request += '&time=' + new Date().getTime();
        console.log(request);

        // get the next polygon
        $.get(request, function(data) {
            current = '';
            current = jQuery.parseJSON(data);

            console.log(current);

            current.layer = L.geoJson(current.geo, {
                style: {
                    "color": "#00FF00",
                    "weight": 3,
                    "opacity": 1
                },
                onEachFeature: function (feature, layer){
                    if (current.geo.type == 'MultiPolygon') {
                        for (var ayer in layer._layers) {
                            layer._layers[ayer].editing.enable();
                        }
                    } else {
                        layer.editing.enable();
                    }
                }
            });

            map.fitBounds(current.layer.getBounds());

            setTimeout(function(){
                current.layer.addTo(map);
            }, 500);
            // 500ms timeout helps with known mid point problem, still looking into it
            // switching to canvas doesn't help        

            setup();
        });
    }

    function setup() {
        $("#login").fadeOut(250);

        populate_tags();
        displayOSM();

        $("#action-block").fadeIn(500);
        $("#tags").fadeIn(500);

        $('#skip, #submit').click(function(){
            finish_em(this.id);
        });

        $('#problem').change(function(){
            finish_em($('#problem').val());
        });

        $('.k').keypress(function(){
            $('ul').equalize({
                children: '.k',
                equalize: 'width',
                reset: true
            });
            $('.k').width($('.k').width()+15);
        });

        $('ul').equalize({
            children: '.k',
            equalize: 'width',
            reset: true
        });
        $('.k').width($('.k').width()+15);
    }

    function populate_tags() {
        current.tags = sortObject(current.tags);

        if (typeof current.tags == 'object' && current.tags !== null) {
            for (var tag in current.tags) {
                if (current.tags[tag] !== 'null') {
                    $('#tags ul').append(
                    '<li>' +
                    '<span class="k" spellcheck="false" contenteditable="true">' + 
                    tag + '</span>' +
                    '<span class="v" spellcheck="false" contenteditable="true">' + 
                    current.tags[tag] + '</span>' +
                    '</li>');
                }
            }
        }
    }

    // http://stackoverflow.com/a/1359808
    function sortObject(o) {
        var sorted = {},
        key, a = [];

        for (key in o) {
            if (o.hasOwnProperty(key)) {
                a.push(key);
            }
        }

        a.sort();

        for (key = 0; key < a.length; key++) {
            sorted[a[key]] = o[a[key]];
        }
        return sorted;
    }

    function finish_em(result) {
        // need to save geojson before next next()
        teardown();

        $.ajax({
            type: "POST",
            url: "/",
            data: {id: current.id, action: result}
        }).done(function(msg) {
            // not worth slowing down/complicating over, it's reproducable
        });

        if (result == 'submit') {
            // data['edit']['geo']['coordinates'] = littleboots.toGeoJSON(polygon)['geometries'][0]['coordinates'];
            // teardown() before might cause a problem here, move it to after
            // upload to osm.org
            // then do fadeOut and next()
            // wait for the .done
            next();
        } else {
            if (result != 'skip') result = 'problem';
            next();
        }

        $('#d-' + result).show();
        $('#d-' + result).fadeOut(500);
    }

    function teardown() {
        $('#problem, #skip, #submit').unbind();
        $("#action-block").hide();
        $("#tags").hide();
        map.closePopup();
        // map.setView(osmly.center, osmly.zoom, true);
            // superfluous animation
        $("#problem").val('problem'); // resets problem menu
        map.removeLayer(current.layer);
        $('#tags li').remove();
        // map.removeLayer(display_polys);
        // map.removeLayer(display_nodes);
    }

    function displayOSM() {
        // mostly from OSM leaflet port
        // https://github.com/openstreetmap/openstreetmap-website/blob/master/app/assets/javascripts/index/browse.js
        var dataLayer = new L.OSM.DataLayer(null, {
            styles: {
                way: {
                    weight: 3,
                    color: "#FFFF00",
                    opacity: 1
                },
                area: {
                    weight: 3,
                    color: "#FFFF00"
                },
                node: {
                    color: "#FFFF00"
                },
                relation: {
                    weight: 3,
                    color: "#FFFF00",
                    opacity: 1
                }
            }
        });
        
        var url = osmly.xapi + current.bbox;
        console.log(url);
        $.ajax({
            type: 'GET',
            url: url
        }).success(function(xml) {
            var features = dataLayer.buildFeatures(xml);
            console.log(features);
            dataLayer.addData(features);
            dataLayer.addTo(map);
        });
    }

    return osmly;
};