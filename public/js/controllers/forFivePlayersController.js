'use strict';

angular.module("resistance.controllers.forFivePlayersController", [])
.controller("forFivePlayersController", ["$rootScope", "$routeParams", "$scope", "$window", "$location", "socketService", "growl",
	function($rootScope, $routeParams, $scope, $window, $location, socketService, growl){
		var socket = socketService.getSocket();
		$scope.gamePart = "start";
		$scope.missions = [];
		$scope.currentMissionDetails = "";
		console.log($rootScope.roomDetails);
		$scope.players = $rootScope.roomDetails.members;
		console.log("Here in forFivePlayersController");
		
		$scope.ready = false;
		$scope.playerReady = function(){
			$scope.ready = true;
			socket.emit('player ready');
		}

		socket.on('adminMessage', function(data){
			growl.info(data.message, {ttl: 3000, disableCountDown: true});
			$scope.players = data.members;
			$scope.$apply();
		});
		
		$scope.role = null;
		socket.on('player role', function(data){
			$scope.role = data.role;
			if($scope.role == "spy"){
				growl.error("Your role is " + $scope.role, {ttl: 3000, disableCountDown: true});
			} else{
				growl.success("Your role is " + $scope.role, {ttl: 3000, disableCountDown: true});
			}
			$scope.$apply();
		});

		socket.on('chosen captain', function(data){
			// console.log($rootScope.id);
			// console.log(data);
			$scope.gamePart = "captain";
			$scope.captain = {
				captainName: 	data.playerName,
				captainId: 		data.id
			}
			if($rootScope.id == data.id){
				growl.info("You are the captain!", {ttl: 3000, disableCountDown: true});
				$scope.captain.isCaptain = true;
			} else {
				growl.info(data.playerName + " is the captain!", {ttl: 3000, disableCountDown: true});
				$scope.captain.isCaptain = false;
			}
			$scope.$apply();
		});

		socket.on('change captain', function(data){
			growl.info("Team rejected. Captain will be changed!", {ttl: 3000, disableCountDown: true});
			// $scope.chosen = [];
			$scope.gamePart = "captain";
			$scope.currentMissionDetails = data;
			$scope.votedTeam = false;
		})

		$scope.spyData = []
		socket.on('notify spy', function(data){
			data.forEach(function(element, index) {
				$scope.spyData.push(element.id);
			});
		});

		socket.on('mission message', function(data){
			$scope.ready = false;
			var message;
			if($scope.captain.isCaptain){
				message = "Choose " + data.requiredPlayers + " players for Mission " + data.number;
			} else {
				message = "The captain will choose the players for Mission " + data.number;
			}
			$scope.currentMissionDetails = data;
			console.log($scope.currentMissionDetails);	
			growl.info(message, {ttl: 3000, disableCountDown: true});
		});

		// $scope.chosen = []
		$scope.choosePlayer = function(player){
			$scope.currentMissionDetails.requiredPlayers--;
			// console.log($scope.currentMissionDetails);
			socket.emit('player mission', player);
			if($scope.currentMissionDetails.requiredPlayers == 0){
				socket.emit('accept reject team', $scope.currentMissionDetails);
			}
		}

		socket.on('chosen player', function(data){
			console.log(data);
			$scope.currentMissionDetails.players = data;
			growl.info("The captain has chosen " + _.last(data).playerName, {ttl: 3000, disableCountDown: true});
			// $scope.chosen.push(_.last(data).id);
			$scope.$apply();
		});

		socket.on('vote team', function(){
			$scope.gamePart = "vote team";
			$scope.ready = false;
			// $scope.currentMissionDetails.requiredPlayers = 0;
			$scope.$apply();
		})

		// $scope.votedTeam = false;
		$scope.voteTeam = function(vote){
			$scope.ready = true;
			socket.emit('team vote', vote);
		}

		socket.on('proceed game', function(){
			// console.log(_.map($scope.currentMissionDetails.players, 'id'));
			// console.log(_.map($scope.currentMissionDetails.players, 'id').includes($rootScope.id))
			$scope.gamePart = "vote mission";
			$scope.ready = false;
			growl.info("Team accepted!", {ttl: 3000, disableCountDown: true});
		});
		$scope.voteMission = function(vote){
			$scope.ready = true;
			socket.emit('mission vote', vote);
		}

		socket.on('mission status', function(data){
			$scope.currentMissionDetails = data;
			if(data.status == "Success"){
				growl.success("Mission success!", {ttl: 3000, disableCountDown: true});
			} else if(data.status == "Failed"){
				growl.error("Mission failed!", {ttl: 3000, disableCountDown: true});
			}
			// $scope.gamePart = "next round";
			growl.info("Prepare for next round.", {ttl: 4000, disableCountDown: true});
			setTimeout(function(){
				socket.emit('next round');
				$scope.ready = false;
			}, 3000);
			// $scope.gamePart = "captain";

		});

		socket.on('game end', function(message){
			$scope.gameMessage = message;
			$scope.gamePart = "game end"
		})

		// $scope.nextRound = function(){
		// 	$scope.ready = true;
		// 	socket.emit('next round');
		// }



	}	
]);