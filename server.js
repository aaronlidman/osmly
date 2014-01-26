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
        // need to catch too large objects, prevent flood
        var body = '';
        request.on('data', function (data) {
            body += data;
        });
        request.on('end', function () {
            post(request.args, qs.parse(body), response);
        });
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

function post(args, data, response) {
    var db = new sqlite.Database(args.db, function(err) {
        if (('action' in args) && ('id' in args)) {
            switch(args.action) {
                case 'problem':
                    db.run('UPDATE osmly SET problem = $problem, user = $user, time = $time WHERE id = $id', {
                        $problem: data.problem,
                        $user: data.user,
                        $time: args.time,
                        $id: args.id
                    });
                    respond(JSON.stringify({id:args.id}), reponse);
                    break;
                case 'remote':
                    db.run('UPDATE osmly SET remote = $remote WHERE id = $id', {
                        $remote: data.remote,
                        $id: args.id,
                    });
                    break;
                case 'submit':
                    db.run('UPDATE osmly SET problem = $problem, user = $user, time = $time WHERE id = $id', {
                        $problem: data.problem,
                        $user: data.user,
                        $time: parseInt(new Date().getTime()/1000),
                        $id: args.id
                    });
                    break;
                case 'confirm':
                    db.run('UPDATE osmly SET done = 1 WHERE id = $id', {$id: args.id});
                    break;
            }
        }
    });
}

server.listen(8000);
console.log("running...");
