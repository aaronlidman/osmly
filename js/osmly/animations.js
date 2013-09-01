// animations are done in css because I counldn't find a decent lib
// that did chaining without stuttering
function leftToRight(element) {
    $(element).on(
        'animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd',
        function() {
            element.hide();
            element.removeClass('fadeLefttoRight');
    });
    element.show();
    element.addClass('fadeLefttoRight');
}

function bigUp(element) {
    $(element).on(
        'animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd',
        function() {
            element.hide();
            element.removeClass('fadeInUpBig');
        }
    );
    element.show();
    element.addClass('fadeInUpBig');
}
