var app = require('http').createServer(handler),
    url = require('url'),
    fs = require('fs'),
    io = require('socket.io').listen(app);

function handler (request, response) {
        
    var path = url.parse(request.url).pathname;

    switch (path) {
    case '/':
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.write('hello world');
        break;
    case '/test.html':
        var data = fs.readFileSync(__dirname + path);
        if (data) {
            response.writeHead(200, {"Content-Type": "text/html"});
            response.write(data, "utf8");
        } else {
            response.writeHead(404);
            response.write("opps this doesn't exist - 404");
            
        }

        break;
    default:
        response.writeHead(404);
        response.write("opps this doesn't exist - 404");
    }

    response.end();
}

var players = [];
 
app.listen(8001);

io.set('log level', 1);
io.sockets.on('connection', function (socket) {
    
    socket.on('new_player', function () {
        var player_id = players.push(socket);
        socket.set("player_id", player_id);
        console.log("new_player_id: " + player_id);
        socket.emit("player_registered", player_id);

        socket.on("disconnect", function () {
            console.log("player_disconnected: " + player_id);
            delete players[player_id];
        });
    });
    
    //recieve client data
    socket.on('key_down', function (data) {
        
        // This line sends the event (broadcasts it)
        // to everyone except the originating client.
        socket.broadcast.emit('key_down', data);
        
    });
    //
});