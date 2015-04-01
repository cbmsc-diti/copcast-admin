'use strict';

/**
 * @ngdoc overview
 * @name copcastAdminApp
 * @description
 * # copcastAdminApp
 *
 * Main module of the application.
 */
angular
  .module('copcastAdminApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'ui.map',
    'ui.bootstrap',
    'http-auth-interceptor',
    'angular-jwplayer' ,
    'toaster',
    'angularFileUpload'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/realtime.html',
        controller: 'RealtimeCtrl'
      })
      .when('/about', {
        templateUrl: 'views/about.html',
        controller: 'AboutCtrl'
      })
      .when('/main', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  }).run(function($rootScope, loginService, socket) {

    $rootScope.$on("event:auth-loginRequired", function(data) {
      loginService.show();
    });

    //if (loginService.isAuthenticated() ) {
    //  console.log("socket connected");
    //  socket.connect(loginService.getToken());
    //}
  });

//insert the constant value ServerUrl
//angular.module('copcastAdminApp').constant('ServerUrl', 'http://mogi-api.igarape.org');
angular.module('copcastAdminApp').constant('ServerUrl', 'http://localhost:3000');
