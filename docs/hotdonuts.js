var hd = angular.module('HotDonuts', []);

hd.controller('DonutsController', ['$scope','$http','$location', function($scope, $http, $location) {
  function positionReceived(pos) {
    sortByLatLon(pos.coords.latitude, pos.coords.longitude);
  };

  function populateLocations(data) {
    $scope.locations = data.data;
    var zip = $location.search()['zip'];
    if (zip) {
      $scope.zip = zip;
      sortByZip(zip);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(positionReceived);
    };
    setTimeout(CallTrk.swap, 0);
  }

  function populateCurrent(data) {
    $scope.currents = data.data;
    $http.get("http://live.hotdonuts.info/locations.data").then(populateLocations);
  }

  function populateLocation(id) {
    return function(data) {
      $scope.locationHistory[id] = data.data;
    }
  }

  $scope.gmapsLink = function(loc) {
    var q = loc.address1 + " " + loc.address2 + " " + loc.city + ", " + loc.province + " " + loc.postalcode;
    return "http://maps.google.com/?q=" + encodeURIComponent(q);
  };

  function proximityComparator(lat, lon) {
    return function(l1, l2) {
      var d1 = Math.sqrt(Math.pow(parseFloat(l1.latitude) - lat, 2) + Math.pow(parseFloat(l1.longitude) - lon, 2))
      var d2 = Math.sqrt(Math.pow(parseFloat(l2.latitude) - lat, 2) + Math.pow(parseFloat(l2.longitude) - lon, 2))
      return d1 - d2;
    }
  };

  $scope.sortLocations = function() {
    var zip = $scope.zip;
    $location.search('zip', zip);
    sortByZip(zip);
  }

  function sortByLatLon(lat, lon) {
    $scope.locations.sort(proximityComparator(lat, lon));
  }

  function sortByZip(zip) {
    function googleResult(data) {
      var locale = data.data.results[0].geometry.location;
      var lat = locale.lat;
      var lon = locale.lng;

      sortByLatLon(lat, lon);
    }

    $http.get("http://maps.googleapis.com/maps/api/geocode/json?address=" + zip).then(googleResult);
  };

  $scope.locationHistory = {};
  $scope.expanded = {};
  $scope.toggleExpanded = function($event, id) {
    // don't expand on link clicks
    if ($event.target.nodeName == 'A') {
      return;
    }
    $scope.expanded[id] = !$scope.expanded[id];
    if ($scope.expanded[id]) {
      $http.get("http://live.hotdonuts.info/" + id + ".data").then(populateLocation(id));
    }
  };

  $http.get("http://live.hotdonuts.info/current.data").then(populateCurrent);
  }]);

hd.directive("hothistory", function() {
  return {
    templateUrl: 'hothistory.html',
    replace: true,
    scope: {
      data: "=data"
    },

    controller: ['$scope', function($scope) {

      function splitIntoDays() {
        $scope.days = [];
        $scope.dayTransitions = {};
        var data = $scope.data;
        var old_ds = null;
        var twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        twoWeeksAgo.setHours(0,0,0,0);
        for (var i in data) {
          var ts = data[i][0];
          var lit = data[i][1];
          var d = new Date();
          d.setTime(ts * 1000);
          if (d < twoWeeksAgo) {
            continue;
          }
          var ds = d.toDateString();
          if (ds != old_ds) {
            $scope.days.push(ds);
          }
          if (!$scope.dayTransitions[ds]) {
            $scope.dayTransitions[ds] = [];
          }
          $scope.dayTransitions[ds].push([d, lit]);
          old_ds = ds;
        }
        $scope.days = $scope.days.reverse();
      }

      splitIntoDays();
    }]
  };
});
