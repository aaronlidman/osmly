osmly.ui = (function() {
    var ui = {};

    ui.initialize = function() {
        var login = $('#login');
        if (osmly.settings.demo) {
            if (osmly.settings.demo) login.text = 'Demonstration »';
            login.show('block');
        } else {
            if (osmly.auth.authenticated()) {
                osmly.ui.setUserDetails();
                osmly.item.next();
            } else {
                osmly.token('user', 'demo');
                login.show('block');
            }
        }

        document.title = osmly.settings.title;
        $('#title').text(osmly.settings.title);
        bind();
    };

    function bind() {
        bean.on($('#login')[0], 'click', function() {
            ui.notify('');
            if (osmly.settings.demo) {
                $('#login').hide();
                osmly.item.next();
            } else {
                osmly.auth.authenticate(function() {
                    $('#login').hide();
                    osmly.connect.getDetails();
                    osmly.item.next();
                });
            }
        });

        bean.on($('#go_overview')[0], 'click', function(){
            console.log('go overview');
            $('#overview_bg, #overview-controls, #overview_block').show('block');
            osmly.overview.refresh();
        });

        bean.on($('#overview_bg')[0],'click', function(){
            $('#overview_bg, #overview-controls, #overview_block').hide();
            osmly.overview.close();
        });

        bean.on($('#update-change')[0], 'click', function() {
            osmly.settings.changesetTags['comment'] = $('#changeset-form').text();
            osmly.connect.updateComment(function() {
                CSSModal.close();
                $('#notify').hide();
            });
        });

        bean.on($('#josm')[0], 'click', function() {
            $('#reset').click();
            osmly.connect.editInJosm(osmly.item.id);
        });

        bean.on($('#osmlink')[0], 'click', function() {window.open(osmly.osmlink);});
        bean.on($('#skip')[0], 'click', function() {skip();});
        bean.on($('#submit')[0], 'click', function() {submit('submit');});

        bean.on($('#problem')[0], 'change', function() {
            submit($('#problem').val());
            $('#problem').val('problem');
                // resets problem menu
        });

        bean.on($('#reset')[0], 'click', function() {
            hide();
            osmly.ui.teardown();
            osmly.item.setItemLayer(osmly.item.data);
            ui.setupItem(osmly.item.data.properties);
            ui.displayItem();
        });

        bean.on($('#tags')[0], 'click', '.minus', function() {
            if ($('#tags tr').length > 1) {
                select(this).parent().remove();
            }
        });

        bean.on($('#add-new-tag')[0], 'click', function() {
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

        $('#notify')
            .html(string)
            .show('block');
        // don't forget to hide #notify later
        // $('#notify').hide();
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

        $('#notify, #login').hide();
        $('#problem, #submit, #title, #top-bar, #bottom-right, #action-block').show('block');

        if (isEditable) {
            $('#tags').show('block');
        } else {
            $('#problem, #submit').hide();
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
        $('#action-block, #tags, #bottom-right').hide();
        osmly.map.closePopup();
        osmly.map.removeLayer(osmly.item.layer);
        if (osmly.item.contextLayer) osmly.map.removeLayer(osmly.item.contextLayer);
    }

    ui.teardown = function() {
        $('#tags tr').remove();
    };

    function skip() {
        hide();
        osmly.ui.teardown();
        $('.foundicon-right-arrow').show('block');
        setTimeout(function(){$('.foundicon-right-arrow').hide();}, 300);
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
            $('.foundicon-up-arrow').show('block');
            setTimeout(function(){$('.foundicon-up-arrow').hide();}, 300);
        } else if (result == 'problem') {
            $('.foundicon-remove').show('block');
            setTimeout(function(){$('.foundicon-remove').hide();}, 300);
        }
    }

    ui.setUserDetails = function() {
        $('#user')
            .html('<a href="' + osmly.settings.writeApi + '/user/' +
                osmly.token('user') + '/edits" target="_blank">' +
                osmly.token('user') + '</a>')
            .show('block');
    };

    return ui;
}());
