var http = require('http'),
    url = require('url'),
    qs = require('querystring'),
    sqlite = require('sqlite3');

var server = http.createServer(function (request, response) {
    request.args = qs.parse(url.parse(request.url).query);

    if (!('db' in request.args)) {
        response.writeHead(400, {'Content-Type': 'text/plain'});
        response.end('No database specified\ndb=?');
        return;
    }

    var resp;
    if (request.method == 'GET') {
        resp = get(request.args);
    } else if (request.method == 'POST') {
        resp = post(request.args);
    }

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(resp);
});

function DB(file) {
    return new sqlite.Database(file);
}

function get(args) {
    var db = DB(args.db);

    if (err) return;

    if ('id' in args) {

    } else if ('overview' in args) {

    } else if ('qa' in args) {

    } else {

    }
}

function post(args) {

}

server.listen(8000);
console.log("running...");
