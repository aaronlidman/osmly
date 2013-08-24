osmly.ui = (function() {
    var ui = {};

    ui.initialize = function() {
        var login = $('#login');
        if (osmly.settings.demo) {
            if (osmly.settings.demo) login.text = 'Demonstration »';
            fadeIn(login);
        } else {
            if (osmly.auth.authenticated()) {
                osmly.ui.setUserDetails();
                osmly.item.next();
            } else {
                fadeIn(login);
                // fade in demo too?
                    // all have demo mode also buy default?
            }
        }
        document.title = osmly.settings.title;
        $('#title').text(osmly.settings.title);
        fadeIn($('#title, #top-bar'));
        bind();
    };

    function bind() {
        bean.on($('#login')[0], 'click', function(){
            ui.notify('');
            if (osmly.settings.demo) {
                fadeIn($('#login'));
                osmly.item.next();
            } else {
                osmly.auth.authenticate(function(){
                    fadeOut($('#login'));
                    osmly.connect.getDetails();
                    osmly.item.next();
                });
            }
        });

        bean.on($('#go_overview')[0], 'click', function(){
            fadeIn($('#overview_bg, #overview-controls, #overview_block'));
            osmly.overview.refresh();
        });

        bean.on($('#overview_bg')[0],'click', function(){
            $('#overview_bg, #overview-controls, #overview_block').hide();
                // don't fade any modals on close, feels snappier
            osmly.overview.close();
        });

        bean.on($('#update-change')[0], 'click', function(){
            osmly.settings.changesetTags['comment'] = $('#changeset-form').text();
            osmly.connect.updateComment(function(){
                CSSModal.close();
                $('#notify').hide();
            });
        });

        bean.on($('#josm')[0], 'click', function(){
            bean.fire($('#reset'), 'click');
            osmly.connect.editInJosm(osmly.item.id);
        });

        bean.on($('#osmlink')[0], 'click', function(){window.open(osmly.osmlink);});
        bean.on($('#skip')[0], 'click', skip);
        bean.on($('#submit')[0], 'click', function(){submit('submit');});

        bean.on($('#problem')[0], 'change', function(){
            submit($('#problem').val());
            $('#problem').val('problem');
                // resets problem menu
        });

        bean.on($('#reset')[0], 'click', function(){
            hide();
            osmly.ui.teardown();
            osmly.item.setItemLayer(osmly.item.data);
            osmly.ui.setupItem(osmly.item.data.properties);
            osmly.ui.displayItem();
        });

        bean.on($('#tags')[0], 'click', '.minus', function(){
            if ($('#tags tr').length > 1) {
                this.parentNode.remove();
            }
        });

        bean.on($('#add-new-tag')[0], 'click', function(){
            $('#tags tbody').append(
                '<tr>' +
                '<td class="k" spellcheck="false" contenteditable="true"></td>' +
                '<td class="v" spellcheck="false" contenteditable="true"></td>' +
                '<td class="minus">-</td>' +
                '</tr>');
        });

        bean.on($('#main_table')[0], 'click', '.editjosm', function(){
            if (!token('user')) {
                pleaseLogin();
            } else {
                $('#remote-edit-modal button')[1].setAttribute('data-id', this.getAttribute('data-id'));
                osmly.connect.editInJosm(this.getAttribute('data-id'));
            }
        });

        bean.on($('#remote-edit-modal')[0], 'click', 'button', function(){
            var result = this.getAttribute('data-type');

            if (result == 'no') {
                CSSModal.close();
            } else if (result == 'yes') {
                osmly.connect.updateItem('submit', {done: 3}, function(){
                    osmly.overview.modalDone(function(){
                        CSSModal.close();
                    });
                }, this.getAttribute('data-id'));
            }
        });

        bean.on($('#main_table')[0], 'click', '.markdone', function(){
            if (!token('user')) {
                pleaseLogin();
            } else {
                $('#markdone-modal button')[1].setAttribute('data-id', this.getAttribute('data-id'));
                CSSModal.open('markdone-modal');
            }
        });

        bean.on($('#markdone-modal')[0], 'click', 'button', function(){
            var result = this.getAttribute('data-type');

            if (result == 'no') {
                CSSModal.close();
            } else if (result == 'yes') {
                osmly.connect.updateItem('submit', {done: 2}, function(){
                    osmly.overview.modalDone(function(){
                        CSSModal.close();
                    });
                }, this.getAttribute('data-id'));
            }
        });

        bean.on($('#everything')[0], 'click', osmly.overview.click_everything);
        bean.on($('#red')[0], 'click', osmly.overview.click_red);
        bean.on($('#green')[0], 'click', osmly.overview.click_green);
        bean.on($('#users')[0], 'click', function(){
            osmly.overview.drop_selection('users-select');
        });
        bean.on($('#users-select')[0], 'change', function(){
            osmly.overview.drop_selection('users-select');
        });
        bean.on($('#problems')[0], 'click', function(){
            osmly.overview.drop_selection('problems-select');
        });
        bean.on($('#problems-select')[0], 'change', function(){
            osmly.overview.drop_selection('problems-select');
        });
    }

    function pleaseLogin() {
        $('#reusable-modal h3').text(
            'Please login. It helps track your changes so other users don\'t edit the same feature.');
        // login button/link?
        CSSModal.open('reusable-modal');
    }

    ui.notify = function(string) {
        if (string !== '') string = '<span>' + string + '</span>';
        string = '<img src="loader.gif" />' + string;

        $('#notify').html(string).show('block');
        // don't forget to hide #notify later
    };

    ui.setupItem = function(properties) {
        populateTags(properties);
    };

    ui.displayItem = function() {
        var isEditable = osmly.item.isEditable;
        osmly.item.layer.addTo(osmly.map);

        if (osmly.item.contextLayer) {
            osmly.item.contextLayer.addTo(osmly.map);
            osmly.item.contextLayer.bringToFront();
        }

        fadeOut($('#login'));
        $('#notify').hide();
        fadeIn($('#hold-problem, #submit, #bottom-right, #action-block'));

        if (isEditable) {
            fadeIn($('#tags'));
        } else {
            fadeOut($('#hold-problem, #submit'));
            $('#reusable-modal h3').html(
                'This feature is too complex. <a>Edit it in JOSM?</a>');
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

    function hide() {
        fadeOut($('#hold-problem, #submit, #bottom-right, #action-block, #tags'));
        osmly.map.closePopup();
        osmly.map.removeLayer(osmly.item.layer);
        if (osmly.item.contextLayer) osmly.map.removeLayer(osmly.item.contextLayer);
    }

    ui.teardown = function() {
        fadeOut($('#tags'));
        $('#tags tr').remove();
    };

    function skip() {
        hide();
        osmly.ui.teardown();
        leftToRight($('.foundicon-right-arrow'));
        osmly.item.next();
    }

    function submit(result) {
        hide();

        if (osmly.settings.demo) {
            osmly.ui.teardown();
            osmly.item.next();
        } else {
            if (result === 'submit') {
                osmly.connect.updateItem('submit');
                osmly.connect.openChangeset(osmly.connect.submitToOSM);
            } else {
                osmly.connect.updateItem('problem', {problem: result});
                osmly.ui.teardown();
                osmly.item.next();
            }
        }

        if (result !== 'submit') result = 'problem';

        if (result == 'submit') {
            bigUp($('.foundicon-up-arrow'));
        } else if (result == 'problem') {
            fadeIn($('.foundicon-remove'), function(){
                fadeOut($('.foundicon-remove'));
            });
        }
    }

    ui.setUserDetails = function() {
        fadeIn($('#user')
            .html('<a href="' + osmly.settings.writeApi + '/user/' +
                token('user') + '/edits" target="_blank">' +
                token('user') + '</a>')
        );
    };

    return ui;
}());
