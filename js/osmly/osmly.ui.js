osmly.ui = (function() {
    var ui = {};

    ui.initialize = function() {
        if (osmly.settings.demo) {
            if (osmly.settings.demo) $('#login').text('Demonstration »');
            $('#login').fadeIn(500);
        } else {
            if (osmly.auth.authenticated()) {
                osmly.ui.setUserDetails();
                osmly.item.next();
            } else {
                osmly.token('user', 'demo');
                $('#login').fadeIn(500);
            }
        }

        document.title = osmly.settings.title;
        $('#title').text(osmly.settings.title);
        bind();
    };

    function bind() {
        $('#login').click(function() {
            ui.notify('');
            if (osmly.settings.demo) {
                $('#login').fadeOut(500);
                osmly.item.next();
            } else {
                osmly.auth.authenticate(function() {
                    $('#login').fadeOut(500);
                    osmly.connect.getDetails();
                    osmly.item.next();
                });
            }
        });

        $('#instruction').click(function() {
            $('#instruction-modal').reveal({
                animation: 'fade',
                animationspeed: 100
            });
        });

        $('#changeset').click(function(e) {
            e.preventDefault();
            $('#changeset-modal').reveal({
                animation: 'fade',
                animationspeed: 100
            });
        });

        $('#go_overview').click(function(){
            $('#overview_bg').fadeIn(100);
            $('#overview-controls').fadeIn(100);
            $('#overview_block').fadeIn(100, osmly.overview.refresh);
        });

        $('#overview_bg').click(function(){
            $('#overview_bg').fadeOut(100);
            $('#overview-controls').fadeOut(100);
            $('#overview_block').fadeOut(100, function(){
                osmly.overview.close();
            });
        });

        $('#update-change').click(function() {
            osmly.settings.changesetTags['comment'] = $('#changeset-form').text();
            osmly.connect.updateComment(function() {
                $('#changeset-modal').trigger('reveal:close');
                $('#notify').fadeOut(250);
            });
        });

        $('#josm').click(function() {
            $('#reset').click();
            osmly.connect.editInJosm(osmly.item.id);
        });

        $('#osmlink').click(function() {
            window.open(osmly.osmlink);
        });

        $('#skip').click(skip);

        $('#submit').click(function() {
            submit(event.target.id);
        });

        $('#problem').change(function() {
            submit($('#problem').val());
            $('#problem').val('problem');
                // resets problem menu
        });

        $('#reset').click(function() {
            hide();
            osmly.ui.teardown();
            osmly.item.setItemLayer(osmly.item.data);
            ui.setupItem(osmly.item.data.properties);
            ui.displayItem();
        });

        $('#tags').on('click', '.minus', function() {
            if ($('#tags tr').length > 1) {
                $(this).parent().remove();
            }
        });

        $('#add-new-tag').click(function() {
            $('#tags tbody').append(
                '<tr>' +
                '<td class="k" spellcheck="false" contenteditable="true"></td>' +
                '<td class="v" spellcheck="false" contenteditable="true"></td>' +
                '<td class="minus">-</td>' +
                '</tr>');
        });

        $('#main_table').on('click', '.editjosm', function(){
            if (osmly.token('user') == 'demo') {
                pleaseLogin();
            } else {
                $('#remote-edit-modal button')[1].setAttribute('data-id', this.getAttribute('data-id'));
                osmly.connect.editInJosm(this.getAttribute('data-id'));
            }
        });

        $('#remote-edit-modal').on('click', 'button', function(){
            var result = this.getAttribute('data-type'),
                id = this.getAttribute('data-id');

            if (result == 'no') {
                $('#remote-edit-modal').trigger('reveal:close');
            } else if (result == 'yes') {
                osmly.connect.updateItem('submit', {done: 3}, function(){
                    osmly.overview.modalDone(function(){
                        $('#remote-edit-modal').trigger('reveal:close');
                    });
                }, id);
            }
        });

        $('#main_table').on('click', '.markdone', function(){
            if (osmly.token('user') == 'demo') {
                pleaseLogin();
            } else {
                $('#markdone-modal button')[1].setAttribute('data-id', this.getAttribute('data-id'));
                $('#markdone-modal').reveal({
                    animation: 'fade',
                    animationspeed: 100
                });
            }
        });

        $('#markdone-modal').on('click', 'button', function(){
            var result = this.getAttribute('data-type'),
                id = this.getAttribute('data-id');

            if (result == 'no') {
                $('#markdone-modal').trigger('reveal:close');
            } else if (result == 'yes') {
                osmly.connect.updateItem('submit', {done: 2}, function(){
                    osmly.overview.modalDone(function(){
                        $('#markdone-modal').trigger('reveal:close');
                    });
                }, id);
            }
        });
    }

    function pleaseLogin() {
        $('#reusable-modal span').text(
            'Please login. It helps track your changes so other users don\'t edit the same feature.');
        $('#reusable-modal').reveal({
            animation: 'fade',
            animationspeed: 200,
            closeonbackgroundclick: true
        });
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
            $('#reusable-modal span').html(
                'This feature is too complex. <a>Edit it in JOSM?</a>');
            // put an 'Edit in JOSM' button right there, when clicked close the modal and let the other modal open
            // literally bind, $('#josm').click()
            $('#reusable-modal').reveal({
                animation: 'fade',
                animationspeed: 200,
                closeonbackgroundclick: true
            });
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
