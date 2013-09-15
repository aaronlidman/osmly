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
                // fails without correct content type header
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
