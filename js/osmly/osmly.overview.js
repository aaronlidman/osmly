osmly.overview = (function () {
    var overview = {};

    function buildTable() {
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
                markdone.innerHTML = '<span class="markdone">mark as done?</span>';
            }
            tr.appendChild(markdone);

            var editjosm = document.createElement('td');
            if (items[a][2] === 0) {
                editjosm.innerHTML = '<span class="editjosm">edit in JOSM</span>';
            }
            tr.appendChild(editjosm);

            if (items[a][2] === 1) {
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

    function refresh(callback) {
        request(
            osmly.settings.featuresApi + 'db=' + osmly.settings.db + '&overview',
            callback
        );
    }

    function filter(options){
        // {'problem': 1, 'user': 'Joe Fake Name'}
        // also takes values as a list of multiple possible values
            // {'problem': ['no_park', 'bad_imagery', 'you_ugly']}
            // or even better: {'problem': unique('problem')}
        // index from simple.py: id, problem, done, user, time
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
            'problem': unique('problem')
        });
        buildTable();
    };

    overview.click_green = function() {
        filter({'done': 1});
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
                // seems like it should?

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
            table.removeChild(document.getElementsByTagName('tbody')[0]);
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

    overview.done = function(id) {
        // a special new modal w/ confirm/deny
        // update the item as done with the user
        console.log(id);
    };

    overview.edit = function(id) {
        // I'm in a hurry, this is a mess, mostly redundant (copy/paste from elsewhere in osmly)
        var request = osmly.settings.featuresApi + 'db=' + osmly.settings.db + '&id=' + id;

        $.ajax({
            url: request,
            cache: false
        }).done(function(data){
            data = JSON.parse(data)[0];
            data = JSON.parse(data);

            console.log(data);

            var id = data.properties.id,
                bbox = data.properties.bounds;

            // buffer the bounds
            bbox = [
                bbox[0] - 0.001,
                bbox[1] - 0.001,
                bbox[2] + 0.001,
                bbox[3] + 0.001
            ];

            // from osmly.item.js, renameProperties()
            for (var prop in osmly.settings.renameProperty) {
                var change = osmly.settings.renameProperty[prop];
                data.properties[change] = data.properties[prop];
            }

            // from osmly.item.js, usePropertiesAsTag()
            for (var prop in data.properties) {
                if (osmly.settings.usePropertyAsTag.indexOf(prop) === -1) {
                    data.properties[prop] = null;
                }
            }

            // from osmly.item.js, append()
            for (var append in osmly.settings.appendTag) {
                data.properties[append] = osmly.settings.appendTag[append];
            }

            var osm = osmly.item.toOsm(data);
            osmly.connect.updateItem('remote', {remote: osm}, callback, id);

            function callback() {
                $.ajax('http://127.0.0.1:8111/load_and_zoom?left=' + bbox[0] +
                    '&right=' + bbox[2] + '&top=' + bbox[3] + '&bottom=' + bbox[1]
                ).done(function() {
                    console.log('http://127.0.0.1:8111/import?url=' + request + '&action=remote');
                    $.ajax('http://127.0.0.1:8111/import?url=' + request + '&action=remote')
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
        });
    };

    overview.go = function() {
        refresh(function() {
            buildTable();
            problem_selection();
            user_selection();
        });
    };

    return overview;
}());
