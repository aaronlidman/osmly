osmly.auth = function() {
    var auth = {};

    auth.auth = osmAuth({
        oauth_secret: osmly.settings.oauth_secret,
        oauth_consumer_key: osmly.settings.consumerKey,
        auto: true,
        url: osmly.writeApi
    });

    auth.getDetails = function() {
        auth.xhr({
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
        var changesets = res.getElementsByTagName('changesets')[0];
        var display_name = u.getAttribute('display_name');
        var id = u.getAttribute('id');
        // put them in localstorage
    }

    return auth;
};
