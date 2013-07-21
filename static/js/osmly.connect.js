osmly.connect = (function(){
    var connect = {};

    connect.submitToServer = function(result) {
        var url = osmly.settings.featuresApi + 'db=' + osmly.settings.db +
            '&id=' + osmly.item.id + '&action=problem';
        $.ajax({
            type: 'POST',
            url: url,
            crossDomain: true,
            data: {problem: result, user: osmly.user.name}
        });
        // no callback, not worth slowing down/complicating over, it's reproducable
    };

    connect.openChangeset = function(id, callback) {
        if (!id){createChangeset(callback);}
        osmly.ui.notify('checking changeset status');

        $.ajax({
            url: osmly.settings.writeApi + '/api/0.6/changeset/' + id,
            cache: false
        }).done(function(xml) {
            var cs = xml.getElementsByTagName('changeset');
            if (cs[0].getAttribute('open') === 'true') {
                callback();
            } else {
                createChangeset(callback);
            }
        });
    };

    function createChangeset(callback) {
        var url = osmly.settings.writeApi + '/api/0.6/changeset/create',
            token_secret = osmly.token('secret'),
            change = newChangesetXml();

        osmly.ui.notify('creating a new changeset');
        o.oauth_timestamp = ohauth.timestamp();
        o.oauth_nonce = ohauth.nonce();
        o.oauth_token = osmly.token('token');
        o.oauth_signature = ohauth.signature(osmly.settings.oauth_secret, token_secret,
            ohauth.baseString('PUT', url, o));

        ohauth.xhr('PUT', url, o, change, {header: {'Content-Type': 'text/xml'}},
            function(xhr) {
                var id = xhr.response + '';
                osmly.token('changeset_id', id);
                callback();
            });
    }

    function newChangesetXml() {
        var tags = '';
        for (var c = 0; i < osmly.settings.changesetTags.length; c++) {
            tags +=
                '<tag k="' + osmly.settings.changesetTags[c][0] +
                '" v="' + osmly.settings.changesetTags[c][1] + '"/>';
        }
        return '<osm><changeset>' + tags + '<\/changeset><\/osm>';
    }

    function submitToOSM() {
        var id = osmly.token('changeset_id');
        $('#changeset').fadeIn(500);
        $('#changeset-link')
            .html('<a href="' + osmly.settings.writeApi + '/browse/changeset/' +
                id + '" target="_blank">Details on osm.org »</a>');

        var url = osmly.settings.writeApi + '/api/0.6/changeset/' + id + '/upload',
            token_secret = osmly.token('secret'),
            geojson = osmly.item.layer.toGeoJSON(),
            osmChange = toOsmChange(geojson);

        osmly.ui.notify('uploading to OSM');
        o.oauth_timestamp = ohauth.timestamp();
        o.oauth_nonce = ohauth.nonce();
        o.oauth_token = osmly.token('token');

        o.oauth_signature = ohauth.signature(osmly.settings.oauth_secret, token_secret,
            ohauth.baseString('POST', url, o));

        ohauth.xhr('POST', url, o, osmChange, {header: {'Content-Type': 'text/xml'}},
            function() {
                osmly.item.next();
            });
    }

    function toOsmChange(geojson) {
        return '<osmChange version="0.6" generator="osmly"><create>' +
            innerOsm(geojson) + '</create></osmChange>';
    }

    connect.request_oauth = function() {
        var url = osmly.settings.writeApi + '/oauth/request_token';

        // https://github.com/systemed/iD/blob/master/js/id/oauth.js#L72
        var w = 650, h = 500,
        settings = [
            ['width', w], ['height', h],
            ['left', screen.width / 2 - w / 2],
            ['top', screen.height / 2 - h / 2]].map(function(x) {
                return x.join('=');
            }).join(','),
        popup = window.open('about:blank', 'oauth_window', settings),
        locationCheck = window.setInterval(function() {
            if (popup.closed) return window.clearInterval(locationCheck);
            if (popup.location.search) {
                var search = popup.location.search,
                oauth_token = ohauth.stringQs(search.slice(1));
                popup.close();
                access_oauth(oauth_token);
                window.clearInterval(locationCheck);
            }
        }, 100);

        osmly.o.oauth_timestamp = ohauth.timestamp();
        osmly.o.oauth_nonce = ohauth.nonce();
        osmly.o.oauth_signature = ohauth.signature(osmly.settings.oauth_secret, '',
            ohauth.baseString('POST', url, osmly.o));

        ohauth.xhr('POST', url, osmly.o, null, {}, function(xhr) {
            var string = ohauth.stringQs(xhr.response);
            osmly.token('ohauth_token_secret', string.oauth_token_secret);

            popup.location = osmly.settings.writeApi + '/oauth/authorize?' + ohauth.qsString({
                oauth_token: string.oauth_token,
                oauth_callback: location.href
            });

        });
    };

    // https://github.com/systemed/iD/blob/master/js/id/oauth.js#L107
    function access_oauth(oauth_token) {
        var url = osmly.settings.writeApi + '/oauth/access_token',
            token_secret = osmly.token('ohauth_token_secret');

        osmly.o.oauth_timestamp = ohauth.timestamp();
        osmly.o.oauth_nonce = ohauth.nonce();
        osmly.o.oauth_token = oauth_token.oauth_token;

        if (!token_secret) return console.error('Required token not found');

        osmly.o.oauth_signature = ohauth.signature(osmly.settings.oauth_secret, token_secret,
            ohauth.baseString('POST', url, osmly.o));

        ohauth.xhr('POST', url, osmly.o, null, {}, function(xhr) {
            var access_token = ohauth.stringQs(xhr.response);
            osmly.token('token', access_token.oauth_token);
            osmly.token('secret', access_token.oauth_token_secret);

            getUserDetails();
            userDetailsUI();
            next();
        });
    }

    function getUserDetails() {
        // this is all pretty stupid, we just need the username
        // we're only using the username to link the user to their own profile
            // ~50 lines for one link, a tiny convenience
        // probably removing soon
        var url = osmly.settings.writeApi + '/api/0.6/user/details',
            token_secret = osmly.token('secret');

        o.oauth_timestamp = ohauth.timestamp();
        o.oauth_nonce = ohauth.nonce();
        o.oauth_token = osmly.token('token');

        o.oauth_signature = ohauth.signature(settings.oauth_secret, token_secret,
            ohauth.baseString('GET', url, o));

        ohauth.xhr('GET', url, o, '', {},
            function(xhr) {
                var u = xhr.responseXML.getElementsByTagName('user')[0],
                    img = u.getElementsByTagName('img'),
                    name = u.getAttribute('display_name'),
                    id = u.getAttribute('id');

                if (img.length) {
                    var avatar = img[0].getAttribute('href');
                }

                // not using the id or avatar for anything yet
                osmly.token('userName', user.name);
                osmly.token('userId', user.id);
                osmly.token('userAvatar', user.avatar);
            });
    }

    return connect;
}());
