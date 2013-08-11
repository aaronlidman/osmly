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

        bind();
    };

    function bind() {
        $('#login').click(function() {
            ui.notify('');

            if (osmly.settings.demo) {
                $('#login').fadeOut(500);
                osmly.item.next();
            } else {
                $('#login').fadeOut(500);
                osmly.auth.authenticate(function() {
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

        $('#go_everything').click(function(){
            $('#everything_block_bg').fadeIn(100);
            $('#everything-controls').fadeIn(100);
            $('#everything_block').fadeIn(100, osmly.everything.go);
        });

        $('#everything_block_bg').click(function(){
            $('#everything_block_bg').fadeOut(100);
            $('#everything-controls').fadeOut(100);
            $('#everything_block').fadeOut(100, function(){
                osmly.everything.close();
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
            // update the same db, could send it to gist instead
            $('#reset').click();

            var id = osmly.item.id,
                geojson = osmly.item.layer.toGeoJSON(),
                osm = osmly.item.toOsm(geojson),
                request = osmly.settings.featuresApi + 'db=' + osmly.settings.db + '&id=' + id + '&action=remote',
                bbox = osmly.item.bbox;

            function callback() {
                // there's no way to both load data from the api and import a file
                // so we do them seperately with two requests
                $.ajax('http://127.0.0.1:8111/load_and_zoom?left=' + bbox[0] +
                    '&right=' + bbox[2] + '&top=' + bbox[3] + '&bottom=' + bbox[1]
                ).done(function() {
                    $.ajax('http://127.0.0.1:8111/import?url=' + request)
                    .done(function() {
                        $('#remote-edit-modal').reveal({
                            animation: 'fade',
                            animationspeed: 100
                        });
                    });
                }).fail(function() {
                    $('#reusable-modal span').text('JOSM doesn\'t seem to be running. Start JOSM and try again.');
                    $('#reusable-modal').reveal({
                        animation: 'fade',
                        animationspeed: 100
                    });
                });
            }

            osmly.connect.updateItem('remote', {remote: osm}, callback);
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
            // true, just implying if they can click it, it was editable to begin with
        });

        $('#tags').on('click', '.minus', function() {
            if ($('#tags li').length > 1) {
                $(this).parent().remove();
                equalizeTags();
            }
        });

        $('#tags').on('keypress', '.k, .v', function(){
            equalizeTags();
        });

        $('#add-new-tag').click(function() {
            $('#tags ul').append(
                '<li>' +
                '<span class="k" spellcheck="false" contenteditable="true"></span>' +
                '<span class="v" spellcheck="false" contenteditable="true"></span>' +
                '<span class="minus">-</span>' +
                '</li>');
            equalizeTags();
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
        $('#top-right, #bottom-right, #action-block').fadeIn(250);

        if (isEditable) {
            $('#tags').fadeIn(250);
            equalizeTags();
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
                $('#tags ul').append(
                    '<li>' +
                    '<span class="k" spellcheck="false" contenteditable="true">' +
                    tag + '</span>' +
                    '<span class="v" spellcheck="false" contenteditable="true">' +
                    properties[tag] + '</span>' +
                    '<span class="minus">-</span>' +
                    '</li>');
            }
        }
    }

    function equalizeTags() {
        // doesn't work until the selectors are visibile?
        // janky & inefficient, need to look into how the plugin works
        $('ul').equalize({
            children: '.k',
            equalize: 'width',
            reset: true});
        $('.k').width( $('.k').width() + 13);

        $('ul').equalize({
            children: '.v',
            equalize: 'width',
            reset: true});
        $('.v').width( $('.v').width() + 13);
    }

    function hide() {
        $('#action-block, #tags, #bottom-right').hide();
        osmly.map.closePopup();
        osmly.map.removeLayer(osmly.item.layer);
        if (osmly.item.contextLayer) osmly.map.removeLayer(osmly.item.contextLayer);
    }

    ui.teardown = function() {
        // $("#problem, #submit").removeAttr('style');
        $('#tags li').remove();
    };

    function skip() {
        hide();
        osmly.ui.teardown();
        $('.foundicon-right-arrow')
            .show()
            .fadeOut(750);
        osmly.item.next();
        console.log('skipped');
    }

    function submit(result) {
        // should really split submit from problem
        hide();

        if (osmly.settings.demo) {
            osmly.ui.teardown();
            console.log(osmly.item.layer.toGeoJSON());
            if (result === 'submit') {
                var geojson = osmly.item.layer.toGeoJSON();
                // console.log(toOsm(geojson));
                // console.log(toOsmChange(geojson));
            }
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

    ui.josmResults = function(id) {
        // clicking the results buttons from the #remote-edit-modal

    };

    return ui;
}());
