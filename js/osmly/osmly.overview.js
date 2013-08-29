osmly.overview = (function () {
    var overview = {};

    function buildTable(callback) {
        // will probably need to paginate over ~1000 items
            // right now it's pretty quick w/ 1200 on chrome
            // firefox is a bit slow
        // index from simple.py: id, problem, submit, user
        items = overview.data;
        var table = document.getElementById('main_table');

        if (table.getElementsByTagName('tbody').length) {
            table.removeChild(table.getElementsByTagName('tbody')[0]);
        }

        var tbody = document.createElement('tbody');

        for (var a = 0; a < items.length; a++) {
            var tr = document.createElement('tr');
            for (var b = 0; b < items[a].length; b++) {
                var column = document.createElement('td'),
                    text = items[a][b];

                if (b == 2) {
                    // checkmark for submitted items
                    if (items[a][b] > 0) text = '&#x2713;';
                    else text = '';
                }

                column.innerHTML = text;
                tr.appendChild(column);
            }

            var markdone = document.createElement('td');
            if (items[a][2] === 0) {
                markdone.innerHTML = '<span data-id="' + items[a][0] + '" class="markdone">mark as done?</span>';
            }
            tr.appendChild(markdone);

            var editjosm = document.createElement('td');
            if (items[a][2] === 0) {
                editjosm.innerHTML = '<span data-id="' + items[a][0] + '" class="editjosm">edit in JOSM</span>';
            }
            tr.appendChild(editjosm);

            if (items[a][2] > 0) {
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
                overview.data = items;
                overview.rawData = items;
                // they both start this way, .data get modified
                if (callback) callback();
            }
        });
    }

    // entry point
    overview.refresh = function(callback) {
        osmly.ui.notify('Loading...');
        request(function() {
            buildTable(callback);
            problem_selection();
            user_selection();
        });
    };

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

        var items = overview.rawData,
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
        overview.data = out;
    }

    function unique(column) {
        // lists unique values for a given column
        // probably only useful for 'problem' and 'user'
        var ndx = {
            'problem': 1,
            'submit': 2,
            'user': 3
        };
        
        var items = overview.rawData,
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
            html = '',
            select = document.getElementById('problems-select');

        for (var a = 0; a < problems.length; a++) {
            html += '<option value="problem:' + problems[a] + '">' + problems[a] + '</option>';
        }

        select.innerHTML = html;
    }

    function user_selection() {
        var user = unique('user'),
            html = '',
            select = document.getElementById('users-select');

        for (var a = 0; a < user.length; a++) {
            html += '<option value="user:' + user[a] +'">' + user[a] + '</option>';
        }

        select.innerHTML = html;
    }

    function changeRadio(value) {
        var controls = document.getElementById('overview-controls'),
            inputs = controls.getElementsByTagName('input');

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

    overview.click_everything = function() {
        overview.data = overview.rawData;
        buildTable();
    };

    overview.click_red = function() {
        filter({
            'problem': unique('problem'),
            'submit': 0
        });
        changeRadio('red');
        buildTable();
    };

    overview.click_green = function() {
        filter({'submit': [1, 2, 3]});
            // filter needs an inverse
        changeRadio('green');
        buildTable();
    };

    overview.drop_selection = function(select) {
        // gets the value of the changed dropdown menu and filters based on it
        // also selects the parent radio button
        console.log(select);
        var selector = document.getElementById(select),
            value = selector.options[selector.selectedIndex].value,
            dict = {};
        value = value.split(':');
        dict[value[0]] = value[1];
            // dict is necessary because literal value = {value[0]: value[1]} didn't work
                // why doesn't that work?
        if (value[0] == 'problem') dict['submit'] = 0;
            // only want un-submitted problems, not strictly true but more useful

        filter(dict);
        buildTable();
        changeRadio(select.split('-')[0]);
    };

    function update_row_count() {
        var count = document.getElementById('count');

        if (overview.data.length === overview.rawData.length) {
            count.innerHTML = overview.data.length;
        } else {
            count.innerHTML = overview.data.length.toString() + '<span>/' + overview.rawData.length + '</span>';
        }
    }

    overview.close = function() {
        overview.data = false;
        overview.rawData = false;

        if (document.getElementsByTagName('tbody').length) {
            var table = document.getElementById('main_table');
            table.removeChild(table.getElementsByTagName('tbody')[0]);
        }

        changeRadio('everything');
        var count = document.getElementById('count');
        count.innerHTML = '';
    };

    overview.modalDone = function(callback) {
        changeRadio('everything');
        osmly.overview.refresh(callback);
    };

    return overview;
}());
