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

function fade(type, sel, callback) {
    // try and prevent some basic binding craziness
    if (type === 'out' && sel.css('display') == 'none') return;
    if (type === 'in' && sel.css('display') == 'block') return;

    var classes = 'animated fadeIn';
    if (type === 'out') classes = 'animated fadeOut';

    sel.each(function(element, index){
        bean.one(
            element,
            'animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd',
            function(){
                console.log('done');
                if (type === 'out') sel.hide();
                else sel.show('block');
                sel.removeClass(classes);
                if (callback) callback();
            }
        );
    });
    sel.addClass(classes);
    if (type === 'in') sel.show('block');
}
