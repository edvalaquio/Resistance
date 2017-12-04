'use strict';

angular.module("indexApp", ["ngRoute",
	"angular-growl", 
	"resistance.controllers.homePageController",
	"resistance.controllers.forFivePlayersController"])
.config(["$routeProvider", "$locationProvider",
	function($routeProvider, $locationProvider){
		$routeProvider
		.when("/", {
			templateUrl: 	"/partials/home.html",
			controller: 	"homePageController"
		})
		.when("/forFivePlayers/:roomName", {
			templateUrl: 	"/partials/forFive.html",
			controller: 	"forFivePlayersController"
		})
}])
.service('socketService', function(){
	var temp;
	var placeSocket = function(socket){
		temp = socket;
	}
	var getSocket = function(){
		return temp
	}
	var socketExists = function(){
		if(!temp){
			return false;
		}
		return true;
	}
	return {
		placeSocket: placeSocket,
		getSocket: getSocket,
		socketExists: socketExists
	}
})
.constant('_', window._)
// use in views, ng-repeat="x in _.range(3)"
.run(function ($rootScope) {
	$rootScope._ = window._;
});