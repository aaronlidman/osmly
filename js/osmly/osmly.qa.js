osmly.qa = (function () {
    var qa = {};
    var ui = {
        'confirm': {
            text: 'confirm'
        },
        'deny': {
            text: 'deny'
        },
        'qa-skip': {
            text: 'skip'
        },
        'report': {}
    };

    function newInterface() {
        var body = document.getElementsByTagName('body')[0];
        for (var id in ui) {
            if (!Boolean(byId(id))){
                var item = document.createElement('div');
                item.setAttribute('id', id);
                if (ui[id].text) item.innerHTML = ui[id].text;
                if (ui[id].bind) bean.on($(id)[0], 'click', ui[id].bind);
                body.appendChild(item);
            }
        }
    }

    function getNext() {
        request(fillReport);
        // get the item, fill in the appropriate fields
        // filter out own items
        // get the context
        // put the context on the map
        // bind set geometry layer but don't display it
    }

    function request(callback) {
        reqwest({
            url: osmly.settings.db + '&qa',
            cache: false,
            crossOrigin: true,
            type: 'json',
            success: function(item){
                qa.data = item;
                if (callback) callback();
            }
        });
    }

    function fillReport() {
        // index via simple.py qa(): geo, problem, submit, user, time
        var string = 'User <span class="bold">' + qa.data[3] + '</span> submitted this feature ' +
        format_date(qa.data[4]);
        if (qa.data[2] == 2) string += " via the 'Mark as Done' button";
        if (qa.data[2] == 3) string += ' via JOSM';
        string += '.';
        if (qa.data[1] != '') string += 'Previously reported problem: ' + qa.data[1];

        var report = document.getElementById('report');
        report.innerHTML = string;
    }

    function confirm() {

    }

    function deny() {

    }

    function skip() {

    }

    qa.go = function(){
        newInterface();
        osmly.ui.hideItem();
        getNext();
    };

    function show() {

    }

    return qa;
}());
