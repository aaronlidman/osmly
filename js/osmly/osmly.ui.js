osmly.ui = (function() {
    var ui = {};

    ui.initialize = function() {
        var login = $('#login');
        if (osmly.settings.demo) {
            if (osmly.settings.demo) login.text = 'Demonstration »';
            fade('in', login);
        } else {
            if (osmly.auth.authenticated()) {
                osmly.ui.setUserDetails();
                osmly.item.next();
            } else {
                osmly.token('user', 'demo');
                fade('in', login);
            }
        }
        document.title = osmly.settings.title;
        $('#title').text(osmly.settings.title);
        bind();
    };

    function bind() {
        bean.on($('#login')[0], 'click', function(){
            ui.notify('');
            if (osmly.settings.demo) {
                fade('in', $('#login'));
                osmly.item.next();
            } else {
                osmly.auth.authenticate(function(){
                    fade('out', $('#login'));
                    osmly.connect.getDetails();
                    osmly.item.next();
                });
            }
        });

        bean.on($('#go_overview')[0], 'click', function(){
            fade('in', $('#overview_bg, #overview-controls, #overview_block'));
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
            ui.setupItem(osmly.item.data.properties);
            ui.displayItem();
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
            if (osmly.token('user') == 'demo') {
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
            if (osmly.token('user') == 'demo') {
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

        fade('out', $('#login'));
        $('#notify').hide();
        fade('in', $('#problem, #submit, #title, #top-bar, #bottom-right, #action-block'));

        if (isEditable) {
            fade('in', $('#tags'));
        } else {
            fade('out', $('#problem, #submit'));
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
        fade('out', $('#action-block, #tags, #bottom-right'));
        osmly.map.closePopup();
        osmly.map.removeLayer(osmly.item.layer);
        if (osmly.item.contextLayer) osmly.map.removeLayer(osmly.item.contextLayer);
    }

    ui.teardown = function() {
        fade('out', $('#tags'), function(){$('#tags tr').remove();});
    };

    function skip() {
        hide();
        osmly.ui.teardown();
        fade('fadeOutLefttoRight', $('.foundicon-right-arrow'), function(){
            $('.foundicon-right-arrow').hide();
        });
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
            fade('fadeInUpBig', $('.foundicon-up-arrow'), function(){
                $('.foundicon-up-arrow').hide();
            });
        } else if (result == 'problem') {
            fade('in', $('.foundicon-remove'), function(){
                fade('out', $('.foundicon-remove'));
            });
        }
    }

    ui.setUserDetails = function() {
        fade('in', $('#user')
            .html('<a href="' + osmly.settings.writeApi + '/user/' +
                osmly.token('user') + '/edits" target="_blank">' +
                osmly.token('user') + '</a>')
        );
    };

    return ui;
}());
