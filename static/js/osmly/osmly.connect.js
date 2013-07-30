osmly.connect = (function(){
    var connect = {};

    connect.updateItem = function(result) {
        var url = osmly.settings.featuresApi + 'db=' + osmly.settings.db +
            '&id=' + osmly.item.id + '&action=problem';
        $.ajax({
            type: 'POST',
            url: url,
            crossDomain: true,
            data: {problem: result, user: osmly.user.name}
        });
        // no blocking, not worth slowing down over, it's reproducable
    };

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
        for (var c = 0; c < osmly.settings.changesetTags.length; c++) {
            tags +=
                '<tag k="' + osmly.settings.changesetTags[c][0] +
                '" v="' + osmly.settings.changesetTags[c][1] + '"/>';
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

        var geojson = osmly.item.layer.toGeoJSON(),
            osmChange = osmly.item.toOsmChange(geojson, osmly.token('changeset_id'));

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
        osmly.item.next();
    }

    return connect;
}());
