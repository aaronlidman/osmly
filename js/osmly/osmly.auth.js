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
