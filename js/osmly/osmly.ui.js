osmly.ui = (function() {
    var ui = {};
// selectors are still very mixed
// $, select, qwery
// working on events first
    ui.initialize = function() {
        var login = qwery('#login')[0];
        if (osmly.settings.demo) {
            if (osmly.settings.demo) login.innerText = 'Demonstration »';
            login.classList.remove('hide');
            login.classList.add('fadeIn');
        } else {
            if (osmly.auth.authenticated()) {
                osmly.ui.setUserDetails();
                osmly.item.next();
            } else {
                osmly.token('user', 'demo');
                login.classList.add('show','fadeIn');
            }
        }

        document.title = osmly.settings.title;
        qwery('#title')[0].innerText = osmly.settings.title;
        bind();
    };

    function bind() {
        bean.on(qwery('#login'), 'click', function() {
            ui.notify('');
            if (osmly.settings.demo) {
                qwery('#login')[0].classList.add('fadeOut');
                osmly.item.next();
            } else {
                osmly.auth.authenticate(function() {
                    qwery('#login')[0].classList.add('fadeOut');
                    osmly.connect.getDetails();
                    osmly.item.next();
                });
            }
        });

        bean.on(qwery('#go_overview')[0], 'click', function(){
            qwery('#overview_bg')[0].classList.add('fadeIn');
            qwery('#overview-controls')[0].classList.add('fadeIn');
            qwery('#overview_block')[0].classList.add('fadeIn');
            osmly.overview.refresh();
        });

        bean.on(qwery('#overview_bg')[0],'click', function(){
            $('#overview_bg, #overview-controls, #overview_block').hide();
            // qwery('#overview_bg')[0].classList.add('hide');
            // qwery('#overview-controls')[0].classList.add('hide');
            // qwery('#overview_block')[0].classList.add('hide');
            osmly.overview.close();
        });

        bean.on(qwery('#update-change')[0], 'click', function() {
            osmly.settings.changesetTags['comment'] = $('#changeset-form').text();
            osmly.connect.updateComment(function() {
                CSSModal.close();
                $('#notify').fadeOut(250);
            });
        });

        bean.on(qwery('#josm')[0], 'click', function() {
            $('#reset').click();
            osmly.connect.editInJosm(osmly.item.id);
        });

        bean.on(qwery('#osmlink'), 'click', window.open(osmly.osmlink));
        bean.on(qwery('#skip')[0], 'click', skip);
        bean.on(qwery('#submit')[0], 'click', submit(event.target.id));

        bean.on(qwery('#problem')[0], 'click', function() {
            submit($('#problem').val());
            $('#problem').val('problem');
                // resets problem menu
        });

        bean.on('#reset'[0], 'click', function() {
            hide();
            osmly.ui.teardown();
            osmly.item.setItemLayer(osmly.item.data);
            ui.setupItem(osmly.item.data.properties);
            ui.displayItem();
        });

        bean.on('#tags'[0], 'click', '.minus', function() {
            if ($('#tags tr').length > 1) {
                $(this).parent().remove();
            }
        });

        bean.on('#add-new-tag'[0], 'click', function() {
            $('#tags tbody').append(
                '<tr>' +
                '<td class="k" spellcheck="false" contenteditable="true"></td>' +
                '<td class="v" spellcheck="false" contenteditable="true"></td>' +
                '<td class="minus">-</td>' +
                '</tr>');
        });

        bean.on('#main_table'[0], 'click', '.editjosm', function(){
            if (osmly.token('user') == 'demo') {
                pleaseLogin();
            } else {
                $('#remote-edit-modal button')[1].setAttribute('data-id', this.getAttribute('data-id'));
                osmly.connect.editInJosm(this.getAttribute('data-id'));
            }
        });

        bean.on('#remote-edit-modal', 'click', 'button', function(){
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

        bean.on('#main_table', 'click', '.markdone', function(){
            if (osmly.token('user') == 'demo') {
                pleaseLogin();
            } else {
                $('#markdone-modal button')[1].setAttribute('data-id', this.getAttribute('data-id'));
                CSSModal.open('markdone-modal');
            }
        });

        bean.on('#markdone-modal', 'click', 'button', function(){
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
            .show();
        // don't forget to hide #notify later
        // $('#notify').fadeOut(250);
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

        $('#notify, #login').fadeOut(250);
        $('#problem, #submit, #title, #top-bar, #bottom-right, #action-block').fadeIn(250);

        if (isEditable) {
            $('#tags').fadeIn(250);
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
        $('.foundicon-right-arrow')
            .show()
            .fadeOut(750);
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
           $('.foundicon-up-arrow')
               .show()
               .fadeOut(750);
        } else if (result == 'problem') {
            $('.foundicon-remove')
                .show()
                .fadeOut(750);
        }
    }

    ui.setUserDetails = function() {
        $('#user')
            .html('<a href="' + osmly.settings.writeApi + '/user/' +
                osmly.token('user') + '/edits" target="_blank">' +
                osmly.token('user') + '</a>')
            .fadeIn(500);
    };

    return ui;
}());
