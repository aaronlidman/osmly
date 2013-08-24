function fadeIn(sel, callback) {
    sel.each(function(element){
        bean.one(
            element,
            'animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd',
            function(){
                element.classList.remove('fadeIn');
                element.style.display = 'block';
                    // helps with conflicts
                if (callback) callback();
            }
        );
        element.style.display = 'block';
        element.classList.add('fadeIn');
    });
}

function fadeOut(sel, callback) {
    sel.each(function(element){
        bean.one(
            element,
            'animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd',
            function(){
                element.style.display = 'none';
                element.classList.remove('fadeOut');
                if (callback) callback();
            }
        );
        element.classList.add('fadeOut');
    });
}

function leftToRight(sel, callback) {
    sel.each(function(element){
        bean.one(
            element,
            'animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd',
            function(){
                element.style.display = 'none';
                element.classList.remove('fadeLefttoRight');
                if (callback) callback();
            }
        );
        element.style.display = 'block';
        element.classList.add('fadeLefttoRight');
    });
}

function bigUp(sel, callback) {
    sel.each(function(element){
        bean.one(
            element,
            'animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd',
            function(){
                element.style.display = 'none';
                element.classList.remove('fadeInUpBig');
                if (callback) callback();
            }
        );
        element.style.display = 'block';
        element.classList.add('fadeInUpBig');
    });
}
