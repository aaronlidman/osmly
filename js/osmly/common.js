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
