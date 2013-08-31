osmly.ui = (function() {
    var ui = {};

    ui.initialize = function() {
        document.title = osmly.settings.title;
        $('#title').text(osmly.settings.title);
        fadeIn($('#title, #top-bar'));

        if (osmly.auth.authenticated() && token('user')) {
            ui.setUserDetails();
            osmly.item.next();
        } else {
            fadeIn($('#login, #demo'));
        }

        if (!osmly.settings.demo) $('#demo').hide();
        bind();
    };

    function bind() {
        bean.on(byId('demo'), 'click', demo);
        bean.on(byId('login'), 'click', login);
        bean.on(byId('josm'), 'click', josm);
        bean.on(byId('skip'), 'click', skip);
        bean.on(byId('reset'), 'click', reset);
        bean.on(byId('update-change'), 'click', changeset);
        bean.on(byId('remote-edit-modal'), 'click', 'button', remoteEdit);
        bean.on(byId('add-new-tag'), 'click', addTag);
        bean.on(byId('markdone-modal'), 'click', 'button', markDone);
        bean.on(byId('problem'), 'change', problem);
        bean.on(byId('submit'), 'click', submit);
        bean.on(byId('qa'), 'click', osmly.qa.go);

        bean.on(byId('osmlink'), 'click', function(){ window.open(osmly.osmlink);} );

        bean.on(byId('go_overview'), 'click', function(){
            fadeIn($('#overview_bg, #overview-controls, #overview_block'));
            osmly.overview.refresh();
        });

        bean.on(byId('overview_bg'),'click', function(){
            $('#overview_bg, #overview-controls, #overview_block').hide();
            osmly.overview.close();
        });

        bean.on(byId('tags'), 'click', '.minus', function(){
            if ($('#tags tr').length > 1) this.parentNode.remove();
        });

        bean.on(byId('main_table'), 'click', '.editjosm', function(){
            if (osmly.auth.authenticated() && token('user')) {
                $('#remote-edit-modal button')[1].setAttribute('data-id', this.getAttribute('data-id'));
                osmly.connect.editInJosm(this.getAttribute('data-id'));
            } else {
                pleaseLogin();
            }
        });

        bean.on(byId('main_table'), 'click', '.markdone', function(){
            if (osmly.auth.authenticated() && token('user')) {
                $('#markdone-modal button')[1].setAttribute('data-id', this.getAttribute('data-id'));
                CSSModal.open('markdone-modal');
            } else {
                pleaseLogin();
            }
        });

        bean.on(byId('everything'), 'click', osmly.overview.click_everything);
        bean.on(byId('red'), 'click', osmly.overview.click_red);
        bean.on(byId('green'), 'click', osmly.overview.click_green);
        bean.on(byId('users'), 'click', function(){
            osmly.overview.drop_selection('users-select');
        });
        bean.on(byId('users-select'), 'change', function(){
            osmly.overview.drop_selection('users-select');
        });
        bean.on(byId('problems'), 'click', function(){
            osmly.overview.drop_selection('problems-select');
        });
        bean.on(byId('problems-select'), 'change', function(){
            osmly.overview.drop_selection('problems-select');
        });
    }

    function pleaseLogin() {
        $('#reusable-modal .modal-content').html(
            '<h3>Please login. It helps track your changes so other users don\'t edit the same feature.</h3>');
        // login button/link?
        CSSModal.open('reusable-modal');
    }

    ui.notify = function(string) {
        if (string !== '') string = '<span>' + string + '</span>';
        string = '<img src="static/loader.gif" />' + string;

        $('#notify').html(string).show('block');
        // don't forget to hide #notify later
    };

    ui.setupItem = function(properties) {
        populateTags(properties);
    };

    ui.displayItem = function() {
        osmly.item.layer.addTo(osmly.map);

        if (osmly.item.contextLayer) {
            osmly.item.contextLayer.addTo(osmly.map);
            osmly.item.contextLayer.bringToFront();
        }

        fadeOut($('#login'));
        $('#notify').hide();
        fadeIn($('#hold-problem, #submit, #bottom-right, #action-block'));

        if (osmly.item.isEditable) {
            fadeIn($('#tags'));
        } else {
            fadeOut($('#hold-problem, #submit'));
            $('#reusable-modal .modal-content').html(
                '<h3>This feature is too complex. <a>Edit it in JOSM?</a></h3>');
            // put an 'Edit in JOSM' button right there, when clicked close the modal and let the other modal open
            // literally bind, $('#josm').click()
            CSSModal.open('reusable-modal');
        }
    };

    function populateTags(properties) {
        for (var tag in properties) {
            if (properties[tag] !== null &&
                properties[tag] !== 'null') {
                $('#tags tbody').append(
                    '<tr>' +
                    '<td class="k" spellcheck="false" contenteditable="true">' +
                    tag + '</td>' +
                    '<td class="v" spellcheck="false" contenteditable="true">' +
                    properties[tag] + '</td>' +
                    '<td class="minus">-</td>' +
                    '</tr>');
            }
        }
    }

    ui.hideItem = function() {
        fadeOut($('#hold-problem, #submit, #bottom-right, #action-block, #tags'));
        osmly.map.closePopup();
        osmly.map.removeLayer(osmly.item.layer);
        if (osmly.item.contextLayer) osmly.map.removeLayer(osmly.item.contextLayer);
    };

    ui.teardown = function() {
        fadeOut($('#tags'));
        $('#tags tr').remove();
    };

    function skip() {
        ui.hideItem();
        ui.teardown();
        leftToRight($('.foundicon-right-arrow'));
        osmly.item.next();
    }

    function submit(result) {
        ui.hideItem();

        if (osmly.auth.authenticated() && token('user')) {
            osmly.connect.updateItem('submit');
            osmly.connect.openChangeset(osmly.connect.submitToOSM);
        } else {
            ui.teardown();
            osmly.item.next();
        }
        bigUp($('.foundicon-up-arrow'));
    }

    function problem() {
        ui.hideItem();

        if (osmly.auth.authenticated() && token('user')) {
            osmly.connect.updateItem('problem', {
                problem: $('#problem').val()
            });
        }
        fadeIn($('.foundicon-remove'), function(){
            setTimeout(function(){
                fadeOut($('.foundicon-remove'));
            }, 250);
        });
        $('#problem').val('problem');
        ui.teardown();
        osmly.item.next();
    }

    function demo() {
        fadeOut($('#login, #demo'));
        CSSModal.open('demo-modal');
        $('#demo-mode').show('block');
        osmly.item.next();
    }

    function login() {
        ui.notify('');
        osmly.auth.authenticate(function(){
            fadeOut($('#login, #demo'));
            CSSModal.open('instruction-modal');
            osmly.connect.getDetails();
            osmly.item.next();
        });
    }

    function josm() {
        if (osmly.auth.authenticated() && token('user')) {
            bean.fire($('#reset'), 'click');
            osmly.connect.editInJosm(osmly.item.id);
        } else {
            pleaseLogin();
        }
    }

    function reset() {
        ui.hideItem();
        ui.teardown();
        osmly.item.setItemLayer(osmly.item.data);
        ui.setupItem(osmly.item.data.properties);
        ui.displayItem();
    }

    function changeset() {
        osmly.settings.changesetTags['comment'] = $('#changeset-form').text();
        osmly.connect.updateComment(function(){
            CSSModal.close();
            $('#notify').hide();
        });
    }

    function remoteEdit() {
        var result = this.getAttribute('data-type');
        if (result == 'yes') {
            if (osmly.auth.authenticated() && token('user')) {
                osmly.connect.updateItem('submit', {submit: 'JOSM'}, function(){
                    osmly.overview.modalDone(function(){
                        CSSModal.close();
                    });
                }, this.getAttribute('data-id'));
            } else {
                CSSModal.close();
                pleaseLogin();
            }

        } else {
            CSSModal.close();
        }
    }

    function addTag() {
        $('#tags tbody').append(
            '<tr>' +
            '<td class="k" spellcheck="false" contenteditable="true"></td>' +
            '<td class="v" spellcheck="false" contenteditable="true"></td>' +
            '<td class="minus">-</td>' +
            '</tr>');
    }

    function markDone() {
        var result = this.getAttribute('data-type');
        if (result == 'yes') {
            if (osmly.auth.authenticated() && token('user')) {
                osmly.connect.updateItem('submit', {submit: 'Mark as Done'}, function(){
                    osmly.overview.modalDone(function(){
                        CSSModal.close();
                    });
                }, this.getAttribute('data-id'));
            } else {
                CSSModal.close();
                pleaseLogin();
            }
        } else {
            CSSModal.close();
        }
    }

    ui.setUserDetails = function() {
        if (token('avatar')) $('#user').append('<img height="25px" src="' + token('avatar') + '"/>');
        fadeIn($('#user')
            .append('<a href="' + osmly.settings.writeApi + '/user/' +
                token('user') + '/edits" target="_blank">' +
                token('user') + '</a>')
        );
    };

    return ui;
}());
