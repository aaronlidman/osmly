osmly.everything = (function () {
    var everything = {};

    // todo: dom selections are way too wide right now

    function buildTable() {
        // index from simple.py: id, problem, done, user, time
        items = window.everything;

        if (document.getElementsByTagName('tbody').length) {
            // clear the way
            var table = document.getElementById('main_table');
            table.removeChild(document.getElementsByTagName('tbody')[0]);
        }

        var table = document.createElement('tbody');

        for (var a = 0; a < items.length; a++) {
            // rows
            var tr = document.createElement('tr');
            for (var b = 0; b < items[a].length; b++) {
                // columns
                var column = document.createElement('td');

                if (b == 2) {
                    // checkmark for done items
                    if (items[a][b] === 1) {
                        var text = '&#x2713;';
                    } else {
                        var text = '';
                    }
                } else {
                    var text = items[a][b];
                }

                if (b == 4) {
                    if (items[a][b]) {
                        var date = new Date(items[a][b]*1000),
                            months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                            text = months[date.getMonth()] + ' ' + date.getDate() + ' ' + date.getFullYear() + ' ' + 
                                date.getHours() + ':' + date.getMinutes();
                    }
                }

                column.innerHTML = text;
                tr.appendChild(column);
            }

            // mark as done
            var column = document.createElement('td');
            if (items[a][2] === 0) {
                // put a button in there, alert for confirmation
                // need to pass the id somehow
                // need to pass the id
                column.innerHTML = '<span style="cursor: pointer" ' +
                'href="" onclick=osmly.everything.done("' + items[a][0] +'")>mark as done?</span>';
            }
            tr.appendChild(column);

            // edit in josm
            var column = document.createElement('td');
            if (items[a][2] === 0) {
                // put a button in there, use modal for notifying it's ready/failed
                // need to pass the id
                column.innerHTML = '<span style="cursor: pointer" ' +
                'href="" onclick=osmly.everything.edit("' + items[a][0] +'")>edit in JOSM</span>';
            }
            tr.appendChild(column);

            // background-colors
            // careful with the order here, it's not obvious
            // some problems might have been fixed manually yet still have 'problem' in db
            if (items[a][2] === 1) {
                tr.setAttribute('class', 'success');
            } else if (items[a][1] != '') {
                tr.setAttribute('class', 'error');
            }

            table.appendChild(tr);
            document.getElementById('main_table').appendChild(table);
        }

        count_current_rows();
    }

    function request(query, callback) {
        $.ajax({
            url: query,
            cache: false
        }).done(function(items){
            window.everything = JSON.parse(items);
            window.everythingRaw = JSON.parse(items);
            // window.everything is the current state of the table
            // window.everythingRaw is the originally fetched data
            if (callback) callback();
        });
    }

    function refresh(callback) {
        request(
            osmly.settings.featuresApi + 'db=' + osmly.settings.db + '&everything',
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

        var items = window.everythingRaw,
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
        window.everything = out;
    }

    function count(options) {
        // {'done': 1, 'user': 'Joe'}
        var ndx = {
            'problem': 1,
            'done': 2,
            'user': 3,
            'time': 4
        };

        var items = window.everything,
            out = {};

        for (var option in options) {
            out[option] = 0;
        }

        for (var a = 0; a < items.length; a++) {
            for (var optn in options) {
                if (items[a][ndx[optn]] == options[optn]) {
                    out[optn]++;
                }
            }
        }

        return out;
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
        
        var items = window.everythingRaw,
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

    everything.click_everything = function() {
        window.everything = window.everythingRaw;
        buildTable();
    };

    everything.click_red = function() {
        filter({
            'problem': unique('problem')
        });
        buildTable();
    };

    everything.click_green = function() {
        filter({'done': 1});
        buildTable();
    };

    everything.drop_selection = function(select) {
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
            controls = document.getElementById('everything-controls'),
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

    function count_current_rows() {
        var count = document.getElementById('count');

        if (window.everything.length === window.everythingRaw.length) {
            count.innerHTML = window.everything.length;
        } else {
            count.innerHTML = window.everything.length.toString() + '<span>/' + window.everythingRaw.length + '</span>';
        }
    }

    everything.close = function() {
        window.everything = false;
        window.everythingRaw = false;

        // trash the tbody
        if (document.getElementsByTagName('tbody').length) {
            var table = document.getElementById('main_table');
            table.removeChild(document.getElementsByTagName('tbody')[0]);
        }

        // reset the radio button to 'everything'
        var controls = document.getElementById('everything-controls'),
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

    everything.done = function(id) {
        // a special new modal w/ confirm/deny
        // update the item as done with the user
        console.log(id);
    };

    everything.edit = function(id) {
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

    everything.go = function() {
        refresh(function() {
            buildTable();
            problem_selection();
            user_selection();
        });
    };

    return everything;
}());
