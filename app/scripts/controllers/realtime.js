/* global google */

/**
 * @ngdoc function
 * @name copcastAdminApp.controller:RealtimeCtrl
 * @description
 * # RealtimeCtrl
 * Controller of the copcastAdminApp
 */

var app = angular.module('copcastAdminApp');

app.controller('RealtimeCtrl', function ($scope, $compile, $modal, $http, socket,loginService, ServerUrl, toaster, $window, $rootScope, mapService, $location, $timeout) {

  $scope.windowHeight = window.innerHeight;
  $scope.windowWidth = window.innerWidth;
  $rootScope.selected = 'realtime';
  $scope.streamButtonText = 'Livestream';
  $scope.searchString = "";

  $scope.mapOptions = {
    zoom: 12,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.LEFT_CENTER
    },
    panControl: true,
    panControlOptions: {
      position: google.maps.ControlPosition.LEFT_CENTER
    },
    zoomControl: true,
    zoomControlOptions: {
      style: google.maps.ZoomControlStyle.LARGE,
      position: google.maps.ControlPosition.LEFT_CENTER
    },
    scaleControl: true,
    streetViewControl: true,
    streetViewControlOptions: {
      position: google.maps.ControlPosition.LEFT_CENTER
    }
  };

  $scope.isOnline = function (currentUser) {
    return currentUser != null && currentUser.marker.icon !== mapService.getGreyMarker(currentUser.userName);
  };

  $scope.myStyle = {
    "height": (window.innerHeight) + "px",
    "width": "100%"
  };

  $scope.activeUsers = {};
  $scope.activeStreams = {};
  $scope.currentUser = null;

  $scope.$watch('selected', function () {
    window.setTimeout(function(){
      google.maps.event.trigger($scope.myMap, 'resize');
      if($scope.defaultPos){
        $scope.myMap.setCenter($scope.defaultPos);
      }
      $scope.refreshUsers();
    },10);
  });


  angular.element($window).bind('resize', function() {
    $scope.myStyle["height"] = window.innerHeight + "px";
    google.maps.event.trigger($scope.myMap, 'resize');
    $scope.refreshUsers();
  });

  var timeoutUser = function (user) {
    user.marker.setIcon(mapService.getGreyMarker(user.userName));
  };

  $scope.loadUser = function (data) {
    console.log("Socket: Location received!");
    var pos = null;
    if ( $scope.activeUsers[data.id] ) {
      pos = new google.maps.LatLng(data.lat, data.lng);
      $scope.activeUsers[data.id].marker.setPosition(pos);
      $scope.activeUsers[data.id].accuracy = data.accuracy;
      if ($scope.activeUsers[data.id].marker.icon === mapService.getGreyMarker($scope.activeUsers[data.id].userName)) {
        $scope.activeUsers[data.id].marker.setIcon(mapService.getRedMarker($scope.activeUsers[data.id].userName));
      }
    } else {
      pos = new google.maps.LatLng(data.lat, data.lng);

      var marker = mapService.createMarker($scope, pos, data);

      $scope.activeUsers[data.id] = {
        id : data.id,
        userName : data.name,
        login: data.username,
        deploymentGroup : data.group,
        marker : marker,
        groupId: data.groupId,
        accuracy: data.accuracy,
        streamUrl: data.streamUrl,
        picture: data.profilePicture ? ServerUrl + data.profilePicture : null,
        timeoutPromisse: null
      };

      mapService.fitBounds($scope, $scope.activeUsers);
    }

    mapService.applyCircle($scope, $scope.activeUsers[data.id]);

    if ($scope.activeUsers[data.id].timeoutPromisse != null) {
      $timeout.cancel($scope.activeUsers[data.id].timeoutPromisse);
    }
    $scope.activeUsers[data.id].timeoutPromisse = $timeout(function () {
      timeoutUser($scope.activeUsers[data.id]);
    }, 60000);
  };

  socket.on('connect', function() {
    socket.on('users:location', $scope.loadUser);

    socket.on('streaming:start', function(data) {
      var user = $scope.activeUsers[data.id];
      if ( ! user ) {
        return console.log('Unable to find user for streaming');
      }
      $http.get(ServerUrl + '/users/me').success(function(data) {
        if(data.length === 0){
          return;
        }
        var foundAdminOnline = false;
        if(data.group.id === user.groupId){
          showStream(user);
          showNotification(user);
          foundAdminOnline = true;
        }
        if(!foundAdminOnline){
          $scope.stopStream(user);
        }
      });
    });
    socket.on('streaming:stop', function(data) {
      delete $scope.activeStreams[data.id];
      $scope.activeUsers[data.id].marker.setIcon(mapService.getRedMarker($scope.activeUsers[data.id].userName));
      toaster.clearToastByUserId(data.id);
      if ($scope.activeStreams[data.id] != null && $scope.activeStreams[data.id].modal != null) {
        $scope.activeStreams[data.id].modal.close();
        $scope.activeStreams[data.id].modal = null;
      }
      $scope.$apply();
    });
      socket.on('disconnect', function(socket) {
        console.log('Got disconnect!');
      });
    });



  $scope.filterUsers = function() {

    if(!$scope.searchString){
      //show all users
      angular.forEach($scope.activeUsers, function(user) {
        //TODO add group so we can search for specific groups
        user.marker.setMap($scope.myMap);
        if (user.cityCircle) {user.cityCircle.setMap($scope.myMap);}

      });
    }else{
      //allows filter by regex
      angular.forEach($scope.activeUsers, function(user) {
        //TODO add group so we can search for specific groups
        var l_user_name = user.userName;
        var l_user_login = user.login;
        var re_match = new RegExp( $scope.searchString, "gi");

        if( l_user_name.match( re_match ) || l_user_login.match( re_match) ){
          user.marker.setMap($scope.myMap);
          if (user.cityCircle) {user.cityCircle.setMap($scope.myMap);}
        }else{
          user.marker.setMap(null);
          if (user.cityCircle) {user.cityCircle.setMap(null);}
        }
      });
    }
  };

  $scope.goToUser = function(user) {
    var path = '/analytics/' + user.id;
    $location.path(path);
  };

  $scope.showUser = function(userId) {
    $scope.currentUser = $scope.activeUsers[userId];
    $scope.streamButtonText = 'Livestream';
    if ( $scope.currentUser ) {
      google.maps.event.trigger($scope.myMap, "resize");
      $scope.myMap.setCenter($scope.currentUser.marker.getPosition());


      mapService.showBalloon($scope);
    }
  };

  $scope.requestStream = function(user) {
    $scope.streamButtonText = 'Sending...';
    $http.post(ServerUrl + '/streams/' + user.id + '/start')
      .success(function(data) {
        user.streamUrl = data.streamUrl;
        setStreamingUser(user);
      })
      .error(function(data) {
        $scope.streamButtonText = data.message;
      });
  };

  $scope.stopStream = function(user){
    $http.post(ServerUrl + '/streams/' + user.id + '/stop')
      .success(function(data) {
        if ( data.success ) {
          delete $scope.activeStreams[user.id];
        }
      }).error(function(data) {

      });
  };

  $scope.refreshUsers = function() {
    //if it is connected already
    if (loginService.isAuthenticated() && !socket.connected) {
      socket.connect(loginService.getToken());
    }
    $http.get(ServerUrl + '/users/online')
      .success(function(data) {
        if(data.length === 0){
          $scope.refreshMap();
          return;
        }
        var bounds = new google.maps.LatLngBounds();
        angular.forEach(data, function(user) {
          $scope.loadUser(user);
          var coord = new google.maps.LatLng(user.lat, user.lng);
          bounds.extend(coord);
        });
        $scope.myMap.fitBounds(bounds);
      });
  };

  $scope.refreshMap = function() {
    $http.get(ServerUrl + '/users/me').success(function(data) {
      if(data.length === 0){
        return;
      }
      if(!data.lastPos || isNaN(data.lastPos.lat) || isNaN(data.lastPos.lng)){
        return;
      }else{
        changeMapPos(data.lastPos.lat, data.lastPos.lng);
        return;
      }
      if(!data.group.lat || !data.group.lng ||
        isNaN(data.group.lat) || isNaN(data.group.lat)){
        return;
      }else{
        changeMapPos(data.group.lat, data.group.lng);
      }
    });
  };

  $scope.popNotification = function(user){
    toaster.pop('note', '', user.userName + " is streaming",0, 'trustedHtml', function(user){
      mapService.closeBalloon();
      showModal(user);
    }, user);
  };

  function changeMapPos(lat, lng){
    var pos = new google.maps.LatLng(lat, lng);
    $scope.myMap.panTo(pos);
    $scope.defaultPos = pos;
  }

  function showModal(user){
    console.log('showModal with user=['+user+']');
    $scope.activeStreams[user.id].modal =  $modal.open({
      templateUrl: 'views/player.html',
      controller: 'ModalVideoCtrl',
      backdrop: false,
      resolve: {
        user: function(){return user;},
        streamUrl: function(){return user.streamUrl;},
        ServerUrl: function(){return ServerUrl;}
      }
    });
  }

  function setStreamingUser(user) {
    $scope.activeStreams[user.id] = {
      status: 'streaming',
      streamId: user.id,
      userName: user.userName,
      groupId: user.groupId,
      streamUrl: user.streamUrl,
      modal: null
    };
  }

  function showStream(user) {
    setStreamingUser(user);
    user.marker.setIcon(mapService.getGreenMarker(user.userName));
  }

  function showNotification(user){
    $scope.popNotification(user);
  }

  $scope.refreshUsers();


}); //end-RealTimeCtrl


