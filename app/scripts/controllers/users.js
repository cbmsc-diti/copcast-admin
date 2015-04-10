var app = angular.module('copcastAdminApp');

app.controller('UserListCtrl', function($scope, $routeParams, $http, $location, ServerUrl){

    console.log("user-1");

    // callback for ng-click 'editUser':
    $scope.editUser = function (userId) {
        $location.path('/user-detail/' + userId);
    };

    // callback for ng-click 'deleteUser':
    $scope.deleteUser = function (userId) {
        //UserFactory.delete({ id: userId });
        //$scope.users = UsersFactory.query();
    };

    // callback for ng-click 'createUser':
    $scope.createNewUser = function () {
        $location.path('/user-creation');
    };
  console.log("user-2");

  $http.get(ServerUrl + '/users',
        { params : {
            page : $scope.page
        }
       }
    ).success(function(data) {
        $scope.users = data;
    }).error(function(data) {


   });

}).controller('UserDetailCtrl', function($scope, $routeParams, $http, $location, ServerUrl, $upload){

    $scope.hasProfilePicture = false;
    $scope.userPicture = '';

    $scope.onFileSelect = function($files) {
        $scope.hasProfilePicture = false;
        $scope.pictureUrl = '';
        $scope.upload = $upload.upload({
            url: ServerUrl + '/users/'+$scope.user.id+'/upload-picture',
            method: 'POST',
            data: {userPicture: $scope.userPicture},
            file: $files[0]
        }).success(function(data, status, headers, config) {
            $scope.hasProfilePicture = true;
            $scope.pictureUrl = ServerUrl + '/pictures/'+$scope.user.id+'/original/show';
        }).error(function(data, status){
            console.log('error with data=['+data+']');
            $scope.hasProfilePicture = false;
        });
    };

    $scope.changePassword = function () {
        $scope.passwordMessage = '';
        if(!$scope.currentPassword){
            $scope.passwordMessage = 'Current password filed is empty.';
            return;
        }
        if(!$scope.newPassword || !$scope.passwordConfirmation){
            $scope.passwordMessage = 'Password or password confirmation are empty.';
            return;
        }
        if($scope.newPassword !== $scope.passwordConfirmation){
            $scope.passwordMessage = 'Wrong password combination';
            return;
        }
        $http.post(ServerUrl + '/users/' + $scope.user.id+'/change-password',
            { password: { oldPassword:$scope.currentPassword, newPassword: $scope.newPassword } }).success(function(data){
            $location.path('/user-list');
        }).error(function(data) {
            $scope.passwordMessage = data;
            $scope.currentPassword = '';
            $scope.newPassword = '';
            $scope.passwordConfirmation = '';
        });
    };

    // callback for ng-click 'updateUser':
    $scope.updateUser = function () {
        $http.post(ServerUrl + '/users/' + $scope.user.id, $scope.user).success(function(data){
            $location.path('/user-list');
        }).error(function(data) {
            $scope.serverMessage = data;
        });
    };

    // callback for ng-click 'cancel':
    $scope.cancel = function () {
        $location.path('/user-list');
    };

    $http.get(ServerUrl + '/users/'+ $routeParams.id).success(function(data) {
        $scope.user = data;
        $http.get(ServerUrl + '/users/me').success(function(data) {
            if(data.length === 0){
                return;
            }
            if($scope.user.profilePicture){
                $scope.hasProfilePicture = true;
                $scope.pictureUrl = ServerUrl + '/pictures/'+$scope.user.id+'/original/show';
            }
        });
    }).error(function(data) {
    });
    $http.get(ServerUrl + '/groups').success(function(data){
        $scope.groups = data;
    });
}).controller('UserCreationCtrl', function($scope, $routeParams, $http, $location, ServerUrl){

    // callback for ng-click 'createNewUser':
    $scope.createNewUser = function () {
        $http.post(ServerUrl + '/users',
        $scope.user).success(function(data) {
            $location.path('/user-list');
        }).error(function(data) {
            $scope.serverMessage = data;
        });
    };
    $http.get(ServerUrl + '/groups').success(function(data){
        $scope.groups = data;
    });
});
