var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var shuffle = require('shuffle-array');
var _ = require('lodash');

server.listen(3000, function(){
	console.log('listening on *:3000');
})

app.use(express.static(path.join(__dirname, 'public')));

var numUsers = 0;
var rooms = [];
// var playerReady = 0;
io.on('connection', function(socket){
	numUsers++;
	console.log('A user has connected: ' + numUsers);

	io.to(socket.id).emit('socket id', socket.id);

	socket.on('disconnect', function(){
		console.log(socket.username + ' disconnected');
		numUsers--;
		console.log('Number of connected users: ' + numUsers);
		if(socket.roomName){
			console.log(rooms[socket.roomName].players);
			removeElement(rooms[socket.roomName].players, socket.id);
			console.log(rooms[socket.roomName].players);
		}
	});

	socket.on('createRoom', function(data){
		var admin;
		if(io.sockets.adapter.rooms[data.name]){
			admin = {
				message: 	"Room already exists!",
				join: 		false
			}
		} else {
			socket.join(data.name);
			socket.username = data.playerName;
			socket.roomName = data.name
			rooms[data.name] = {
				players: 		[],
				status: 		false,
				playerReady: 	0
			}
			rooms[data.name].players.push({playerName: data.playerName, id: socket.id});
			// var temp = generatePlayerList(rooms[data.name].players);
			// console.log(temp);
			admin = {
				message: 	"Room " + data.name + " has been successfully created!",
				room: 		data.name,
				join: 		true,
				members: 	rooms[data.name].players 
			}
		}
		socket.emit('adminMessage', admin);
	});

	socket.on('joinRoom', function(data){
		var adminMessage = "";
		if(!io.sockets.adapter.rooms[data.name]){
			admin = {
				message: 	"Room does not exist!",
				join: 		false
			}
		} else if(rooms[data.name].status){
			admin = {
				message: 	"Room is already full! Game has started.",
				join: 		false
			}
		} 
		else {
			socket.join(data.name);
			console.log(_.filter(rooms[data.name].players, {playerName: data.playerName}).length);
			var count = 0;
			var temp = data.playerName;
			while(_.filter(rooms[data.name].players, {playerName: temp}).length >= 1){
				temp = data.playerName + count;
				count++;
			}
			data.playerName = temp;
			socket.username = data.playerName;
			socket.roomName = data.name;
			rooms[data.name].players.push({playerName: data.playerName, id: socket.id});
			// var temp = generatePlayerList(rooms[data.name].players);
			admin = {
				message: 		"Player " + data.playerName + " has joined the room!",
				room: 			data.name,
				join: 			true,
				members: 		rooms[data.name].players
			}
			// console.log(rooms[data.name].players.length);
			if(rooms[data.name].players.length == 5){
				io.in(data.name).emit('start game', true);
				rooms[data.name].status = true;
			}
		}
		console.log(admin.message);
		socket.emit('adminMessage', admin);
		socket.to(data.name).emit('adminMessage', admin);
	});

	socket.on('player ready', function(){
		rooms[socket.roomName].playerReady++;
		console.log(socket.username + " is ready!");
		console.log("Number of players ready: " + rooms[socket.roomName].playerReady);
		if(rooms[socket.roomName].playerReady == rooms[socket.roomName].players.length){
			// console.log("Assigning roles...");
			gameStart(socket.roomName, rooms[socket.roomName]);
		}
	});

	socket.on('player mission', function(data){
		console.log("The captain has chosen ");
		var currentMission = _.last(rooms[socket.roomName].mission)
		currentMission.players.push(data)
		console.log(currentMission);
		io.in(socket.roomName).emit('chosen player', currentMission.players);
	});

	socket.on('accept reject team', function(data){
		console.log(data);
		if(!data.rejected){
			io.in(socket.roomName).emit('vote team');
		} else {
			io.in(socket.roomName).emit('proceed game')
		}
		// console.log("The players will begin voting");
	});

	socket.on('team vote', function(data){
		// console.log(rooms[socket.roomName]);
		var currentMission = _.last(rooms[socket.roomName].mission)
		currentMission.accept.push(data);
		console.log(currentMission.accept);
		if(currentMission.accept.length == 5 && !currentMission.rejected){
			var count = 0;
			_.forEach(currentMission.accept, function(element){
				if(element){
					count++;
				} else {
					count--;
				}
			});
			if(count > 0){
				io.in(socket.roomName).emit('proceed game');
			} else{
				currentMission.rejected = true;
				currentMission.players = [];
				currentMission.accept = [];
				io.in(socket.roomName).emit('change captain', currentMission);
				setTimeout(function(){
					chooseCaptain(socket.roomName, rooms[socket.roomName].players)
				}, 2000);
			}
			// console.log(_.countBy(currentMission.accept, 'length'));
		}
	});

});

var gameStart = function(roomName, roomData){
	console.log("Assigning roles...");
	var roles = ["spy", "spy"];
	for(var i = roomData.players.length - 3; i < roomData.players.length; i++){
		roles.push("resistance");
	}

	shuffle(roomData.players);
	shuffle(roles);

	var gameData;
	console.log(roomData.players);
	roomData.players.forEach(function(element, index) {
		element.role = roles.pop();
		gameData = {
			message: 	"You have been assigned a role.",
			role: 		element.role
		}
		console.log(element.id + " is a " + gameData.role);
		io.to(element.id).emit('player role', gameData)
	});

	var spyArray = _.filter(roomData.players, {role: "spy"});
	spyArray.forEach(function(element, index){
		io.to(element.id).emit('notify spy', spyArray);
	});

	chooseCaptain(roomName, roomData.players)

	rooms[roomName].mission = [];
	rooms[roomName].mission.push({number: 1, requiredPlayers: 2, status: "", players: [], accept: []});
	io.in(roomName).emit('mission message', _.last(rooms[roomName].mission));
	// io.in(roomName).emit('round captain', captain.playerName + " is the captain.");
}

var chooseCaptain = function(roomName, roomPlayers){
	var captain = pickCaptain(roomPlayers);
	console.log("The captain is: ");
	console.log(captain);
	var captainData = {
		id: 			captain.id,
		playerName: 	captain.playerName
	}
	io.in(roomName).emit('chosen captain', captainData);
}


var removeElement = function(array, element){
	console.log("Element input: " + element);
	console.log("Array input: " + array);
	var index;
	for(var i = 0; i < array.length; i++){
		if(array[i].id == element){
			index = i;
			break;
		} else {
			index = -1;
		}
	}
	if(index !== -1){
		array.splice(index, 1);
	}
}

var generatePlayerList = function(array){
	var temp = [];
	array.forEach(function(element) {
		// statements
		temp.push(element.playerName);
	});
	return temp;
}

var pickCaptain = function(array){
	return shuffle.pick(array);
}