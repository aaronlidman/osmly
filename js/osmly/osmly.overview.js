osmly.overview = (function () {
    var overview = {},
        ov = {};

    overview.go = function() {
        $('#overview_bg, #overview-controls, #overview_block').fadeIn(250);
        refresh();
        bind();
    };

    function bind() {
        $('#main_table').on('click', '.editjosm', function(){
            osmly.connect.editInJosm(this.getAttribute('data-id'));
        });

        $('#main_table').on('click', '.markdone', function(){
            if (osmly.auth.authenticated() && token('user')) {
                $('#markdone-modal button')[1].setAttribute('data-id', this.getAttribute('data-id'));
                CSSModal.open('markdone-modal');
            } else {
                osmly.ui.pleaseLogin();
            }
        });

        $('#overview_bg').on('click', function(){
            $('#overview_bg, #overview-controls, #overview_block').hide();
            close();
        });

        $('#everything').on('click', everything);
        $('#red').on('click', red);
        $('#green').on('click', green);
        $('#users').on('click', function(){
            drop_selection('users-select');
        });

        $('#users-select').on('click', function(){
            drop_selection('users-select');
        });
        $('#problems').on('click', function(){
            drop_selection('problems-select');
        });
        $('#problems-select').on('click', function(){
            drop_selection('problems-select');
        });
        $('#markdone-modal').on('click', 'button', markDone);

    }

    function unbind() {
        $('#main_table').off();
        $('#overview_bg').off();
        $('#everything').off();
        $('#red').off();
        $('#green').off();
        $('#users').off();
        $('#users-select').off();
        $('#problems').off();
        $('#problems-select').off();
        $('#markdone-modal').off();
    }

    function buildTable(callback) {
        // will probably need to paginate over ~1000 items
            // right now it's pretty quick w/ 1200 on chrome
            // firefox is a bit slow
        // index from simple.py: id, problem, submit, user
        var items = ov.data,
            table = byId('main_table');

        if (table.getElementsByTagName('tbody').length) {
            table.removeChild(table.getElementsByTagName('tbody')[0]);
        }

        var tbody = createE('tbody');

        for (var a = 0; a < items.length; a++) {
            var tr = createE('tr');
            for (var b = 0; b < items[a].length; b++) {
                var column = createE('td'),
                    text = items[a][b];

                if (b == 2) {
                    // checkmark for submitted items
                    if (items[a][b] !== '') text = '&#x2713;';
                    else text = '';
                }

                column.innerHTML = text;
                tr.appendChild(column);
            }

            var markdone = createE('td');
            if (items[a][2] === '') {
                markdone.innerHTML = '<span data-id="' + items[a][0] + '" class="markdone">mark as done?</span>';
            }
            tr.appendChild(markdone);

            var editjosm = createE('td');
            if (items[a][2] === '') {
                editjosm.innerHTML = '<span data-id="' + items[a][0] + '" class="editjosm">edit in JOSM</span>';
            }
            tr.appendChild(editjosm);

            if (items[a][2] !== '') {
                tr.setAttribute('class', 'success');
            } else if (items[a][1] !== '') {
                tr.setAttribute('class', 'error');
            }

            tbody.appendChild(tr);
            table.appendChild(tbody);
        }
        $('#notify').hide();
        update_row_count();
        if (callback) callback();
    }

    function request(callback) {
        reqwest({
            url: osmly.settings.db + '&overview',
            cache: false,
            crossOrigin: true,
            type: 'json',
            success: function(items){
                ov.data = items;
                ov.rawData = items;
                // they both start this way, .data get modified
                if (callback) callback();
            }
        });
    }

    function refresh(callback) {
        osmly.ui.notify('Loading...');
        request(function() {
            buildTable(callback);
            problem_selection();
            user_selection();
        });
    }

    function filter(options) {
        // {'problem': 1, 'user': 'Joe Fake Name'}
        // also takes values as a list of multiple possible values
            // {'problem': ['no_park', 'bad_imagery', 'you_ugly']}
            // or even better: {'problem': unique('problem')}
        // index from simple.py: id, problem, submit, user
        // if multiple keys are provided a value from each key must be true
        var ndx = {
            'problem': 1,
            'submit': 2,
            'user': 3
        };

        var items = ov.rawData,
            optionslength = Object.keys(options).length,
            out = [];

        for (var a = 0; a < items.length; a++) {
            var keep = [];
            for (var option in options) {
                if (typeof options[option] == 'object') {
                    if (options[option].indexOf(items[a][ndx[option]]) !== -1) {
                        keep.push(true);
                    }
                } else if (items[a][ndx[option]] == options[option]) {
                    keep.push(true);
                }
            }
            if (keep.length === optionslength) {
                out.push(items[a]);
            }
        }
        ov.data = out;
    }

    function unique(column) {
        // lists unique values for a given column
        // probably only useful for 'problem' and 'user'
        var ndx = {
            'problem': 1,
            'submit': 2,
            'user': 3
        };
        
        var items = ov.rawData,
            vals = [];

        for (var a = 0; a < items.length; a++) {
            if (items[a][ndx[column]] && vals.indexOf(items[a][ndx[column]]) === -1) {
                vals.push(items[a][ndx[column]]);
            }
        }

        return vals;
    }

    function problem_selection() {
        var problems = unique('problem'),
            html = '';

        for (var a = 0; a < problems.length; a++) {
            html += '<option value="problem:' + problems[a] + '">' + problems[a] + '</option>';
        }
        byId('problems-select').innerHTML = html;
    }

    function user_selection() {
        var user = unique('user'),
            html = '';

        for (var a = 0; a < user.length; a++) {
            html += '<option value="user:' + user[a] +'">' + user[a] + '</option>';
        }
        byId('users-select').innerHTML = html;
    }

    function changeRadio(value) {
        var inputs = byId('overview-controls').getElementsByTagName('input');

        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i].type === 'radio') {
                if (inputs[i].value == value) {
                    inputs[i].checked = true;
                } else {
                    inputs[i].checked = false;
                }
            }
        }
    }

    function everything() {
        ov.data = ov.rawData;
        buildTable();
    }

    function red() {
        filter({
            'problem': unique('problem'),
            'submit': ''
        });
        changeRadio('red');
        buildTable();
    }

    function green() {
        filter({'submit': unique('submit')});
        changeRadio('green');
        buildTable();
    }

    function drop_selection(select) {
        var selector = byId(select),
            value = selector.options[selector.selectedIndex].value,
            dict = {};
        value = value.split(':');
        dict[value[0]] = value[1];
            // dict is necessary because literal value = {value[0]: value[1]} didn't work
                // why doesn't that work?
        if (value[0] == 'problem') dict['submit'] = '';
            // only want un-submitted problems, not strictly true but more useful

        filter(dict);
        buildTable();
        changeRadio(select.split('-')[0]);
    }

    function update_row_count() {
        if (ov.data.length === ov.rawData.length) {
            byId('count').innerHTML = ov.data.length;
        } else {
            byId('count').innerHTML = ov.data.length.toString() + '<span>/' + ov.rawData.length + '</span>';
        }
    }

    function close() {
        ov.data = false;
        ov.rawData = false;

        if (byTag('tbody').length) {
            byId('main_table').removeChild(byId('main_table').getElementsByTagName('tbody')[0]);
        }

        changeRadio('everything');
        byId('count').innerHTML = '';
        unbind();
    }

    function markDone() {
        if (this.getAttribute('data-type') == 'yes') {
            osmly.connect.updateItem('submit', {submit: 'Mark as Done'}, function(){
                osmly.overview.modalDone(function(){
                    CSSModal.close();
                });
            }, this.getAttribute('data-id'));
        } else {
            CSSModal.close();
        }
    }

    overview.modalDone = function(callback) {
        changeRadio('everything');
        refresh(callback);
    };

    return overview;
}());
