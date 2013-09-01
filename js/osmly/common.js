function keyclean(x) { return x.replace(/\W/g, ''); }
// both of these are from iD
function token(k, x) {
    if (arguments.length === 2) {
        localStorage[keyclean(osmly.settings.writeApi) + k] = x;
    }
    return localStorage[keyclean(osmly.settings.writeApi) + k];
}

function byId(id) {return document.getElementById(id);}
function byTag(tag) {return document.getElementsByTagName(tag);}
function createE(element) {return document.createElement(element);}
function createId(element, id) {
    var elm = createE(element);
    elm.setAttribute('id', id);
    return elm;
}

// http://markroberthenderson.com/2011/08/28/javascript-minutes-hours-seconds-time-ago-function.html
function format_date(unix_timestamp) {
  var difference_in_seconds = (Math.round((new Date()).getTime() / 1000)) - unix_timestamp,
      current_date = new Date(unix_timestamp * 1000), minutes, hours,
      months = new Array(
        'January','February','March','April','May',
        'June','July','August','September','October',
        'November','December');
  
  if(difference_in_seconds < 60) {
    return difference_in_seconds + " second" + _plural(difference_in_seconds) + " ago";
  } else if (difference_in_seconds < 60*60) {
    minutes = Math.floor(difference_in_seconds/60);
    return minutes + " minute" + _plural(minutes) + " ago";
  } else if (difference_in_seconds < 60*60*24) {
    hours = Math.floor(difference_in_seconds/60/60);
    return hours + " hour" + _plural(hours) + " ago";
  } else if (difference_in_seconds > 60*60*24){
    if(current_date.getYear() !== new Date().getYear())
      return months[current_date.getMonth()] + ' ' + current_date.getDay() + ', ' + _fourdigits(current_date.getYear());
    
    return months[current_date.getMonth()] + ' ' + current_date.getDay();
  }
  
  return difference_in_seconds;
  
  function _fourdigits(number)  {
        return (number < 1000) ? number + 1900 : number;}

  function _plural(number) {
    if(parseInt(number) === 1) {
      return "";
    }
    return "s";
  }
}
