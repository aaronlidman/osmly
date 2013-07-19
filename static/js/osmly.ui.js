osmly.ui = function() {

    var ui = {},
        settings = osmly.settings;

    function initialize() {
        if (!settings.demo && osmly.user.token('token') && osmly.user.token('secret')) {
            userDetailsUI();
            next();
        } else {
            if (settings.demo) $('#login').text('Demonstration »');

            $('#login').fadeIn(500);
        }

        bind();
    }

    function bind() {
        $('#login').click(function() {
            ui.notify('');

            if (settings.demo) {
                $('#login').fadeOut(500);
                osmly.item.next();
            } else {
                $('#login').fadeOut(500);
                request_oauth();
            }
        });

        $('#instruction').click(function() {
            $('#instruction-modal').reveal({
                 animation: 'fade',
                 animationspeed: 100,
                 closeonbackgroundclick: true,
                 dismissmodalclass: 'close-reveal-modal'
            });
        });

        $('#changeset').click(function(e) {
            e.preventDefault();
            $('#changeset-modal').reveal({
                 animation: 'fade',
                 animationspeed: 100,
                 closeonbackgroundclick: true,
                 dismissmodalclass: 'close-reveal-modal'
            });
        });

        $('#update-change').click(function() {
            settings.changesetTags.push(['comment', $('#changeset-form').text()]);
            updateChangeset(token('changeset_id'), function() {
                $('#changeset-modal').trigger('reveal:close');
                $('#notify').fadeOut(250);
            });
        });

        $('#josm').click(function() {
            $('#reset').click();

            var id = osmly.current.id,
                geojson = osmly.current.layer.toGeoJSON(),
                osmChange = toOsm(geojson),
                request = settings.featuresApi + 'db=' + settings.db + '&id=' + id + '&action=osc',
                bbox = osmly.current.bbox;

            $.ajax({
                type: 'POST',
                url: request,
                crossDomain: true,
                data: {osc: osmChange}
            }).done(function() {
                // there's no way to both load data from the api and import a file
                // so we do them seperately with two requests

                $.ajax('http://127.0.0.1:8111/load_and_zoom?left=' + bbox[0] +
                    '&right=' + bbox[2] + '&top=' + bbox[3] + '&bottom=' + bbox[1]
                ).done(function() {
                    $.ajax('http://127.0.0.1:8111/import?url=' + request)
                    .done(function() {
                        $('#reusable-modal span').text('Opened in JOSM');
                        $('#reusable-modal').reveal({
                             animation: 'fade',
                             animationspeed: 100,
                             closeonbackgroundclick: true,
                             dismissmodalclass: 'close-reveal-modal'
                        });
                        // fade this out after some seconds (idk 10-15?)
                        // then show an action dialog, to determine what was done with that feature
                    });
                }).fail(function() {
                    $('#reusable-modal span').text('JOSM doesn\'t seem to be running. Make sure you start it first.');
                    $('#reusable-modal').reveal({
                         animation: 'fade',
                         animationspeed: 100,
                         closeonbackgroundclick: true,
                         dismissmodalclass: 'close-reveal-modal'
                    });
                });
            });

        });

        $('#osmlink').click(function() {
            window.open(osmly.current.osmlink);
        });

    }

    ui.notify = function(string) {
        if (string !== '') string = '<span>' + string + '</span>';
        string = '<img src="static/images/loader.gif" />' + string;

        $('#notify')
            .html(string)
            .show();

        // don't forget to hide #notify later
        // $('#notify').fadeOut(250);
    };

    ui.remove = function(selector) {
        // to make it easier to remove jquery later
        $(selector).remove();
    };

    function clearItem() {
        // destroy osmly.item also?
    }

    function nextItem() {
        ui.notify('getting next item');
        ui.remove('#tags li');
    }

    initialize();
    return ui;
};
