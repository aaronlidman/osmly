osmly.connect = (function() {
    var connect = {};

    connect.updateItem = function(action, data, callback, id) {
        if (typeof data != 'object') data = {};
        id = id || osmly.item.id;

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
                reqwest({
                    url: url,
                    method: 'POST',
                    crossOrigin: true,
                    data: data,
                    type: 'json',
                    success: function() {
                        if (callback) callback();
                    }
                });
            }
        }
    };

    function checkItem(id, callback) {
        var url = osmly.settings.db + '&id=' + id + '&action=status';

        reqwest({
            url: url,
            crossOrigin: true,
            type: 'json',
            success: function(status) {
                if (status.status == 'ok') {
                    callback();
                } else {
                    callback('skip');
                }
            }
        });
    }

    connect.openChangeset = function(callback) {
        if (!token('changeset_id')) {
            createChangeset(callback);
        } else {
            osmly.ui.notify('checking changeset status');

            reqwest({
                url: osmly.settings.writeApi + '/api/0.6/changeset/' + token('changeset_id'),
                crossOrigin: true,
                type: 'xml',
                success: function(xml) {
                    var cs = xml.getElementsByTagName('changeset');
                    if (cs[0].getAttribute('open') === 'true') {
                        callback();
                    } else {
                        createChangeset(callback);
                    }
                }
            });
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
                token('changeset_id', response);
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
        // the actual comment is kept in osmly.settings.changesetTags.comment
        // we have no way of knowing if openChangeset created a new changeset just before this
            // it would have the new comment in it, making this unnecessary
            // we just do it twice, this update option is only available for existing changesets
            // worse case senario: we do two almost identical requests instead of one
        osmly.connect.openChangeset(function() {
            osmly.ui.notify('updating changeset');
            osmly.auth.xhr({
                method: 'PUT',
                path: '/api/0.6/changeset/' + token('changeset_id'),
                content: newChangesetXml(),
                options: {header: {'Content-Type': 'text/xml'}}
            }, function(err, response){
                if (err) {
                    // notify('changeset update failed, try again')?
                } else {
                    callback();
                }
            });
        });

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
        // there's more if needed
        // http://wiki.openstreetmap.org/wiki/API_v0.6#Details_of_the_logged-in_user
        osmly.ui.setUserDetails();
    }

    connect.submitToOSM = function() {
        var id = token('changeset_id');
        fadeIn($('#changeset'));
        $('#changeset-link')
            .html('<a href="' + osmly.settings.writeApi + '/browse/changeset/' +
                id + '" target="_blank">Details on osm.org »</a>');

        var geojson = osmly.item.layer.toGeoJSON();
        geojson['features'][0]['properties'] = osmly.item.getTags();
            // this is sketchy but works for single items
        var osmChange = osmly.item.toOsmChange(geojson, token('changeset_id'));

        osmly.ui.notify('uploading to OSM');

        osmly.auth.xhr({
            method: 'POST',
            path: '/api/0.6/changeset/' + id + '/upload',
            content: osmChange,
            options: {header: {'Content-Type': 'text/xml'}}
        }, after_submit);
    };

    function after_submit(err, res) {
        if (res && !err) {
            // do some kind of special green checkmark
            // can we double notify?
        } else {
            console.log(err);
            // :/
        }
        osmly.ui.teardown();
        osmly.item.next();
    }

    connect.editInJosm = function(id) {
        var osm,
            url = osmly.settings.db + '&id=' + id + '&action=remote';

        if (id === osmly.item.id) {
            osm = osmly.item.toOsm(osmly.item.layer.toGeoJSON());
            osmly.connect.updateItem('remote', {remote: osm}, callback, id);
        } else {
            reqwest({
                url: osmly.settings.db + '&id=' + id,
                crossOrigin: true,
                type: 'json',
                success: function(geo) {
                    // from osmly.item.js, renameProperties()
                    for (var prop in osmly.settings.renameProperty) {
                        var change = osmly.settings.renameProperty[prop];
                        geo.properties[change] = geo.properties[prop];
                    }

                    // from osmly.item.js, usePropertiesAsTag()
                    for (var poop in geo.properties) {
                        if (osmly.settings.usePropertyAsTag.indexOf(poop) === -1) {
                            geo.properties[poop] = null;
                        }
                    }

                    // from osmly.item.js, append()
                    for (var append in osmly.settings.appendTag) {
                        geo.properties[append] = osmly.settings.appendTag[append];
                    }

                    osm = osmly.item.toOsm(geo);
                    osmly.connect.updateItem('remote', {remote: osm}, callback, id);
                }
            });
        }

        function callback() {
            reqwest({
                url: 'http://127.0.0.1:8111/import?url=' + url,
                crossOrigin: true,
                type: 'xml',
                error: function() {
                    $('#reusable-modal h3').text(
                        'JOSM doesn\'t seem to be running. Start JOSM and try again.');
                    CSSModal.open('reusable-modal');
                },
                success: CSSModal.open('remote-edit-modal')
            });
        }
    };

    return connect;
}());
