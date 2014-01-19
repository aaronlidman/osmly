var http = require('http'),
    url = require('url'),
    qs = require('querystring'),
    sqlite = require('sqlite3');

var server = http.createServer(function (request, response) {
    request.args = qs.parse(url.parse(request.url).query);

    if (!('db' in request.args)) {
        response.writeHead(400, {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
        });
        response.end('No database specified\ndb=?');
        return;
    }

    request.args.db = request.args.db + '.sqlite';

    if (request.method == 'GET') {
        get(request.args, response);
    } else if (request.method == 'POST') {
        post(request.args, response);
    }
});

function respond(str, response) {
    response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    });
    response.end(str);
}

function get(args, response) {
    var db = new sqlite.Database(args.db, function(err) {
        if (err) console.log(err);

        if ('id' in args) {
            db.get('SELECT geo, remote, submit FROM osmly WHERE id = $id LIMIT 1', {
                $id: args.id
            }, function(err, row){
                respond(JSON.stringify(row), response);
            });
        } else if ('overview' in args) {
            db.all('SELECT id, problem, submit, user FROM osmly ORDER BY id', function(err, rows){
                respond(JSON.stringify(rows), response);
            });
        } else if ('qa' in args) {
            db.get('SELECT id, geo, problem, submit, user, time FROM osmly WHERE submit != "" AND problem != "too large" AND done = 0 ORDER BY RANDOM() LIMIT 1', function(err, row) {
                respond(JSON.stringify(row), response);
            });
        } else {
            // random next available
            db.get('SELECT geo FROM osmly WHERE problem = "" AND submit = "" ORDER BY RANDOM() LIMIT 1', function(err, row) {
                respond(JSON.stringify(row.geo), response);
            });
        }
    });
}

function post(args, response) {
}

server.listen(8000);
console.log("running...");
