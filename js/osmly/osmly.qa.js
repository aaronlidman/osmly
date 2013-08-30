osmly.qa = (function () {
    var qa = {
        mode: false
    };

    function newInterface() {
        qa.mode = true;
        byId('qa').innerHTML = 'Leave QA';
        byId('qa').style.backgroundColor = 'orange';

        var body = byTag('body')[0],
            qablock = createId('div', 'qa-block');
        body.appendChild(qablock);

        var report = createId('div', 'report');
        qablock.appendChild(report);

        var layerz = createId('div', 'toggleLayers');
        qablock.appendChild(layerz);
        layerz.innerHTML = 'toggle layers';
        bean.on(byId('toggleLayers'), 'click', toggleLayers);

        var skip = createId('div', 'qa-skip');
        qablock.appendChild(skip);
        skip.innerHTML = 'skip';
        bean.on(byId('qa-skip'), 'click', next);

        var confirmz = createId('div', 'confirm');
        qablock.appendChild(confirmz);
        confirmz.innerHTML = 'confirm';
        bean.on(byId('confirm'), 'click', confirm);

        setTimeout(function(){
            // give them some time to fade out
            byId('bottom-right').style.display = 'block';
            byId('josm').style.display = 'none';
            byId('reset').style.display = 'none';
        }, 1000);
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

                if (qa.data.geo.properties.name) qa.data.name = qa.data.geo.properties.name;
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
            if (item == 'name') tr.innerHTML = '<td>name</td><td>' + qa.data.name + '</td>';
            if (tr.innerHTML !== '') tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        report.appendChild(table);
    }

    function next() {
        if (osmly.item.contextLayer) osmly.map.removeLayer(osmly.item.contextLayer);
        request(function(){
            fillReport();
            setGeometry();
            displayContext();
            // get, set and hold the geometry
        });
    }

    function displayContext() {
        var bounds = qa.data.geo.properties.bounds,
            buffered = [
                bounds[0] - 0.002,
                bounds[1] - 0.002,
                bounds[2] + 0.002,
                bounds[3] + 0.002
            ]; // double the buffer size

        osmly.map.fitBounds([
            [bounds[1], bounds[0]],
            [bounds[3], bounds[2]]
        ]);

        osmly.item.getOsm(buffered, function(){
            byId('notify').style.display = 'none';
            osmly.map.removeLayer(qa.oGeometry);
            osmly.item.contextLayer.addTo(osmly.map);
            osmly.item.contextLayer.bringToFront();
        });

    }

    function setGeometry() {
        qa.oGeometry = L.geoJson(qa.data.geo, {
            style: osmly.settings.featureStyle,
        });

        qa.oGeometry.addTo(osmly.map);
        qa.oGeometry.bringToFront();

        // on first set we display the geometry
        // then it gets hidden when the context is ready
        // toggleable via a button afterward
    }

    function confirm() {
        osmly.connect.updateItem('confirm', false, false, qa.data.id);
    }

    function toggleLayers() {
        if (osmly.map.hasLayer(qa.oGeometry)) {
            osmly.map.removeLayer(qa.oGeometry);
            osmly.item.contextLayer.addTo(osmly.map);
            osmly.item.contextLayer.bringToFront();
        } else {
            osmly.map.removeLayer(osmly.item.contextLayer);
            qa.oGeometry.addTo(osmly.map);
            qa.oGeometry.bringToFront();
            // turn off context, turn on geometry
        }
    }

    qa.go = function(){
        // toggle qa mode
        if (!qa.mode) {
            osmly.ui.hideItem();
            newInterface();
            next();
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
