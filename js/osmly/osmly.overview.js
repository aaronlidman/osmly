osmly.overview = (function () {
    var overview = {};

    function buildTable() {
        // will probably need to paginate over ~1000 items
            // right now it's pretty quick w/ 1200 on chrome
            // firefox is a bit slow
        // index from simple.py: id, problem, done, user, time
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
                    // checkmark for done items
                    if (items[a][b] === 1) {
                        text = '&#x2713;';
                    } else if (items[a][b] === 2) {
                        text = 'marked';
                    } else {
                        text = '';
                    }
                } else if (b == 4) {
                    if (items[a][b]) {
                        var date = new Date(items[a][b]*1000),
                            months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                        text = months[date.getMonth()] + ' ' + date.getDate() + ' ' + date.getFullYear() + ' ' +
                            date.getHours() + ':' + date.getMinutes();
                    }
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

        update_row_count();
    }

    function request(query, callback) {
        $.ajax({
            url: query,
            cache: false
        }).done(function(items){
            overview.data = JSON.parse(items);
            overview.rawData = JSON.parse(items);
            if (callback) callback();
        });
    }

    overview.refresh = function() {
        request(
            osmly.settings.featuresApi + 'db=' + osmly.settings.db + '&overview',
            function() {
                buildTable();
                problem_selection();
                user_selection();
            }
        );
    };

    function filter(options){
        // {'problem': 1, 'user': 'Joe Fake Name'}
        // also takes values as a list of multiple possible values
            // {'problem': ['no_park', 'bad_imagery', 'you_ugly']}
            // or even better: {'problem': unique('problem')}
        // index from simple.py: id, problem, done, user, time
        // a value from each key must hit
        var ndx = {
            'problem': 1,
            'done': 2,
            'user': 3,
            'time': 4
        };

        var items = overview.rawData,
            out = [];

        for (var a = 0; a < items.length; a++) {
            var keep = false;
            for (var option in options) {
                if (typeof options[option] == 'object') {
                    if (options[option].indexOf(items[a][ndx[option]]) !== -1) {
                        keep = true;
                    }
                } else if (items[a][ndx[option]] == options[option]) {
                    keep = true;
                }
                if (keep) out.push(items[a]);
            }
        }
        overview.data = out;
    }

    function unique(column) {
        // lists unique values for a given column
        // probably only useful for 'problem' and 'user'
        var ndx = {
            'problem': 1,
            'done': 2,
            'user': 3,
            'time': 4
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

    overview.click_everything = function() {
        overview.data = overview.rawData;
        buildTable();
    };

    overview.click_red = function() {
        filter({
            'problem': unique('problem'),
            'done': 0
        });
        buildTable();
    };

    overview.click_green = function() {
        filter({'done': [1, 2]});
        buildTable();
    };

    overview.drop_selection = function(select) {
        // gets the value of the changed dropdown menu and filters based on it
        // also selects the parent radio button
        var selector = document.getElementById(select),
            value = selector.options[selector.selectedIndex].value,
            dict = {};
        value = value.split(':');
        dict[value[0]] = value[1];
            // dict is necessary because value = {value[0]: value[1]} didn't work
                // why doesn't that work?

        // filter the items, rebuild the table w/ filtered items
        filter(dict);
        buildTable();

        // select the parent radio button
        var parentRadio = select.split('-')[0],
            controls = document.getElementById('overview-controls'),
            radios = controls.getElementsByTagName('input');

        for (var i = 0; i < radios.length; i++) {
            if (radios[i].type === 'radio') {
                if (radios[i].value == parentRadio) {
                    radios[i].checked = true;
                } else {
                    radios[i].checked = false;
                }
            }
        }
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

        // trash the tbody
        if (document.getElementsByTagName('tbody').length) {
            var table = document.getElementById('main_table');
            table.removeChild(table.getElementsByTagName('tbody')[0]);
        }

        // reset the radio button to 'everything'
        var controls = document.getElementById('overview-controls'),
            radios = controls.getElementsByTagName('input');
        for (var i = 0; i < radios.length; i++) {
            if (radios[i].type === 'radio') {
                if (radios[i].value == 'everything') {
                    radios[i].checked = true;
                } else {
                    radios[i].checked = false;
                }
            }
        }

        // remove the count
        var count = document.getElementById('count');
        count.innerHTML = '';
    };

    overview.modalDone = function() {
        osmly.overview.refresh();
        $('#markdone-modal').trigger('reveal:close');
    };

    return overview;
}());
