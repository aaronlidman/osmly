// import is a reserved word but they don't apply to properties
osmly.import = (function() {
    var imp = {};

    imp.go = function(){
        bind();
        osmly.item.next();
    };

    function bind() {
        // bottom-right buttons
        $('#josm').on('click', josm);
        $('#reset').on('click', reset);
        $('#osmlink').on('click', function(){
            window.open(osmly.osmlink);
        });

        // osmly.add botton-left buttons
        $('#skip').on('click', skip);
        $('#problem').on('click', problem);
        $('#submit').on('click', submit);
        $('#add-new-tag').on('click', addTag);
        $('#tags').on('click', '.minus', function(){
            if ($('#tags tr').length > 1) this.parentNode.remove();
        });
    }

    imp.setupItem = function(properties) {
        populateTags(properties);
    };

    imp.displayItem = function() {
        osmly.item.layer.addTo(osmly.map);

        if (osmly.item.contextLayer) {
            osmly.item.contextLayer.addTo(osmly.map);
            osmly.item.contextLayer.bringToFront();
        }

        $('#login').fadeOut(250);
        $('#notify').hide();
        $('#hold-problem, #submit, #bottom-right, #action-block').fadeIn(250);

        if (osmly.item.isEditable) {
            $('#tags').fadeIn(250);
        } else {
            $('#hold-problem, #submit').fadeOut(250);
            $('#reusable-modal .modal-content').html('<h3>This feature is too complex. <a>Edit it in JOSM?</a></h3>');
            // put an 'Edit in JOSM' button right there, when clicked close the modal and let the other modal open
            // literally bind, $('#josm').click()
            CSSModal.open('reusable-modal');
        }
    };

    function populateTags(properties) {
        for (var tag in properties) {
            if (properties[tag] !== null && properties[tag] !== 'null') {
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

    imp.hideItem = function(callback) {
        $('#bottom-right, #action-block, #tags').fadeOut(250, function(){
            if (callback) callback();
        });
        osmly.map.closePopup();
        osmly.map.removeLayer(osmly.item.layer);
        if (osmly.item.contextLayer) osmly.map.removeLayer(osmly.item.contextLayer);
    };

    function skip() {
        imp.hideItem();
        $('#tags tr').remove();
        leftToRight($('.foundicon-right-arrow'));
        osmly.item.next();
    }

    function submit() {
        imp.hideItem();

        if (osmly.auth.authenticated() && token('user')) {
            osmly.connect.updateItem('submit');
            osmly.connect.openChangeset(osmly.connect.submitToOSM);
        } else {
            $('#tags tr').remove();
            osmly.item.next();
        }
        bigUp($('.foundicon-up-arrow'));
    }

    function problem() {
        imp.hideItem();

        if (osmly.auth.authenticated() && token('user')) {
            osmly.connect.updateItem('problem', {
                problem: $('#problem').val()
            });
        }
        $('.foundicon-remove').show(function(){
            setTimeout(function(){
                $('.foundicon-remove').fadeOut(250);
            }, 250);
        });
        $('#problem').val('problem');
        $('#tags tr').remove();
        osmly.item.next();
    }

    function demo() {
        $('#login, #demo').fadeOut(250);
        CSSModal.open('demo-modal');
        $('#demo-mode').show();
        osmly.item.next();
    }

    function josm() {
        $('#reset').trigger('click');
        osmly.connect.editInJosm(osmly.item.id);
    }

    function reset() {
        $('#tags tr').remove();
        imp.hideItem(imp.displayItem);
        osmly.item.setItemLayer(osmly.item.data);
        populateTags(osmly.item.data.properties);
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
            var id = osmly.item.id;
            if (this.getAttribute('data-id')) id = this.getAttribute('data-id');

            if (osmly.auth.authenticated() && token('user')) {
                osmly.connect.updateItem('submit', {submit: 'JOSM'}, function(){
                    CSSModal.close();
                    if (id == osmly.item.id) {
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

    function addTag() {
        $('#tags tbody').append(
            '<tr>' +
            '<td class="k" spellcheck="false" contenteditable="true"></td>' +
            '<td class="v" spellcheck="false" contenteditable="true"></td>' +
            '<td class="minus">-</td>' +
            '</tr>');
    }

}());
