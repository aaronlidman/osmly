/* jshint multistr:true */
// common ui used by every mode
osmly.ui = (function() {
    var ui = {};

    ui.go = function() {
        setInterface();
        document.title = osmly.settings.title;
        $('#title').html(osmly.settings.title);
        $('#title, #top-bar').fadeIn(250);

        if (osmly.auth.authenticated() && token('user')) {
            ui.setUserDetails();
            osmly.mode.import();
        } else {
            $('#login, #demo').fadeIn(250);
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

        $('body').append('\
            <span id="title"></span>\
            <ul id="top-bar">\
                <a href="#instruction-modal">\
                    <li id="instruction" style="border-left: none;">Instructions</li>\
                </a>\
                <li id="overview">Overview</li>\
                <li id="qa" alt="Quality Assurance">QA</li>\
                <li id="user"></li>\
                <a href="#changeset-modal">\
                    <li id="changeset">Changeset</li>\
                </a>\
                <a href="#demo-modal">\
                    <li id="demo-mode">DEMO MODE</li>\
                </a>\
            </ul>\
            <div id="notify"></div>\
        ');

        $('body').append('\
            <div class="semantic-content" id="changeset-modal">\
                <!-- eventually, prefill comment with existing comment -->\
                <div class="modal-inner">\
                    <header id="modal-label"><h2>Changeset</h2></header>\
                    <div class="modal-content">\
                        <div id="changeset-form" contenteditable="true"></div>\
                        <span id="changeset-link"></span>\
                        <span id="update-change">update</span>\
                    </div>\
                </div>\
                <a href="#!" class="modal-close" title="Close this modal" data-close="Close" data-dismiss="modal"></a>\
            </div>\
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
                        <ul>\
                            <li>Outline the nearby park.</li>\
                            <li>Pay attention to the tags, especially the \'name\' tag.</li>\
                            <li>It\'s possible the data is out of date or just wrong; report problems accordingly.</li>\
                            <li>Yellow features are other OSM features there to help you. You can\'t edit them here but clicking them provides more information. If you know they\'re wrong, go to osm.org and fix them.</li>\
                        </ul>\
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
                    <div class="modal-content">\
                    </div>\
                </div>\
                <a href="#!" class="modal-close" title="Close this modal" data-close="Close" data-dismiss="modal"></a>\
            </div>\
        ');
    }

    function bind() {
        $('#demo').on('click', demo);
        $('#login').on('click', login);
        $('#qa').one('click', osmly.mode.qa);
            // QA shouldn't be turned on until the user is logged in
            // eventually there needs to be another level of auth for use level
            // OR all it, and have QA put up a modal about auth level/admins
        $('#overview').on('click', osmly.mode.overview);
        $('#update-change').on('click', changeset);
        $('#remote-edit-modal').on('click', remoteEdit);
    }

    function remoteEdit() {
        var result = this.getAttribute('data-type');
        if (result == 'yes') {
            var id = osmly.imp.id;
            if (this.getAttribute('data-id')) id = this.getAttribute('data-id');

            if (osmly.auth.authenticated() && token('user')) {
                osmly.connect.updateItem('submit', {submit: 'JOSM'}, function(){
                    CSSModal.close();
                    if (id == osmly.imp.id) {
                        skip();
                    } else {
                        osmly.overview.modalDone();
                    }
                }, id);
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
            osmly.mode.import();
        });
    }

    function demo() {
        $('#login, #demo').fadeOut(250);
        CSSModal.open('demo-modal');
        $('#demo-mode').show();
        osmly.mode.import();
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
