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

function fade(type, sel, callback, ignore) {
    // should split this into animate() and fade()
        // animate triggers basic self-contained animations
        // fade has all this dumb style.display logic
    // try and prevent some basic binding craziness
    var animation = 'fadeIn';
    if (type === 'out') animation = 'fadeOut';
    if (type !== 'in' && type !== 'out') animation = type;
    type = type.indexOf('out');
    if (type > -1) type = 'out';
    else type = 'in';

    sel.each(function(element, index){
        if (ignore) {
            set(element);
        } else {
            if ((type === 'out' && element.style.display == 'none') ||
                (type === 'in' && element.style.display == 'block')) {
                // drop, queue, ???
            } else {
                set(element);
            }
        }
    });

    function set(element) {
        element.classList.add('animated');
        element.classList.add(animation);
        if (type === 'in') element.style.display = 'block';
        bean.one(
            element,
            'animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd',
            function(){
                console.log('done');
                if (type === 'out') element.style.display = 'none';
                else element.style.display = 'block';
                element.classList.remove('animated');
                element.classList.remove(animation);
                if (callback) callback();
            }
        );
    }
}
