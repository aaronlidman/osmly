osmly.connect = (function(){
    var connect = {};

    connect.updateItem = function(action, data, callback, id) {
        if (typeof data != 'object') data = {};
        id = id || osmly.item.id;

        var url = osmly.settings.db + '&id=' + id + '&action=' + action;

        data['user'] = osmly.token('user');

        if (action == 'submit') {
            if (!checkItem(id)) {
                if (callback) callback();
                return false;
            }
        }

        $.ajax({
            type: 'POST',
            url: url,
            crossDomain: true,
            data: data
        }).done(function(){
            if (callback) callback();
        });
    };

    function checkItem(id) {
        var url = osmly.settings.db + '&id=' + id + '&action=status';

        $.ajax({
            url: url,
            crossDomain: true
        }).done(function(status){
            status = JSON.parse(status).status;
            if (status == 'no_go') {
                return false;
            }
            return true;
        });
    }

    connect.openChangeset = function(callback) {
        if (!osmly.token('changeset_id')){
            createChangeset(callback);
        } else {
            osmly.ui.notify('checking changeset status');

            $.ajax({
                url: osmly.settings.writeApi + '/api/0.6/changeset/' + osmly.token('changeset_id'),
                cache: false
            }).done(function(xml) {
                var cs = xml.getElementsByTagName('changeset');
                if (cs[0].getAttribute('open') === 'true') {
                    callback();
                } else {
                    createChangeset(callback);
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
                osmly.token('changeset_id', response);
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
                path: '/api/0.6/changeset/' + osmly.token('changeset_id'),
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
        osmly.token('user', u.getAttribute('display_name'));
        // there's more if needed
        // http://wiki.openstreetmap.org/wiki/API_v0.6#Details_of_the_logged-in_user
        osmly.ui.setUserDetails();
    }

    connect.submitToOSM = function() {
        var id = osmly.token('changeset_id');
        $('#changeset').fadeIn(500);
        $('#changeset-link')
            .html('<a href="' + osmly.settings.writeApi + '/browse/changeset/' +
                id + '" target="_blank">Details on osm.org »</a>');

        var geojson = osmly.item.layer.toGeoJSON();
        geojson['features'][0]['properties'] = osmly.item.getTags();
            // this is sketchy but works for single items
        var osmChange = osmly.item.toOsmChange(geojson, osmly.token('changeset_id'));

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
            // need to fetch geometry of the given id
            $.ajax({
                url: osmly.settings.db + '&id=' + id,
                cache: false
            }).done(function(geo){
                geo = JSON.parse(geo);

                // from osmly.item.js, renameProperties()
                for (var prop in osmly.settings.renameProperty) {
                    var change = osmly.settings.renameProperty[prop];
                    geo.properties[change] = geo.properties[prop];
                }

                // from osmly.item.js, usePropertiesAsTag()
                for (var prop in geo.properties) {
                    if (osmly.settings.usePropertyAsTag.indexOf(prop) === -1) {
                        geo.properties[prop] = null;
                    }
                }

                // from osmly.item.js, append()
                for (var append in osmly.settings.appendTag) {
                    geo.properties[append] = osmly.settings.appendTag[append];
                }

                osm = osmly.item.toOsm(geo);
                osmly.connect.updateItem('remote', {remote: osm}, callback, id);
            });
        }

        function callback() {
            var request = $.ajax('http://127.0.0.1:8111/import?url=' + url);

            request.done(function(){
                // activate #remote-edit-modal
            });

            request.fail(function() {
                $('#reusable-modal h3').text(
                    'JOSM doesn\'t seem to be running. Start JOSM and try again.');
                // activate #reusable-modal
            });
        }
    };

    return connect;
}());
