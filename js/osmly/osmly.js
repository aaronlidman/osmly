window.osmly = (function () {
    var osmly = {
        settings: settings
    };

    osmly.go = function(settings) {
        window.location.hash = '';
        $(function(){
            if (typeof settings === 'object') {
                for (var obj in settings) {
                    if (Object.prototype.toString.call(settings[obj]).slice(8, -1) == 'Object' &&
                        (obj === 'contextStyle' || obj === 'featureStyle' || obj === 'changesetTags')) {
                        // for each item in the object we append to the current setting
                        // append/not overwrite the setting, there are useful default settings in there
                        for (var setting in settings[obj]) {
                            osmly.settings[obj][setting] = settings[obj][setting];
                        }
                    } else { osmly.settings[obj] = settings[obj]; }
                }
            } else {
                alert('need some settings');
            }
            osmly.auth = osmly.auth();
            osmly.map = osmly.map();
            osmly.ui.go();
        });
    };

    return osmly;
}());
