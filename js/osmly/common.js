window.select = function(query) {
    var d = document;
    if (query.split(' ').length > 1 ||
        query.split(',').length > 1) return d.querySelectorAll(query);
    if (query.charAt(0) === '#') return d.getElementById(query.substring(1));
    if (query.charAt(0) === '.') return d.getElementsByClassName(query.substring(1));
    return d.getElementsByTagName(query);
};

window.$ = function(selector) {
    return bonzo(select(selector));
};

function keyclean(x) { return x.replace(/\W/g, ''); }
// both of these are from iD
function token(k, x) {
    if (arguments.length === 2) {
        localStorage[keyclean(osmly.settings.writeApi) + k] = x;
    }
    return localStorage[keyclean(osmly.settings.writeApi) + k];
}

function byId(id) {return document.getElementById(id);}
