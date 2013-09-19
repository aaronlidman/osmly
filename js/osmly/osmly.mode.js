// not sure how far to take this
// could make every mode extend methods like go, hide, show
    // not a fan, not enough modes to bother yet
    // naming is consistent enough to do this the dumb way
osmly.mode = (function() {
    var mode = {now: false, last:false};

    mode.set = function(theMode) {
        if (mode.now == theMode) return false;
        if (mode.now) osmly[mode.now].stop();
        osmly[theMode].go();
        change(theMode);
    };

    function change(changeTo) {
        mode.last = mode.now;
        mode.now = changeTo;
    }

    mode.import = function() { mode.set('import'); };
    mode.qa = function() { mode.set('qa'); };
    mode.overview = function() { mode.set('overview'); };
    mode.toLast = function() {
        if (mode.last) {
            mode.set(mode.last);
        } else {
            osmly[mode.now].stop();
            mode.now = false;
        }
    };
    // convenience

    return mode;
}());
