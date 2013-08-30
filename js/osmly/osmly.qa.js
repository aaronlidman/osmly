osmly.qa = (function () {
    var qa = {
        mode: false
    };

    function getNext() {
        console.log('next');
        request(fillReport);
        // get the context
        // put the context on the map
        // bind set geometry layer but don't display it
    }

    function confirm() {
        console.log('heh');
        // osmly.connect.updateItem('confirm', false, false, qa.data.id);
    }

    function newInterface() {
        qa.mode = true;
        byId('qa').innerHTML = 'Leave QA';
        byId('qa').style.backgroundColor = 'orange';

        var body = byTag('body')[0],
            qablock = createId('div', 'qa-block');
        body.appendChild(qablock);

        var report = createId('div', 'report');
        qablock.appendChild(report);

        var skip = createId('div', 'qa-skip');
        qablock.appendChild(skip);
        skip.innerHTML = 'skip';
        bean.on(byId('qa-skip'), 'click', getNext);

        var confirm = createId('div', 'confirm');
        qablock.appendChild(confirm);
        confirm.innerHTML = 'confirm';
        bean.on(byId('confirm'), 'click', confirm);
    }

    function request(callback) {
        reqwest({
            url: osmly.settings.db + '&qa',
            cache: false,
            crossOrigin: true,
            type: 'json',
            success: function(item){
                qa.data = {
                    id: item[0],
                    geo: JSON.parse(item[1]),
                    problem: item[2],
                    submit: item[3],
                    user: item[4],
                    time: item[5],
                };

                if (callback) callback();
            }
        });
    }

    function fillReport() {
        var table = createE('table'),
            report = byId('report');
        if (report.getElementsByTagName('table').length) {
            report.removeChild(report.childNodes[0]);
        }
        var tbody = createE('tbody');

        // columns = 'id, geo, problem, submit, user, time'
        for (var item in qa.data) {
            var tr = createE('tr');
            if (item == 'id') tr.innerHTML = '<td>id</td><td>' + qa.data.id + '</td>';
            if (item == 'user') tr.innerHTML = '<td>who</td><td>' + qa.data.user + '</td>';
            if (item == 'time') tr.innerHTML = '<td>when</td><td>' + format_date(qa.data.time) + '</td>';
            if (item == 'problem' && qa.data.problem !== '') tr.innerHTML = '<td>problem</td><td class="k">' + qa.data.problem + '</td>';
            if (item == 'submit' && qa.data.submit != 1){
                tr.innerHTML = '<td>via</td>';
                if (qa.data.submit == 2) tr.innerHTML += '<td>Mark as Done button</td>';
                if (qa.data.submit == 3) tr.innerHTML += '<td>JOSM</td>';
            }
            if (tr.innerHTML !== '') tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        report.appendChild(table);
    }

    qa.go = function(){
        // toggle qa mode
        if (!qa.mode) {
            newInterface();
            osmly.ui.hideItem();
            getNext();
        } else {
            byTag('body')[0].removeChild($('#qa-block')[0]);
            byId('qa').innerHTML = 'QA';
            byId('qa').style.backgroundColor = 'white';
            qa.mode = false;
            osmly.ui.teardown();
            osmly.item.next();
        }
    };

    return qa;
}());
