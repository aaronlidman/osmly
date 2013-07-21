var auth = {};

auth = osmAuth({
    oauth_secret: osmly.settings.oauth_secret,
    oauth_consumer_key: osmly.settings.consumerKey,
    auto: true,
    url: 'http://api06.dev.openstreetmap.org'
});

function getDetails() {
    auth.xhr({
        method: 'GET',
        path: '/api/0.6/user/details'
    }, setDetails);
}

function setDetails(err, res) {
    if (err) {
        console.log('error! try clearing your browser cache');
        return;
    }
    osmly.token('user', res.getElementsByTagName('user')[0]);
    osmly.token('display_name', u.getAttribute('display_name'));
    // there's plenty more to get
    // http://wiki.openstreetmap.org/wiki/API_v0.6#Details_of_the_logged-in_user
}
