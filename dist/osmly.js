var settings = {
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
        'created_by': 'OSMLY',
        'osmly:version': '1.1.0',
        'imagery_used': 'Bing'
    },
    renameProperty: {},
    usePropertyAsTag: [],
    appendTag: {},
    featureStyle: {
        color: '#00FF00',
        weight: 3,
        opacity: 1,
        clickable: false,
        dashArray: '5, 10'
    },
    contextStyle: {
        color: '#FFFF00',
        fillOpacity: 0.3,
        weight: 3,
        opacity: 1
    },
    users: [],
    admins: [],
    discardTags: [
    // https://github.com/systemed/iD/blob/master/data/discarded.json
        "created_by",
        "odbl",
        "odbl:note",

        "tiger:upload_uuid",
        "tiger:tlid",
        "tiger:source",
        "tiger:separated",

        "geobase:datasetName",
        "geobase:uuid",
        "sub_sea:type",

        "KSJ2:ADS",
        "KSJ2:ARE",
        "KSJ2:AdminArea",
        "KSJ2:COP_label",
        "KSJ2:DFD",
        "KSJ2:INT",
        "KSJ2:INT_label",
        "KSJ2:LOC",
        "KSJ2:LPN",
        "KSJ2:OPC",
        "KSJ2:PubFacAdmin",
        "KSJ2:RAC",
        "KSJ2:RAC_label",
        "KSJ2:RIC",
        "KSJ2:RIN",
        "KSJ2:WSC",
        "KSJ2:coordinate",
        "KSJ2:curve_id",
        "KSJ2:curve_type",
        "KSJ2:filename",
        "KSJ2:lake_id",
        "KSJ2:lat",
        "KSJ2:long",
        "KSJ2:river_id",
        "yh:LINE_NAME",
        "yh:LINE_NUM",
        "yh:STRUCTURE",
        "yh:TOTYUMONO",
        "yh:TYPE",
        "yh:WIDTH_RANK",

        "SK53_bulk:load",
    ]
};
window.osmly = (function () {
    var osmly = {
        settings: settings
    };

    osmly.go = function(settings) {
        window.location.hash = '';
        $(function(){
            if (typeof settings === 'object') {
                for (var obj in settings) {
                    if (Object.prototype.toString.call(settings[obj]).slice(8, -1) == 'Object' &&
                        (obj === 'contextStyle' || obj === 'featureStyle' || obj === 'changesetTags')) {
                        // for each item in the object we append to the current setting
                        // append/not overwrite the setting, there are useful default settings in there
                        for (var setting in settings[obj]) {
                            osmly.settings[obj][setting] = settings[obj][setting];
                        }
                    } else { osmly.settings[obj] = settings[obj]; }
                }
            } else {
                alert('need some settings');
            }
            osmly.auth = osmly.auth();
            osmly.map = osmly.map();
            osmly.ui.go();
        });
    };

    return osmly;
}());
osmly.auth = function () {
    var url = osmly.settings.writeApi;
    if (url.split('dev').length === 1) url = 'http://www.openstreetmap.org';

    var auth = osmAuth({
        oauth_secret: osmly.settings.oauth_secret,
        oauth_consumer_key: osmly.settings.consumerKey,
        auto: false,
        url: url,
        landing: location.protocol + "//" + location.host + '/land.html'
    });

    auth.userAllowed = function() {
        // by default (empty list) any logged in user is allowed
        if (!osmly.settings.users.length) return true;
        if (osmly.settings.users.indexOf(token('user')) > -1) return true;
        if (osmly.settings.admins.indexOf(token('user')) > -1) return true;
        return false;
    };

    auth.notAllowed = function() {
        // we don't implicitly logout, this allows some users to do some imports and not others
        $('#reusable-modal .modal-content').html('<h3>You are not on the list of allowed users.</h3>');
        CSSModal.open('reusable-modal');
    };

    auth.adminAllowed = function () {
        if (osmly.settings.admins.indexOf(token('user')) > -1) return true;
        if (!osmly.settings.admins.length) return true;
        return false;
    };

    return auth;
};
/* jshint multistr:true */
osmly.map = function() {
    var map = L.map('map', {
        center: osmly.settings.origin,
        layers: [new L.BingLayer('Arzdiw4nlOJzRwOz__qailc8NiR31Tt51dN2D7cm57NrnceZnCpgOkmJhNpGoppU')],
        zoom: osmly.settings.zoom,
        maxZoom: 19,
        fadeAnimation: false
    });

    L.Icon.Default.imagePath = 'dist/leaflet-images/';

    map.on('moveend', function() {
        var coords = map.getCenter().wrap(),
            lat = coords.lat.toFixed(4).toString(),
            lng = coords.lng.toFixed(4).toString(),
            zoom = map.getZoom().toString();
            osmly.osmlink = 'http://www.openstreetmap.org/#map=' + zoom + '/' + lat + '/' + lng;
    });

    map.attributionControl.setPrefix(false);
    if (osmly.settings.writeApi.split('dev').length > 1) map.attributionControl.setPrefix('DEV SERVER');

    map.osmTiles = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        maxNativeZoom: 18
    });

    map.context = function(bbox, buffer, callback){
        // gets, filters, sets, and shows context
        if (buffer) {
            bbox = [
                bbox[0] - buffer,
                bbox[1] - buffer,
                bbox[2] + buffer,
                bbox[3] + buffer
            ];
        }

        if (map.hasLayer(map.contextLayer))
            map.removeLayer(map.contextLayer);

        osmly.ui.notify('getting nearby OSM data');
        getOsm(bbox, function(xml) {
            osmly.ui.notify('rendering OSM data');
            context = filterContext(osm_geojson.osm2geojson(xml, true));
            setContext(context);
            map.addLayer(map.contextLayer);
            callback();
        });

        // for offline usage
        // setTimeout(function() {
        //     setContext('');
        //     map.addLayer(map.contextLayer);
        //     callback();
        // }, 555);
    };

    map.toggleLayer = function(layer) {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        } else {
            map.addLayer(layer);
        }
    };

    function getOsm(bbox, callback) {
        $.ajax({
            url: osmly.settings.readApi + 'bbox=' + bbox.join(','),
            dataType: 'xml',
            success: function(xml) {
                map.osmContext = xml;
                callback(xml);
            }
        });
    }

    function filterContext(geojson) {
        var geo = {
                'type' : 'FeatureCollection',
                'features' : []};

        for (var i = 0; i < geojson.features.length; i++) {
            var feature = geojson.features[i],
                match = false;

            for (var key in feature.properties) {
                if (key in osmly.settings.context &&
                    osmly.settings.context[key].indexOf(feature.properties[key]) > -1 &&
                    !match) {
                    match = true;
                }
            }

            if (match || !Object.keys(osmly.settings.context).length) {
                geo.features.push(feature);
            }
        }
        return geo;
    }

    function setContext(geojson) {
        var index = 0;
        map.contextLayer = L.geoJson(geojson, {
            style: osmly.settings.contextStyle,
            onEachFeature: function(feature, layer) {
                var popup = '',
                    label = 'NO NAME, click for tags',
                    t = 0,
                    tagKeys = Object.keys(feature.properties);

                if (feature.properties) {
                    layer.bindPopup(popup);
                        // popup is bound upfront so we can get a leaflet layer id
                        // this id is included in the 'data-layer' attribute, used for merging

                    if (feature.properties.name) label = feature.properties.name;
                    while (t < tagKeys.length) {
                        // we don't display osm_* tags but they're used for merging
                        if (tagKeys[t].split('osm_').length === 1) {
                            popup += '<li><span class="k">' + tagKeys[t] +
                            '</span>: ' + feature.properties[tagKeys[t]] + '</li>';
                        }
                        t++;
                    }
                    if (feature.geometry.type == 'Point' && osmly.mode.now == 'import') {
                        popup += '<li class="merge"\
                            data-layer-id="' + index + '"\
                            data-tags=\'' + JSON.stringify(feature.properties) + '\'\
                            style="\
                            margin-top: 10px;\
                            text-align: center;\
                            padding: 10px 0;\
                            border: 1px solid #aaa;\
                            background-color: #eee;\
                            cursor: pointer;\
                            ">Merge with import data</li>';
                    }
                    feature.properties._id = index;
                    layer._popup._content = popup;
                    layer.bindLabel(label);
                    index++;
                }
            },
            pointToLayer: function(feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 6,
                    opacity: 1,
                    fillOpacity: 0.33
                });
            }
        });
    }

    map.setFeature = function(geojson, edit, show) {
        map.featureLayer = L.geoJson(geojson, {
            style: osmly.settings.featureStyle,
            onEachFeature: function (feature, layer) {
                if (edit) {
                    if (geojson.geometry.type == 'MultiPolygon') {
                        for (var el in layer._layers) {
                            layer._layers[el].editing.enable();
                        }
                    } else if (geojson.geometry.type == 'Point') {
                       layer.options.draggable = true;
                    } else {
                       layer.editing.enable();
                    }
                }
            }
        });

        map.fitBounds(map.featureLayer.getBounds());

        if (show) {
            map.featureLayer.addTo(osmly.map);
            map.featureLayer.bringToFront();
        }
    };

    return map;
};
/* jshint multistr:true */
// common ui used by every mode
osmly.ui = (function() {
    var ui = {};

    ui.go = function() {
        setInterface();
        document.title = osmly.settings.title;
        $('#title').html(osmly.settings.title);
        $('#title, #top-bar').fadeIn(250);

        if (osmly.auth.authenticated()) {
            if (osmly.auth.userAllowed()) {
                ui.setUserDetails();
                osmly.mode.import();
            } else {
                setTimeout(osmly.auth.notAllowed, 500);
                // for dom
                $('#demo').fadeIn(250);
                setRegion();
            }
        } else {
            $('#login, #demo').fadeIn(250);
            setRegion();
        }

        if (!osmly.settings.demo) $('#demo').fadeOut(250);
        bind();
    };

    function setInterface() {
        $('body').append('\
            <div id="mode">\
                <div id="demo">Demonstration »</div>\
                <div id="login">Login with your OSM account »</div>\
            </div>\
        ');

        if (osmly.settings.writeApi.split('dev').length > 1) $('#login').text('Login with your OSM dev server account »');

        $('body').append('\
            <span id="title"></span>\
            <ul id="top-bar">\
                <a href="#instruction-modal">\
                    <li id="instruction" style="border-left: none;">Instructions</li>\
                </a>\
                <li id="overview">Overview</li>\
                <li id="qa" alt="Quality Assurance">QA</li>\
                <a href="#user-modal">\
                    <li id="user"></li>\
                </a>\
                <a href="#demo-modal">\
                    <li id="demo-mode">DEMO MODE</li>\
                </a>\
            </ul>\
            <div id="notify"></div>\
        ');

        $('body').append('\
            <div class="semantic-content" id="demo-modal" style="text-align: center;">\
                <div class="modal-inner">\
                    <header id="modal-label">\
                        <h2>Demo Mode</h2>\
                    </header>\
                    <div class="modal-content">\
                        <span>This is a read-only demo mode, nothing is uploaded or saved in any way.</span><br/><br/>\
                        <span>Feel free to click everything, edit, etc.. nothing bad can happen.</span><br/>\
                    </div>\
                </div>\
                <a href="#!" class="modal-close" title="Close this modal" data-close="Close" data-dismiss="modal"></a>\
            </div>\
            <div class="semantic-content" id="instruction-modal">\
                <div class="modal-inner">\
                    <header id="modal-label"><h2>Instructions</h2></header>\
                    <div class="modal-content">\
                    ' + osmly.settings.instructions + '\
                    </div>\
                </div>\
                <a href="#!" class="modal-close" title="Close this modal" data-close="Close" data-dismiss="modal"></a>\
            </div>\
            <div class="semantic-content" id="remote-edit-modal">\
                <div class="modal-inner">\
                    <div class="modal-content">\
                        <h2 style="margin-top: 50px; text-align: center;">Loading in JOSM...</h2>\
                        <h4 style="margin-bottom: 50px; text-align: center;">(don\'t forget to download the surrounding area)</h4>\
                        <hr/>\
                        <h4 style="margin-top: 25px;">When you\'re done:</h4>\
                        <h2 style="text-align: center; margin: 20px 0;">Did you upload the feature via JOSM?</h2>\
                        <div style="text-align: center; margin-bottom: 25px;">\
                            <button data-type="no" style="margin-left: 0;">No, not uploaded to OSM</button>\
                            <button data-type="yes">Yes, uploaded</button>\
                        </div>\
                    </div>\
                </div>\
                <a href="#!" class="modal-close" title="Close this modal" data-close="Close" data-dismiss="modal"></a>\
            </div>\
            <div class="semantic-content" id="reusable-modal">\
                <div class="modal-inner wide800">\
                    <header id="modal-label"></header>\
                    <div class="modal-content">\
                    </div>\
                </div>\
                <a href="#!" class="modal-close" title="Close this modal" data-close="Close" data-dismiss="modal"></a>\
            </div>\
            <div class="semantic-content" id="user-modal">\
                <div class="modal-inner">\
                    <div class="modal-content">\
                        <div id="logout" style="text-align: center; margin: 50px 0;">Logout »</div>\
                        <div id="changeset" style="display: none;">\
                            <hr style="margin-top: 50px;">\
                            <h2 style="margin-top: 50px;">Changeset</h2>\
                            <div id="changeset-form" contenteditable="true"></div>\
                            <span id="changeset-link"></span>\
                            <span id="update-change">update</span>\
                        </div>\
                    </div>\
                </div>\
                <a href="#!" class="modal-close" title="Close this modal" data-close="Close" data-dismiss="modal"></a>\
            </div>\
        ');
    }

    function setRegion() {
        if (!osmly.settings.region) return false;
        ui.region = L.geoJson(osmly.settings.region, {
            style: {
                color: '#fff',
                fill: false,
                clickable: false,
                weight: 3,
                opacity: 1
            }
        });

        osmly.map.fitBounds(ui.region.getBounds());

        ui.region.addTo(osmly.map);
        ui.region.bringToFront();
    }

    function bind() {
        $('#demo').on('click', demo);
        $('#login').on('click', login);
        $('#qa').one('click', osmly.mode.qa);
        $('#overview').on('click', osmly.mode.overview);
        $('#update-change').on('click', changeset);
        $('#remote-edit-modal').on('click', 'button', remoteEdit);
        $('#logout').on('click', function() {
            osmly.auth.logout();
            location.reload();
        });
    }

    function changeset() {
        osmly.settings.changesetTags.comment = $('#changeset-form').text();
        osmly.connect.updateComment(function(){
            CSSModal.close();
            $('#notify').hide();
        });
    }

    function remoteEdit() {
        console.log(this);
        if (this.getAttribute('data-type') == 'yes') {
            var id = this.getAttribute('data-id');

            if (osmly.auth.authenticated()) {
                if (osmly.auth.userAllowed()) {
                    osmly.connect.updateItem('submit', {submit: 'JOSM'}, function(){
                        CSSModal.close();
                        if (osmly.mode.now == 'import') {
                            osmly.import.skip();
                        } else {
                            osmly.overview.modalDone();
                        }
                    }, id);
                } else {
                    osmly.auth.notAllowed();
                }
            } else {
                CSSModal.close();
                osmly.ui.pleaseLogin();
            }
        } else {
            CSSModal.close();
        }
    }

    ui.pleaseLogin = function () {
        $('#reusable-modal .modal-content').html('<h3>Please login. It helps track your changes so other users don\'t edit the same feature.</h3>');
        // login button/link?
        CSSModal.open('reusable-modal');
    };

    ui.notify = function(string) {
        if (string !== '') string = '<span>' + string + '</span>';
        string = '<img src="dist/loader.gif" />' + string;

        $('#notify').html(string);
        $('#notify').show();
        // don't forget to hide #notify later
    };

    function login() {
        ui.notify('');
        osmly.auth.authenticate(function(err){
            if (err) { console.log('auth error'); return; }
            if (osmly.auth.userAllowed) {
                if (ui.region) osmly.map.removeLayer(ui.region);
                $('#login, #demo').fadeOut(250);
                CSSModal.open('instruction-modal');
                osmly.connect.getDetails();
                osmly.mode.import();
            } else {
                osmly.auth.notAllowed();
            }
        });
    }

    function demo() {
        if (ui.region) osmly.map.removeLayer(ui.region);
        $('#login, #demo').fadeOut(250);
        CSSModal.open('demo-modal');
        $('#demo-mode').show();
        osmly.mode.import();
    }

    ui.setUserDetails = function() {
        $('#user').html = '';
        if (token('avatar')) $('#user').append('<img height="25px" src="' + token('avatar') + '"/>');

        $('#user')
            .append('<span style="padding-left: 30px;">' + token('user') + '</span>')
            .fadeIn(250);

        if (osmly.auth.adminAllowed()) $('#qa').fadeIn(250);
    };

    return ui;
}());
// not sure how far to take this
// could make every mode extend methods like go, hide, show
    // not a fan, not enough modes to bother yet
    // naming is consistent enough to do this the dumb way
