osmly.qa = (function () {
    var qa = {mode: false},
        q = {};

    qa.go = function(){
        // toggle qa mode
        if (!qa.mode) {
            osmly.ui.hideItem();
            setInterface();
            bind();
            next();
        } else {
            reset();
            unbind();
            unsetInterface();
            $('#tags tr').remove();
            osmly.item.next();
        }
    };

    function setInterface() {
        qa.mode = true;
        byId('qa').innerHTML = 'Leave QA';
        byId('qa').style.backgroundColor = 'black';
        byId('qa').style.color = 'white';

        var body = byTag('body')[0],
            qablock = createId('div', 'qa-block');
        body.appendChild(qablock);

        var report = createId('div', 'report');
        qablock.appendChild(report);

        var layerz = createId('div', 'toggleLayers');
        qablock.appendChild(layerz);
        layerz.innerHTML = '[w] see original feature';

        var skip = createId('div', 'qa-skip');
        qablock.appendChild(skip);
        skip.innerHTML = '[s] skip';

        var confirmz = createId('div', 'confirm');
        qablock.appendChild(confirmz);
        confirmz.innerHTML = 'confirm';

        showOsmLink();
    }

    function bind() {
        $('#toggleLayers').on('click', toggleLayers);
        $('#qa-skip').on('click', next);
        $('#confirm').on('click', confirm);

        $('body').on('keydown', function(that){
            if (that.keyCode === 87) toggleLayers(); //w
            if (that.keyCode === 83) next(); //s
        });
    }

    function unbind() {
        $('#toggleLayers').off();
        $('#qa-skip').off();
        $('#confirm').off();
        $('body').off('keydown');
    }

    function unsetInterface() {
        qa.mode = false;

        byTag('body')[0].removeChild(byId('qa-block'));
        byId('qa').innerHTML = 'QA';
        byId('qa').style.backgroundColor = 'white';
        byId('qa').style.color = 'black';
        resetOsmLink();
    }

    function showOsmLink() {
        setTimeout(function(){
            // give them some time to fade out
            $('#bottom-right').show();
            $('#josm').hide();
            $('#reset').hide();
        }, 1000);
    }

    function resetOsmLink() {
        $('#bottom-right').hide();
        $('#josm').show();
        $('#reset').show();
        $('#osmlink').show();
    }

    function request(callback) {
        $.ajax({
            url: osmly.settings.db + '&qa',
            cache: false,
            dataType: 'json',
            success: function(item){
                q.data = {
                    id: item[0],
                    geo: JSON.parse(item[1]),
                    problem: item[2],
                    submit: item[3],
                    user: item[4],
                    time: item[5],
                };

                if (q.data.geo.properties.name) q.data.name = q.data.geo.properties.name;
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
        for (var item in q.data) {
            var tr = createE('tr');
            if (item == 'id') tr.innerHTML = '<td>id</td><td>' + q.data.id + '</td>';
            if (item == 'user') tr.innerHTML = '<td>who</td><td>' + q.data.user + '</td>';
            if (item == 'time') tr.innerHTML = '<td>when</td><td>' + format_date(q.data.time) + '</td>';
            if (item == 'problem' && q.data.problem !== '') tr.innerHTML = '<td>problem</td><td class="k">' + q.data.problem + '</td>';
            if (item == 'submit' && q.data.submit != 1){
                tr.innerHTML = '<td>via</td><td>' + q.data.submit + '</td>';
            }
            if (item == 'name') tr.innerHTML = '<td>name</td><td>' + q.data.name + '</td>';
            if (tr.innerHTML !== '') tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        report.appendChild(table);
    }

    function next() {
        reset();
        request(function(){
            fillReport();
            setGeometry();
            if (osmly.item.contextLayer) setContext();
        });
    }

    function reset() {
        if (osmly.item.contextLayer) osmly.map.removeLayer(osmly.item.contextLayer);
        if (q.oGeometry) osmly.map.removeLayer(q.oGeometry);
        byId('toggleLayers').innerHTML = '[w] see original feature';
        $('#qa-block').hide();
        $('#osmlink').hide();
    }

    function setContext() {
        var bounds = q.data.geo.properties.bounds,
            buffered = [
                bounds[0] - 0.002,
                bounds[1] - 0.002,
                bounds[2] + 0.002,
                bounds[3] + 0.002
            ]; // double the buffer size just to be extra sure

        osmly.map.fitBounds([
            [bounds[1], bounds[0]],
            [bounds[3], bounds[2]]
        ]);

        osmly.item.getOsm(buffered, function(){
            byId('notify').style.display = 'none';
            osmly.map.removeLayer(q.oGeometry);
            osmly.item.contextLayer.addTo(osmly.map);
            osmly.item.contextLayer.bringToFront();
            byId('qa-block').style.display = 'block';
            byId('osmlink').style.display = 'block';
        });

    }

    function setGeometry() {
        q.oGeometry = L.geoJson(q.data.geo, {
            style: osmly.settings.featureStyle,
        });
        q.oGeometry.addTo(osmly.map);
        q.oGeometry.bringToFront();
    }

    function confirm() {
        osmly.connect.updateItem('confirm', false, false, q.data.id);
        next();
    }

    function toggleLayers() {
        if (osmly.map.hasLayer(q.oGeometry)) {
            byId('toggleLayers').innerHTML = '[w] see original feature';
            osmly.map.removeLayer(q.oGeometry);
            osmly.item.contextLayer.addTo(osmly.map);
            osmly.item.contextLayer.bringToFront();
        } else {
            byId('toggleLayers').innerHTML = '[w] see OSM data';
            osmly.map.removeLayer(osmly.item.contextLayer);
            q.oGeometry.addTo(osmly.map);
            q.oGeometry.bringToFront();
        }
    }

    return qa;
}());
