'use strict';

angular.module("resistance.controllers.homePageController", [])
.controller("homePageController", ["$rootScope", "$scope", "$window", "$location", "socketService",
	function($rootScope, $scope, $window, $location, socketService){
		// console.log(_);
		// var array = [1, 2, 3];
		// console.log(_.includes(array, 1));
		$scope.homeMessage = "Hi! Please enter your name below.";
		$scope.createType = "five";
		$scope.createName = "asdf";
		$scope.joinName = "asdf";
		var socket;

		if(socketService.socketExists()){
			socket = socketService.getSocket();
		} else {
			socket = io();
			socketService.placeSocket(socket);
		}
		// console.log(socket.);
		console.log("Here in homePageController");


		$scope.createRoom = function(){
			var type = $scope.createType;
			var name = $scope.createName;
			// var name = $scope.createName;
			var playerName = $scope.playerName;

			if(!playerName){
				playerName = "Unnamed";
			}

			if(!name || !type){
				$scope.homeMessage = "Invalid room details!";
			} else {
				var details = {
					type 		: type,
					name 		: name,
					playerName 	: playerName 
				}
				socket.emit('createRoom', details);
				// $rootScope.playerName = playerName;
			}

		}

		$scope.joinRoom = function(){
			var name = $scope.joinName;
			var playerName = $scope.playerName

			if(!playerName){
				playerName = "Unnamed";
			}

			if(!name){
				$scope.homeMessage = "Invalid room details!";
			} else {
				var details = {
					name 		: name,
					playerName 	: playerName
				}
				socket.emit('joinRoom', details);
				$rootScope.playerName = playerName;
			}
		}

		socket.on('adminMessage', function(data){
			// console.log(data);
			if(data.join){
				$rootScope.roomDetails = data;
				$rootScope.playerName = data.members[data.members.length - 1].playerName;
				$location.path('/forFivePlayers/' + data.room);	
			} else {
				$scope.homeMessage = data.message;
			}
			$scope.$apply();
		});

		socket.on('start game', function(data){
			// console.log(data);
			$rootScope.gameStart = data;
			$scope.$apply();
			// $rootScope.playerRole = data.role;
		});

		socket.on('socket id', function(data){
			// console.log(data);
			$rootScope.id = data;
		})
		// $scope.sendName = function(){
		// 	localStorage['playerName'] = $scope.playerName;
		// 	localStorage['room'] = $scope.room;
		// 	socketService.placeSocket(socket);
		// 	// console.log($scope.room);
		// 	if($scope.room == "five"){
		// 		socket.emit('joinForFive', $scope.playerName);
		// 		$location.path('/forFivePlayers');
		// 	}
		// };

	}	
]);