osmly.mode = (function() {
    var mode = {now: false, last:false};

    mode.set = function(theMode) {
        if (mode.now == theMode) return false;
        if (mode.now) osmly[mode.now].stop();
        osmly[theMode].go();
        change(theMode);
    };

    function change(changeTo) {
        mode.last = mode.now;
        mode.now = changeTo;
    }

    mode.import = function() { mode.set('import'); };
    mode.qa = function() { mode.set('qa'); };
    mode.overview = function() { mode.set('overview'); };
    mode.toLast = function() {
        if (mode.last) {
            mode.set(mode.last);
        } else {
            osmly[mode.now].stop();
            mode.now = false;
        }
    };
    // convenience

    return mode;
}());
osmly.connect = (function() {
    var connect = {};

    connect.updateItem = function(action, data, callback, id) {
        if (typeof data != 'object') data = {};
        id = id || osmly.import.id;

        var url = osmly.settings.db + '&id=' + id + '&action=' + action;

        data['user'] = token('user');

        if (action == 'submit') {
            checkItem(id, makeRequest);
        } else {
            makeRequest();
        }

        function makeRequest(skip) {
            if (skip && callback) {
                callback();
            } else {
                $.ajax({
                    url: url,
                    type: 'POST',
                    data: data,
                    dataType: 'json',
                    success: function() {
                        if (callback) callback();
                    }
                });
            }
        }
    };

    function checkItem(id, callback) {
        // checks the items again before uploading to OSM
        // in case more than one uses is working on the same item at the same time
        var url = osmly.settings.db + '&id=' + id + '&action=status';
        $.ajax({
            url: url,
            dataType: 'json',
            success: function(status) {
                if (status.status == 'ok') {
                    callback();
                } else {
                    callback('skip');
                }
            }
        });
    }

    connect.openChangeset = function(callback, forceCheck) {
        if (!token(osmly.settings.db + 'changeset_id')) {
            createChangeset(callback);
        } else {
            if (!forceCheck &&
                token(osmly.settings.db + 'changeset_created') &&
                (token(osmly.settings.db + 'changeset_created') - parseInt(new Date()/1000)) > -3500) {
                    callback();
            } else {
                osmly.ui.notify('checking changeset status');

                $.ajax({
                    url: osmly.settings.writeApi + '/api/0.6/changeset/' + token(osmly.settings.db + 'changeset_id'),
                    dataType: 'xml',
                    success: function(xml) {
                        var cs = xml.getElementsByTagName('changeset');
                        if (cs[0].getAttribute('open') === 'true') {
                            token(osmly.settings.db + 'changeset_created', parseInt(new Date()/1000));
                            if (callback) callback();
                        } else {
                            createChangeset(callback);
                        }
                    }
                });
            }
        }
    };

    function createChangeset(callback) {
        osmly.ui.notify('creating a new changeset');

        osmly.auth.xhr({
            method: 'PUT',
            path: '/api/0.6/changeset/create',
            content: newChangesetXml(),
            options: {header: {'Content-Type': 'text/xml'}}
        }, function(err, response){
            if (err) {
                // idk, something
                // notify('changeset creation failed, try again')?
            }

            if (response) {
                token(osmly.settings.db + 'changeset_id', response);
                token(osmly.settings.db + 'changeset_created', parseInt(new Date()/1000));
                callback();
            }
        });
    }

    function newChangesetXml() {
        var tags = '';
        for (var key in osmly.settings.changesetTags) {
            tags += '<tag k="' + key + '" v="' + osmly.settings.changesetTags[key] + '"/>';
        }
        tags += '<tag k="osmly:import" v="' + osmly.settings.db.split('?')[1].split('=')[1] + '"/>';
        return '<osm><changeset>' + tags + '<\/changeset><\/osm>';
    }

    connect.updateComment = function(callback) {
        connect.openChangeset(update);

        function update() {
            osmly.ui.notify('updating changeset');
            osmly.auth.xhr({
                method: 'PUT',
                path: '/api/0.6/changeset/' + token(osmly.settings.db + 'changeset_id'),
                content: newChangesetXml(),
                options: {header: {'Content-Type': 'text/xml'}}
            }, function(err, response){
                if (err) {
                    forceUpdate();
                } else {
                    callback();
                }
            });
        }

        function forceUpdate() {
            connect.openChangeset(update, true);
        }
    };

    connect.getDetails = function() {
        osmly.auth.xhr({
            method: 'GET',
            path: '/api/0.6/user/details'
        }, setDetails);
    };

    function setDetails(err, res) {
        if (err) {
            console.log('error! try clearing your browser cache');
            return;
        }
        var u = res.getElementsByTagName('user')[0];
        token('user', u.getAttribute('display_name'));
        if (u.getElementsByTagName('img')) token('avatar', u.getElementsByTagName('img')[0].getAttribute('href'));
        // there's more if needed
        // http://wiki.openstreetmap.org/wiki/API_v0.6#Details_of_the_logged-in_user
        osmly.ui.setUserDetails();
    }

    connect.editInJosm = function(id) {
        if (osmly.auth.authenticated()) {
            if (osmly.auth.userAllowed()) {
                var osm,
                    url = osmly.settings.db + '&id=' + id + '&action=remote';

                if (id === osmly.import.id) {
                    osm = toOsm(osmly.map.featureLayer.toGeoJSON());
                    connect.updateItem('remote', {remote: osm}, callback, id);
                } else {
                    $.ajax({
                        url: osmly.settings.db + '&id=' + id,
                        dataType: 'json',
                        success: function(geo) {
                            // should just use the same path as we use for the map

                            // from osmly.import.js, renameProperties()
                            for (var prop in osmly.settings.renameProperty) {
                                var change = osmly.settings.renameProperty[prop];
                                geo.properties[change] = geo.properties[prop];
                            }

                            // from osmly.import.js, usePropertiesAsTag()
                            for (var poop in geo.properties) {
                                if (osmly.settings.usePropertyAsTag.indexOf(poop) === -1) {
                                    geo.properties[poop] = null;
                                }
                            }

                            // from osmly.import.js, append()
                            for (var append in osmly.settings.appendTag) {
                                geo.properties[append] = osmly.settings.appendTag[append];
                            }

                            osm = toOsm(geo);
                            connect.updateItem('remote', {remote: osm}, callback, id);
                        }
                    });
                }
            } else {
                osmly.auth.notAllowed();
            }
        } else {
            osmly.ui.pleaseLogin();
            return false;
        }

        function callback() {
            $.ajax({
                url: 'http://127.0.0.1:8111/import?url=' + url,
                dataType: 'xml',
                error: function() {
                    $('#reusable-modal .modal-content').html('<h3>JOSM doesn\'t seem to be running. Start JOSM and try again.</h3>');
                    CSSModal.open('reusable-modal');
                },
                success: function() {
                    $('#remote-edit-modal button')[1].setAttribute('data-id', id);
                    CSSModal.open('remote-edit-modal');
                }
            });
        }
    };

    function toOsm(geojson) {
        return osm_geojson.geojson2osm(geojson);
    }

    return connect;
}());
/* jshint multistr:true */
osmly.import = (function() {
    var imp = {};

    imp.go = function(){
        setInterface();
        bind();
        next();
    };

    imp.stop = function() {
       unbind();
       unsetInterface();
    };

    function bind() {
        // bottom-right buttons
        $('#josm').on('click', josm);
        $('#reset').on('click', reset);
        $('#osmlink').on('click', function(){
            window.open(osmly.osmlink);
        });
        // botton-left buttons
        $('#skip').on('click', imp.skip);
        $('#problem').on('change', problem);
        $('#submit').on('click', submit);
        $('#add-new-tag').on('click', addTag);
        $('#tags').on('click', '.minus', function(){
            if ($('#tags tr').length > 1) this.parentNode.remove();
        });

        $('#osmtiles').on('click', function(){
            $('#tags').toggle();
            $('#action-block').toggle();
            osmly.map.toggleLayer(osmly.map.osmTiles);
            osmly.map.toggleLayer(osmly.map.contextLayer);
            osmly.map.toggleLayer(osmly.map.featureLayer);
        });

        $(document).on('click', '.merge', function(){
            // not sure why I can't do $('li').on...
            imp.mergeTags = JSON.parse(this.getAttribute('data-tags'));
            imp.mergeLayer = this.getAttribute('data-layer-id');
            var conflicts = compareTags(imp.mergeTags);
            if (conflicts) {
                conflictModal(conflicts);
            } else {
                merge();
            }
        });

        $('#reusable-modal').on('click', 'button', function(){
            $('[data-tag="' + this.getAttribute('data-tag') +'"]').removeAttr('style');
            $('[data-tag="' + this.getAttribute('data-tag') +'"]').removeAttr('data-selected');
            this.setAttribute('style', 'background: #7EEE7A');
            this.setAttribute('data-selected', 'true');
        });

        $('#reusable-modal').on('click', '#merge', function() {
            // turn the selected buttons into tags
            var selected = $('[data-selected]');
            if (selected.length == this.getAttribute('data-count')) {
                for (var a = 0; a < selected.length; a++) {
                    imp.mergeTags[selected[a].getAttribute('data-tag')] = selected[a].textContent;
                }
            }
            merge();
        });
    }

    function unbind() {
        $('#skip, #problem, #submit').off();
        $('#josm, #reset, #osmlink, #osmtiles').off();
        $('#add-new-tag, #tags').off();
    }

    function setInterface() {
        var body = $('body');
        body.append('\
            <div id="tags">\
                <table>\
                    <tbody></tbody>\
                </table>\
                <span class="k" id="add-new-tag" alt="Add a new tag">+</span>\
            </div>\
        ');

        body.append('\
            <div id="action-block">\
                <li id="hold-problem" style="margin-left: 0;">\
                    <select name="problem" id="problem">\
                        <option value="problem" disabled selected>Problem</option>\
                    </select>\
                </li>\
                <li id="skip">Skip</li>\
                <li id="submit">Submit</li>\
            </div>\
        ');

        var problem = $('#problem');
        for (var p = 0; p < osmly.settings.problems.length; p++) {
            problem.append('<option value="'+[p]+'">'+osmly.settings.problems[p]+'</option>');
        }

        body.append('\
            <ul id="bottom-right">\
                <li id="reset">reset</li>\
                <li id="josm">edit in JOSM</li>\
                <li id="osmtiles">see OSM map</li>\
                <li id="osmlink" style="border-bottom: none;">open at osm.org</li>\
            </ul>\
        ');

        body.append('\
            <div id="flash">\
                <div style="position: relative">\
                    <img class="problem hidden flash" src="dist/problem.svg" />\
                    <img class="right-arrow hidden flash" src="dist/right-arrow.svg" />\
                    <img class="up-arrow hidden flash" src="dist/up-arrow.svg" />\
                </div>\
            </div>\
        ');
    }

    function unsetInterface() {
        $('#tags, #action-block, #bottom-right, #flash').remove();
        osmly.map.closePopup();
        if (osmly.map.hasLayer(osmly.map.featureLayer)) osmly.map.removeLayer(osmly.map.featureLayer);
        if (osmly.map.hasLayer(osmly.map.contextLayer)) osmly.map.removeLayer(osmly.map.contextLayer);
    }

    function displayItem() {
        osmly.map.addLayer(osmly.map.featureLayer);
        osmly.map.addLayer(osmly.map.contextLayer);

        $('#notify').hide();
        $('#hold-problem, #submit, #bottom-right, #action-block').fadeIn(200);
        
        if (imp.isEditable) {
            $('#tags').fadeIn(200);
        } else {
            $('#hold-problem, #submit').hide();
            $('#reusable-modal .modal-content').html(
                '<h3>This feature is too complex. <a>Edit it in JOSM?</a></h3>');
            // put an 'Edit in JOSM' button right there
                // when clicked close the modal and let the other modal open
            // literally bind, $('#josm').click()
            CSSModal.open('reusable-modal');
        }
    }

    function populateTags(tags) {
        $('#tags tr').remove();
        for (var tag in tags) {
            if (tags[tag] !== null && tags[tag] !== 'null') {
                $('#tags tbody').append(
                    '<tr>' +
                    '<td class="k" spellcheck="false" contenteditable="true">' +
                    tag + '</td>' +
                    '<td class="v" spellcheck="false" contenteditable="true">' +
                    tags[tag] + '</td>' +
                    '<td class="minus">-</td>' +
                    '</tr>');
            }
        }
    }

    function hideItem(callback) {
        $('#bottom-right, #action-block, #tags').hide();
        if (callback) callback();
        osmly.map.closePopup();
        if (osmly.map.featureLayer) osmly.map.removeLayer(osmly.map.featureLayer);
        osmly.map.removeLayer(osmly.map.contextLayer);
    }

    imp.skip = function() {
        imp.deleted = [];
        hideItem();
        leftToRight($('.right-arrow'));
        next();
    };

    function submit() {
        hideItem();
        if (osmly.auth.authenticated() && osmly.auth.userAllowed()) {
            osmly.connect.updateItem('submit');
            osmly.connect.openChangeset(submitToOSM);
        } else {
            $('#tags tr').remove();
            next();
        }
        bigUp($('.up-arrow'));
    }

    function problem() {
        hideItem();

        if (osmly.auth.authenticated() && osmly.auth.userAllowed()) {
            var pro = parseInt($('#problem').val()) + 1;
            osmly.connect.updateItem('problem', {
                problem: $('#problem option')[pro].text
            });
        }
        $('.problem').show(function(){
            setTimeout(function(){
                $('.problem').fadeOut(250);
            }, 250);
        });
        $('#problem').val('problem');
        $('#tags tr').remove();
        next();
    }

    function josm() {
        $('#reset').trigger('click');
        osmly.connect.editInJosm(imp.id);
    }

    function reset() {
        $('#tags tr').remove();
        hideItem();
        osmly.map.setFeature(imp.data, imp.isEditable);
        populateTags(imp.data.properties);
        imp.deleted = [];
        displayItem();
    }

    function addTag() {
        $('#tags tbody').append('\
            <tr>\
            <td class="k" spellcheck="false" contenteditable="true"></td>\
            <td class="v" spellcheck="false" contenteditable="true"></td>\
            <td class="minus">-</td>\
            </tr>\
        ');
    }

    function next() {
        if (osmly.map.hasLayer(osmly.map.featureLayer))
            osmly.map.removeLayer(osmly.map.featureLayer);

        osmly.ui.notify('getting next item');

        $.ajax({
            url: osmly.settings.db,
            dataType: 'json',
            success: function(data) {
                if (data) nextPrep(data);
                else none();
            }
        });
    }

    function nextPrep(data) {
        data = JSON.parse(data);
        imp.data = data;
        imp.id = imp.data.properties.id;
        imp.bbox = imp.data.properties.bounds;
        imp.isEditable = isEditable(imp.data.geometry);
        osmly.map.setFeature(imp.data, imp.isEditable);
        imp.prepTags();

        if (imp.isEditable) {
            osmly.map.context(imp.bbox, 0.001, function() {
                populateTags(imp.data.properties);
                displayItem();
            });
        } else {
            populateTags(imp.data.properties);
            displayItem();
        }
    }

    function none() {
        $('#notify').hide();
        $('#reusable-modal .modal-content').html('<h3>Nothing left, checkout Overview.</h3>');
        CSSModal.open('reusable-modal');
    }

    function isEditable(geo) {
        // checks if the feature has holes, leaflet can't edit them
        if (geo.type == 'Polygon' && geo.coordinates.length > 1) return false;

        if (geo.type == 'MultiPolygon') {
            for (var a = 0, b = geo.coordinates.length; a < b; a += 1) {
                if (geo.coordinates[a].length > 1) return false;
            }
        }
        return true;
    }

    imp.prepTags = function(tags) {
        // this needs to be used for editInJosm in .connect
        // bound to data.properties right now
        renameProperties();
        usePropertiesAsTag();
        appendTags();
    };

    function renameProperties() {
        // converts the feature key, doesn't remove old one
        // ex. NAME -> name, CAT2 -> leisure
        for (var prop in osmly.settings.renameProperty) {
            var change = osmly.settings.renameProperty[prop];
            imp.data.properties[change] = imp.data.properties[prop];
        }
    }

    function usePropertiesAsTag() {
        // filters properties to be used as tags
        for (var prop in imp.data.properties) {
            if (osmly.settings.usePropertyAsTag.indexOf(prop) === -1) {
                imp.data.properties[prop] = null;
            }
        }
    }

    function appendTags() {
        for (var append in osmly.settings.appendTag) {
            imp.data.properties[append] = osmly.settings.appendTag[append];
        }
    }

    imp.tags = function(){
        var tgs = byId('tags'),
            trs = tgs.getElementsByTagName('tr'),
            tags = {};

        for (var a=0; a < trs.length; a++) {
            // 0 = key, 1 = value, 2 = minus
            var tds = trs[a].getElementsByTagName('td');
            if (tds[0].innerHTML !== '' && tds[1].innerHTML !== '') {
                tags[tds[0].innerHTML] = tds[1].innerHTML;
            }
        }

        return tags;
    };

    function submitToOSM() {
        var id = token(osmly.settings.db + 'changeset_id');

        $('#changeset-link').html('<a href="' + osmly.settings.writeApi +
            '/browse/changeset/' + id + '" target="_blank">Details on osm.org »</a>');
        $('#changeset').show();

        var geojson = osmly.map.featureLayer.toGeoJSON();
        geojson['features'][0]['properties'] = discardTags();
        var osmChange = osm_geojson.geojson2osm(geojson, token(osmly.settings.db + 'changeset_id'));
        osmChange = osmChange.split('<osm version="0.6" generator="github.com/aaronlidman/osm-and-geojson">')
            .join('<osmChange version="0.6" generator="OSMLY"><create>');
        osmChange = osmChange.split('</osm>')
            .join('');
        osmChange += '</create>';
        osmChange += buildDelete();
        osmChange += '</osmChange>';

        osmly.ui.notify('uploading to OSM');

        osmly.auth.xhr({
            method: 'POST',
            path: '/api/0.6/changeset/' + id + '/upload',
            content: osmChange,
            options: {header: {'Content-Type': 'text/xml'}}
        }, postOSM);
    }

    function discardTags() {
        var tags = osmly.import.tags();
        for (var tag in tags) {
            for (var a = 0; a < osmly.settings.discardTags.length; a++) {
                if (osmly.settings.discardTags[a] == tag) delete tags[tag];
            }
        }
        return tags;
    }

    function postOSM(err, res) {
        if (res && !err) {
            // do some kind of special green checkmark
        } else {
            osmly.connect.openChangeset(submitToOSM, true);
        }
        $('#tags tr').remove();
        next();
    }

    function compareTags(tags) {
        var conflicts = {},
            count = 0,
            importTags = osmly.import.tags();
        for (var tag in tags) {
            if (importTags[tag] && (importTags[tag] != tags[tag])) {
                conflicts[tag] = tags[tag];
                count++;
            }
        }
        if (count) return conflicts;
        return false;
    }

    function conflictModal(conflicts) {
        $('#reusable-modal #modal-label').html('<h2>Tag Conflict</h2>');

        var html = '',
            importTags = osmly.import.tags(),
            count = 0;

        for (var conflict in conflicts) {
            html += '<div class="conflict">' +
                '\'' + conflict + '\' is ' +
                '<button class="eee" data-tag="' + conflict + '" data-source="import">' + importTags[conflict] + '</button> or ' +
                '<button class="eee" data-tag="' + conflict + '" data-source="osm">' + conflicts[conflict] + '</button> ?' +
                '</div>';
            count++;
        }

        html += '<span id="merge" data-count="' + count + '" style="cursor: pointer; font-weight: bold;">Merge</span>';

        $('#reusable-modal .modal-content').html(html);
        CSSModal.open('reusable-modal');
    }

    function merge() {
        var tags = {};
        if (!imp.deleted) imp.deleted = [];
        imp.deleted.push(imp.mergeTags.osm_id);

        for (var tag in imp.mergeTags) {
            if (tag.split('osm_').length === 1) {
                tags[tag] = imp.mergeTags[tag];
            }
        }
        populateTags(tags);
        CSSModal.close();
        osmly.map.eachLayer(function(layer) {
            if (typeof layer.feature !== 'undefined' &&
                typeof layer.feature.properties !== 'undefined' &&
                typeof layer.feature.properties._id !== 'undefined' &&
                layer.feature.properties._id == parseInt(imp.mergeLayer) ) {
                    osmly.map.removeLayer(layer);
            }
        });
    }

    function buildDelete() {
        if (!('deleted' in imp) || !imp.deleted.length) return '';
        if (osmly.settings.writeApi.split('dev').length > 1) return '';
        var xml = '<delete if-unused="true">',
            s = new XMLSerializer();
        for (var id in imp.deleted) {
            var element = osmly.map.osmContext.getElementById(imp.deleted[id]);
            element.setAttribute('changeset', token(osmly.settings.db + 'changeset_id'));
            xml += s.serializeToString(element);
        }
        xml = xml.split('\t').join('');
        xml = xml.split('\n').join('');
        return xml + '</delete>';
    }

    imp.bindContextNodes = function() {
        var layers = osmly.map.contextLayer._map._layers;
        for (var layer in layers) {
            layer = layers[layer];
            if (layer._icon && layer.options.opacity && layer.options.opacity === 1) {
                console.log('bound');
                layer.on('mouseover', function() {
                    // do whatever
                    console.log('sticky door');
                });
            }
        }
        // need to make context nodes some kind of markers
    };

    return imp;
}());
/* jshint multistr:true */
osmly.overview = (function () {
    var overview = {},
        ov = {};

    overview.go = function() {
        setInterface();
        $('#overview_bg, #overview-controls, #overview_block').fadeIn(250);
        refresh();
        bind();
    };

    overview.stop = function() {
        ov.data = null;
        ov.rawData = null;
        $('#markdone, #overview_block, #overview_bg, #overview-controls').remove();
        unbind();
    };

    function setInterface() {
        $('body').append('\
            <div class="semantic-content" id="markdone-modal">\
                <div class="modal-inner wide800">\
                    <div class="modal-content">\
                        <h2 style="margin: 20px 0; text-align: center;">Are you sure? Please use with caution.</h2>\
                        <h2 style="margin: 20px 0; text-align: center;"> This will prevent other users from editing this feature.</h2>\
                        <div style="width: 100%; text-align: center;">\
                            <button data-type="no" style="margin-left: 0;">No, don\'t mark it as done</button>\
                            <button data-type="yes">Yes, mark it as done</button>\
                        </div>\
                    </div>\
                </div>\
                <a href="#!" class="modal-close" title="Close this modal" data-close="Close" data-dismiss="modal"></a>\
            </div>\
            <div id="overview_bg"></div>\
            <div id="overview_block">\
                <table id="main_table" class="table">\
                    <thead>\
                        <tr>\
                            <th>#</th>\
                            <th>Problem</th>\
                            <th>Uploaded</th>\
                            <th>User</th>\
                            <th>Mark as Done</th>\
                            <th>Edit in JOSM</th>\
                        </tr>\
                    </thead>\
                </table>\
            </div>\
            <div id="overview-controls">\
                <span id="count"></span>\
                <input type="radio" name="filter" value="everything" id="everything" checked>\
                    <label for="everything"> everything</label><br>\
                <input type="radio" name="filter" value="red" id="red">\
                    <label for="red"> problems (red)</label><br>\
                <input type="radio" name="filter" value="green" id="green">\
                    <label for="green"> done (green)</label><br>\
                <input type="radio" name="filter" value="users" id="users">\
                    <label for="users"> user: </label>\
                    <select id="users-select"></select><br>\
                <input type="radio" name="filter" value="problems" id="problems">\
                    <label for="problems"> problem: </label>\
                    <select id="problems-select"></select><br>\
            </div>\
        ');
    }

    function unsetInterface() {
        $('#markdone-modal, #overview_bg, #overview_block, #overview-controls').remove();
    }

    function bind() {
        $('#main_table').on('click', '.editjosm', function(){
            osmly.connect.editInJosm(this.getAttribute('data-id'));
        });

        $('#main_table').on('click', '.markdone', function(){
            if (osmly.auth.authenticated()) {
                if (osmly.auth.userAllowed()) {
                    $('#markdone-modal button')[1].setAttribute('data-id', this.getAttribute('data-id'));
                    CSSModal.open('markdone-modal');
                } else {
                    osmly.auth.notAllowed();
                }
            } else {
                osmly.ui.pleaseLogin();
            }
        });

        $('#overview_bg').on('click', osmly.mode.toLast);

        $('#everything').on('click', everything);
        $('#red').on('click', red);
        $('#green').on('click', green);
        $('#users').on('click', function(){ drop_selection('users-select'); });

        $('#users-select').on('change', function(){ drop_selection('users-select'); });
        $('#problems').on('click', function(){ drop_selection('problems-select'); });
        $('#problems-select').on('change', function(){ drop_selection('problems-select'); });
        $('#markdone-modal').on('click', 'button', markDone);
    }

    function unbind() {
        $('#main_table').off();
        $('#overview_bg').off();
        $('#everything').off();
        $('#red').off();
        $('#green').off();
        $('#users').off();
        $('#users-select').off();
        $('#problems').off();
        $('#problems-select').off();
        $('#markdone-modal').off();
    }

    function buildTable(callback) {
        // will probably need to paginate over ~1000 items
            // right now it's pretty quick w/ 1200 on chrome
            // firefox is a bit slow

        var items = ov.data,
            table = byId('main_table');

        if (table.getElementsByTagName('tbody').length) {
            table.removeChild(table.getElementsByTagName('tbody')[0]);
        }

        var tbody = createE('tbody');

        for (var a = 0; a < items.length; a++) {
            var tr = createE('tr');
            for (var b in items[a]) {
                var column = createE('td'),
                    text = items[a][b];

                if (b == 'submit' && text !== '') text = '&#x2713;';
                if (b == 'name') {
                    column.style.textAlign = 'left';
                    column.style.textOverflow = 'ellipsis';
                    column.style.width = '200px';
                    column.whiteSpace = 'nowrap';
                    column.overflow = 'hidden';
                }

                column.innerHTML = text;
                tr.appendChild(column);
            }

            var markdone = createE('td');
            if (items[a]['submit'] === '') {
                markdone.innerHTML = '<span data-id="' + items[a]['id'] + '" class="markdone">done?</span>';
            }
            tr.appendChild(markdone);

            var editjosm = createE('td');
            if (items[a]['submit'] === '') {
                editjosm.innerHTML = '<span data-id="' + items[a]['id'] + '" class="editjosm">JOSM?</span>';
            }
            tr.appendChild(editjosm);

            if (items[a]['submit'] !== '') {
                tr.setAttribute('class', 'success');
            } else if (items[a]['problem'] !== '') {
                tr.setAttribute('class', 'error');
            }

            tbody.appendChild(tr);
            table.appendChild(tbody);
        }
        $('#notify').hide();
        update_row_count();
        if (callback) callback();
    }

    function request(callback) {
        $.ajax({
            url: osmly.settings.db + '&overview',
            cache: false,
            dataType: 'json',
            success: function(items){
                ov.data = items;
                ov.rawData = items;
                if (callback) callback();
            }
        });
    }

    function refresh(callback) {
        osmly.ui.notify('Loading...');
        request(function() {
            buildTable(callback);
            problem_selection();
            user_selection();
        });
    }

    function filter(options) {
        // {'problem': 1, 'user': 'Joe Fake Name'}
        // also takes values as a list of multiple possible values
            // {'problem': ['no_park', 'bad_imagery', 'you_ugly']}
            // or even better: {'problem': unique('problem')}
        // if multiple keys are provided a value from each key must be true

        var items = ov.rawData,
            optionslength = Object.keys(options).length,
            out = [];

        for (var a = 0; a < items.length; a++) {
            var keep = [];
            for (var option in options) {
                if (typeof options[option] == 'object') {
                    if (options[option].indexOf(items[a][option]) !== -1) {
                        keep.push(true);
                    }
                } else if (items[a][option] == options[option]) {
                    keep.push(true);
                }
            }
            if (keep.length === optionslength) {
                out.push(items[a]);
            }
        }
        ov.data = out;
    }

    function unique(column) {
        // lists unique values for a given column
        // probably only useful for 'problem' and 'user'
        
        var items = ov.rawData,
            vals = [];

        for (var a = 0; a < items.length; a++) {
            if (items[a][column] && vals.indexOf(items[a][column]) === -1) {
                vals.push(items[a][column]);
            }
        }

        return vals;
    }

    function problem_selection() {
        var problems = unique('problem'),
            html = '';

        for (var a = 0; a < problems.length; a++) {
            html += '<option value="problem:' + problems[a] + '">' + problems[a] + '</option>';
        }
        byId('problems-select').innerHTML = html;
    }

    function user_selection() {
        var user = unique('user'),
            html = '';

        for (var a = 0; a < user.length; a++) {
            html += '<option value="user:' + user[a] +'">' + user[a] + '</option>';
        }
        byId('users-select').innerHTML = html;
    }

    function changeRadio(value) {
        var inputs = byId('overview-controls').getElementsByTagName('input');

        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i].type === 'radio') {
                if (inputs[i].value == value) {
                    inputs[i].checked = true;
                } else {
                    inputs[i].checked = false;
                }
            }
        }
    }

    function everything() {
        ov.data = ov.rawData;
        buildTable();
    }

    function red() {
        filter({
            'problem': unique('problem'),
            'submit': ''
        });
        changeRadio('red');
        buildTable();
    }

    function green() {
        filter({'submit': unique('submit')});
        changeRadio('green');
        buildTable();
    }

    function drop_selection(select) {
        var selector = byId(select),
            value,
            dict = {};
        
        if (selector.options[selector.selectedIndex]) {
            value = selector.options[selector.selectedIndex].value;
            value = value.split(':');
            dict[value[0]] = value[1];
                // dict is necessary because literal value = {value[0]: value[1]} didn't work
                    // why doesn't that work?
            if (value[0] == 'problem') dict['submit'] = '';
                // only want un-submitted problems, not strictly true but more useful
        } else {
            dict = {problem: '-1'};
        }

        filter(dict);
        buildTable();
        changeRadio(select.split('-')[0]);
    }

    function update_row_count() {
        if (ov.data.length === ov.rawData.length) {
            byId('count').innerHTML = ov.data.length;
        } else {
            byId('count').innerHTML = ov.data.length.toString() + '<span>/' + ov.rawData.length + '</span>';
        }
    }

    function markDone() {
        if (this.getAttribute('data-type') == 'yes') {
            osmly.connect.updateItem('submit', {submit: 'Mark as Done'}, function(){
                osmly.overview.modalDone(function(){
                    CSSModal.close();
                });
            }, this.getAttribute('data-id'));
        } else {
            CSSModal.close();
        }
    }

    overview.modalDone = function(callback) {
        changeRadio('everything');
        refresh(callback);
    };

    return overview;
}());
/* jshint multistr:true */
osmly.qa = (function () {
    var qa = {live: false},
        data = {};

    qa.go = function(){
        setInterface();
        next();
    };

    qa.stop = function() {
        reset();
        unsetInterface();
    };

    function setInterface() {
        byId('qa').innerHTML = 'Leave QA';
        byId('qa').style.backgroundColor = 'black';
        byId('qa').style.color = 'white';
        $('#qa').one('click', osmly.mode.import);

        var body = byTag('body')[0],
            qablock = createId('div', 'qa-block');
        body.appendChild(qablock);

        var report = createId('div', 'report');
        qablock.appendChild(report);

        var layerz = createId('div', 'toggleLayers');
        qablock.appendChild(layerz);
        layerz.innerHTML = '[w] see original feature';

        var skip = createId('div', 'qa-skip');
        qablock.appendChild(skip);
        skip.innerHTML = '[s] skip';

        var confirmz = createId('div', 'confirm');
        qablock.appendChild(confirmz);
        confirmz.innerHTML = 'confirm';

        $('body').append('\
            <ul id="bottom-right">\
                <li id="osmtiles">see OSM map</li>\
                <li id="osmlink" style="border-bottom: none;">open at osm.org</li>\
            </ul>\
        ');
    }

    function bind() {
        $('#toggleLayers').on('click', toggleLayers);
        $('#qa-skip').one('click', next);
        $('#confirm').on('click', confirm);
        $('#osmlink').on('click', function(){
            window.open(osmly.osmlink);
        });
        $('#osmtiles').on('click', function(){
            osmly.map.toggleLayer(osmly.map.osmTiles);
        });

        $('body').on('keydown', function(k){
            if (k.keyCode === 87) toggleLayers(); //w
            if (k.keyCode === 83) next(); //s
        });
    }

    function unbind() {
        $('#toggleLayers, #qa-skip, #confirm').off();
        $('body').off('keydown');
        $('#osmlink, #osmtiles').off();
    }

    function unsetInterface() {
        var qa = byId('qa');
        qa.innerHTML = 'QA';
        qa.style.backgroundColor = 'white';
        qa.style.color = 'black';
        $('#qa').one('click', osmly.mode.qa);

        $('#qa-block, #bottom-right').remove();
    }

    function request(callback) {
        $.ajax({
            url: osmly.settings.db + '&qa',
            cache: false,
            dataType: 'json',
            success: function(item){
                if (!item) return none();
                data = {
                    id: item[0],
                    geo: JSON.parse(item[1]),
                    problem: item[2],
                    submit: item[3],
                    user: item[4],
                    time: item[5],
                };

                if (data.geo.properties.name) data.name = data.geo.properties.name;
                if (callback) callback();
            }
        });
    }

    function fillReport() {
        var table = createE('table'),
            report = byId('report');
        if (report.getElementsByTagName('table').length) {
            report.removeChild(report.childNodes[0]);
        }
        var tbody = createE('tbody');

        // columns = 'id, geo, problem, submit, user, time'
        for (var item in data) {
            var tr = createE('tr');
            if (item == 'id') tr.innerHTML = '<td>id</td><td>' + data.id + '</td>';
            if (item == 'user') tr.innerHTML = '<td>who</td><td>' + data.user + '</td>';
            if (item == 'time') tr.innerHTML = '<td>when</td><td class="timeago" title="' + data.time + '">' + data.time + '</td>';
            if (item == 'problem' && data.problem !== '') tr.innerHTML = '<td>problem</td><td class="k">' + data.problem + '</td>';
            if (item == 'submit' && data.submit != 1){
                tr.innerHTML = '<td>via</td><td>' + data.submit + '</td>';
            }
            if (item == 'name') tr.innerHTML = '<td>name</td><td>' + data.name + '</td>';
            if (tr.innerHTML !== '') tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        report.appendChild(table);
        timeAgo();
    }

    function next() {
        reset();
        request(function(){
            fillReport();
            setGeometry();
            setContext();
        });
    }

    function none() {
        $('#reusable-modal .modal-content').html('<h3>Nothing to check right now</h3>');
        CSSModal.open('reusable-modal');
    }

    function reset() {
        unbind();
        if (osmly.map.hasLayer(osmly.map.contextLayer)) osmly.map.removeLayer(osmly.map.contextLayer);
        if (osmly.map.hasLayer(osmly.map.featureLayer)) osmly.map.removeLayer(osmly.map.featureLayer);
        byId('toggleLayers').innerHTML = '[w] see original feature';
        $('#qa-block, #bottom-right').hide();
    }

    function setContext() {
        var bounds = data.geo.properties.bounds;

        osmly.map.fitBounds([
            [bounds[1], bounds[0]],
            [bounds[3], bounds[2]]
        ]);

        osmly.map.context(bounds, 0.002, show);

    }

    function show() {
        osmly.map.removeLayer(osmly.map.featureLayer);
        $('#qa-block, #bottom-right').fadeIn(250);
        $('#notify').hide();
        bind();
    }

    function setGeometry() {
        osmly.map.setFeature(data.geo, false, true);
    }

    function confirm() {
        osmly.connect.updateItem('confirm', false, false, data.id);
        next();
    }

    function toggleLayers() {
        if (osmly.map.hasLayer(osmly.map.featureLayer)) {
            byId('toggleLayers').innerHTML = '[w] see original feature';
            osmly.map.removeLayer(osmly.map.featureLayer);
            osmly.map.addLayer(osmly.map.contextLayer);
        } else {
            byId('toggleLayers').innerHTML = '[w] see OSM data';
            osmly.map.removeLayer(osmly.map.contextLayer);
            osmly.map.addLayer(osmly.map.featureLayer);
        }
    }

    return qa;
}());
function keyclean(x) { return x.replace(/\W/g, ''); }
// both of these are from iD
function token(k, x) {
    if (arguments.length === 2) {
        localStorage[keyclean(osmly.settings.writeApi) + k] = x;
    }
    return localStorage[keyclean(osmly.settings.writeApi) + k];
}

function byId(id) {return document.getElementById(id);}
function byTag(tag) {return document.getElementsByTagName(tag);}
function createE(element) {return document.createElement(element);}
function createId(element, id) {
    var elm = createE(element);
    elm.setAttribute('id', id);
    return elm;
}

// https://coderwall.com/p/uub3pw
function timeAgo(selector) {

    var templates = {
        prefix: "",
        suffix: " ago",
        seconds: "less than a minute",
        minute: "about a minute",
        minutes: "%d minutes",
        hour: "about an hour",
        hours: "about %d hours",
        day: "a day",
        days: "%d days",
        month: "about a month",
        months: "%d months",
        year: "about a year",
        years: "%d years"
    };
    var template = function (t, n) {
        return templates[t] && templates[t].replace(/%d/i, Math.abs(Math.round(n)));
    };

    var timer = function (time) {
        if (!time) return;
        time = time.replace(/\.\d+/, ""); // remove milliseconds
        time = time.replace(/-/, "/").replace(/-/, "/");
        time = time.replace(/T/, " ").replace(/Z/, " UTC");
        time = time.replace(/([\+\-]\d\d)\:?(\d\d)/, " $1$2"); // -04:00 -> -0400
        time = new Date(time * 1000 || time);

        var now = new Date();
        var seconds = ((now.getTime() - time) * 0.001) >> 0;
        var minutes = seconds / 60;
        var hours = minutes / 60;
        var days = hours / 24;
        var years = days / 365;

        return templates.prefix + (
        seconds < 45 && template('seconds', seconds) || seconds < 90 && template('minute', 1) || minutes < 45 && template('minutes', minutes) || minutes < 90 && template('hour', 1) || hours < 24 && template('hours', hours) || hours < 42 && template('day', 1) || days < 30 && template('days', days) || days < 45 && template('month', 1) || days < 365 && template('months', days / 30) || years < 1.5 && template('year', 1) || template('years', years)) + templates.suffix;
    };

    var elements = document.getElementsByClassName('timeago');
    for (var i in elements) {
        var $this = elements[i];
        if (typeof $this === 'object') {
            $this.innerHTML = timer($this.getAttribute('title') || $this.getAttribute('datetime'));
        }
    }
}
// animations are done in css because I counldn't find a decent lib
// that did chaining without stuttering
function leftToRight(element) {
    $(element).on(
        'animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd',
        function() {
            element.hide();
            element.removeClass('fadeLefttoRight');
    });
    element.show();
    element.addClass('fadeLefttoRight');
}

function bigUp(element) {
    $(element).on(
        'animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd',
        function() {
            element.hide();
            element.removeClass('fadeInUpBig');
        }
    );
    element.show();
    element.addClass('fadeInUpBig');
}
