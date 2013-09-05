window.osmly = (function () {
    var osmly = {
        settings: settings
    };

    osmly.go = function(settings) {
        $(function(){
            if (typeof settings === 'object') {
                for (var obj in settings) {
                    osmly.settings[obj] = settings[obj];
                }
            } else {
                alert('need some settings');
            }
            osmly.map = osmly.map();
            osmly.ui.go();
        });
    };

    return osmly;
}());
