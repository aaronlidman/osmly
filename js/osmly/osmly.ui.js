// common ui used by every mode
// each mode is reponsible for it's own ui
osmly.ui = (function() {
    var ui = {};

    ui.go = function() {
        document.title = osmly.settings.title;
        $('#title').html(osmly.settings.title);
        $('#title, #top-bar').fadeIn(250);

        if (osmly.auth.authenticated() && token('user')) {
            ui.setUserDetails();
            osmly.import.go();
        } else {
            $('#login, #demo').fadeIn(250);
        }

        if (!osmly.settings.demo) $('#demo').fadeOut(250);
        bind();
    };

    function bind() {
        // initial buttons
        $('#demo').on('click', demo);
        $('#login').on('click', login);

        // top-bar
        $('#qa').on('click', osmly.qa.go);
            // QA shouldn't be turned on until the user is logged in
            // eventually there needs to be another level of auth for use level
            // OR all it, and have QA put up a modal about auth level/admins
        $('#overview').on('click', osmly.overview.go);
        $('#update-change').on('click', changeset);

        // modal
        $('#remote-edit-modal').on('click', remoteEdit);
    }

    ui.pleaseLogin = function () {
        $('#reusable-modal .modal-content').html('<h3>Please login. It helps track your changes so other users don\'t edit the same feature.</h3>');
        // login button/link?
        CSSModal.open('reusable-modal');
    };

    ui.notify = function(string) {
        if (string !== '') string = '<span>' + string + '</span>';
        string = '<img src="static/loader.gif" />' + string;

        $('#notify').html(string);
        $('#notify').show();
        // don't forget to hide #notify later
    };

    function login() {
        ui.notify('');
        osmly.auth.authenticate(function(){
            $('#login, #demo').fadeOut(250);
            CSSModal.open('instruction-modal');
            osmly.connect.getDetails();
            osmly.item.next();
        });
    }

    ui.setUserDetails = function() {
        $('#user').html = '';
        if (token('avatar')) $('#user').append('<img height="25px" src="' + token('avatar') + '"/>');

        $('#user')
            .append('<a href="' + osmly.settings.writeApi + '/user/' +
                token('user') + '" target="_blank">' + token('user') + '</a>')
            .fadeIn(250);
    };

    return ui;
}());
