osmly.ui = (function() {
    var ui = {};

    ui.initialize = function() {
        document.title = osmly.settings.title;
        $('#title').text(osmly.settings.title);
        fadeIn($('#title, #top-bar'));

        if (osmly.auth.authenticated() && token('user')) {
            osmly.ui.setUserDetails();
            osmly.item.next();
        } else {
            fadeIn($('#login, #demo'));
        }

        if (!osmly.settings.demo) $('#demo').hide();
        bind();
    };

    function bind() {
        bean.on($('#demo')[0], 'click', demo);
        bean.on($('#login')[0], 'click', login);
        bean.on($('#josm')[0], 'click', josm);
        bean.on($('#skip')[0], 'click', skip);
        bean.on($('#reset')[0], 'click', reset);
        bean.on($('#update-change')[0], 'click', changeset);
        bean.on($('#remote-edit-modal')[0], 'click', 'button', remoteEdit);
        bean.on($('#add-new-tag')[0], 'click', addTag);
        bean.on($('#markdone-modal')[0], 'click', 'button', markDone);

        bean.on($('#osmlink')[0], 'click', function(){ window.open(osmly.osmlink);} );
        bean.on($('#submit')[0], 'click', function(){ submit('submit');} );

        bean.on($('#go_overview')[0], 'click', function(){
            fadeIn($('#overview_bg, #overview-controls, #overview_block'));
            osmly.overview.refresh();
        });

        bean.on($('#overview_bg')[0],'click', function(){
            $('#overview_bg, #overview-controls, #overview_block').hide();
            osmly.overview.close();
        });

        bean.on($('#problem')[0], 'change', function(){
            submit($('#problem').val());
            $('#problem').val('problem'); // resets problem menu
        });

        bean.on($('#tags')[0], 'click', '.minus', function(){
            if ($('#tags tr').length > 1) this.parentNode.remove();
        });

        bean.on($('#main_table')[0], 'click', '.editjosm', function(){
            if (osmly.auth.authenticated() && token('user')) {
                $('#remote-edit-modal button')[1].setAttribute('data-id', this.getAttribute('data-id'));
                osmly.connect.editInJosm(this.getAttribute('data-id'));
            } else {
                pleaseLogin();
            }
        });

        bean.on($('#main_table')[0], 'click', '.markdone', function(){
            if (osmly.auth.authenticated() && token('user')) {
                $('#markdone-modal button')[1].setAttribute('data-id', this.getAttribute('data-id'));
                CSSModal.open('markdone-modal');
            } else {
                pleaseLogin();
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

        if (osmly.auth.authenticated() && token('user')) {
            if (result === 'submit') {
                osmly.connect.updateItem('submit');
                osmly.connect.openChangeset(osmly.connect.submitToOSM);
            } else {
                osmly.connect.updateItem('problem', {problem: result});
                osmly.ui.teardown();
                osmly.item.next();
            }
        } else {
            osmly.ui.teardown();
            osmly.item.next();
        }

        if (result !== 'submit') result = 'problem';

        if (result == 'submit') {
            bigUp($('.foundicon-up-arrow'));
        } else if (result == 'problem') {
            fadeIn($('.foundicon-remove'), function(){
                setTimeout(function(){
                    fadeOut($('.foundicon-remove'));
                }, 250);
            });
        }
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
        hide();
        osmly.ui.teardown();
        osmly.item.setItemLayer(osmly.item.data);
        osmly.ui.setupItem(osmly.item.data.properties);
        osmly.ui.displayItem();
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
                osmly.connect.updateItem('submit', {done: 3}, function(){
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
                osmly.connect.updateItem('submit', {done: 2}, function(){
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
        fadeIn($('#user')
            .html('<a href="' + osmly.settings.writeApi + '/user/' +
                token('user') + '/edits" target="_blank">' +
                token('user') + '</a>')
        );
    };

    return ui;
}());
