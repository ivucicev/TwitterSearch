var GEO_ROUTE = '/1.1/search/tweets.json';
var GEO_SEARCH = '/1.1/geo/search.json';
var Twitter = (function () {
    function Twitter() {
        var _this = this;
        this._twitterAuthObject = {};
        this._gMarkersArray = [];
        this._routeArray = [];
        this.bindEvents = function () {
            OAuth.initialize('7StUz8jr61ApE7hEwX5fAMsVIjY');
            google.maps.event.addListener(map, 'click', function (e) {
                _this.placeMarker(e.latLng);
            });
            $("#twitter-login").on("click", function () {
                _this.TwitterAutorajz();
            });
            $("#twitter-kveri").on("click", function (e) {
                e.preventDefault();
                _this.TwitterQuery();
            });
        };
        this.placeMarker = function (latlng) {
            if (_this._gMarkersArray.length > 1) {
                $.each(_this._gMarkersArray, function (i, m) {
                    m.setMap(null);
                });
                _this._gMarkersArray = [];
                _this._boundingBox.setMap(null);
                _this._boundingBox.setMap(null);
                _this._cityCircle.setMap(null);
                _this._renderer.setMap(null);
                return;
            }
            var marker = new google.maps.Marker({
                position: latlng,
                map: map
            });
            _this._gMarkersArray.push(marker);
            if (_this._gMarkersArray.length > 1)
                _this.directions();
        };
        this.directions = function () {
            $.LoadingOverlay("show");
            var self = _this;
            _this._renderer = new google.maps.DirectionsRenderer({ 'draggable': true });
            _this._renderer.setMap(map);
            _this._renderer.setOptions({ suppressMarkers: true });
            _this._renderer.setPanel(document.getElementById("directionsPanel"));
            var ser = new google.maps.DirectionsService();
            ser.route({
                'origin': new google.maps.LatLng(self._gMarkersArray[0].position.lat(), self._gMarkersArray[0].position.lng()),
                'destination': new google.maps.LatLng(self._gMarkersArray[1].position.lat(), self._gMarkersArray[1].position.lng()),
                'travelMode': google.maps.DirectionsTravelMode.DRIVING }, function (res, sts) {
                console.log(res, sts);
                if (sts == 'OK') {
                    _this._renderer.setDirections(res);
                    self._routeArray = res.routes[0].overview_path;
                    self._bounds = res.routes[0].bounds;
                    self.getTweets();
                }
                else {
                    $.LoadingOverlay("hide");
                }
            });
        };
        this.getTweets = function () {
            var temp = JSON.parse(JSON.stringify(_this._bounds));
            var sn = (temp.south + temp.north) / 2;
            var we = (temp.west + temp.east) / 2;
            var dist = _this.calculateDistance(temp.south, temp.west, temp.north, temp.east);
            var boundingCoords = [
                { lat: temp.south, lng: temp.west },
                { lat: temp.south, lng: temp.east },
                { lat: temp.north, lng: temp.east },
                { lat: temp.north, lng: temp.west }
            ];
            _this._boundingBox = new google.maps.Polygon({
                paths: boundingCoords,
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.35
            });
            _this._boundingBox.setMap(map);
            _this._cityCircle = new google.maps.Circle({
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.35,
                map: map,
                center: { lat: sn, lng: we },
                radius: (dist) * 1000
            });
            var hashtag = window.encodeURIComponent($("#twitter-api-hashtag").val());
            _this.requestTweets('?q=' + hashtag + '&geocode=' + sn + ',' + we + ',' + Math.round(dist) + 'km&count=100&result_type=mixed');
        };
        this.requestTweets = function (URL, cnt) {
            try {
                var limit = Number($("#twitter-api-limit").val());
            }
            catch (e) {
                alert("Incorrect limit.");
            }
            try {
                _this._twitterAuthObject.get(GEO_ROUTE + URL)
                    .done(function (response) {
                    ;
                    var tweetCount = cnt || 0;
                    $.each(response.statuses, function (index, t) {
                        var text = null, lat = null, lon = null;
                        try {
                            text = t.text;
                            lat = t.coordinates.coordinates[1];
                            lon = t.coordinates.coordinates[0];
                        }
                        catch (e) {
                        }
                        if (text && lat && lon) {
                            var markup = "";
                            markup += text;
                            markup += "<br />";
                            markup += "<a href='https://twitter.com/" + t.user.screen_name + "/status/" + String(t.id_str) + "' target='_blank'> Pogledaj tweet </a>";
                            markup += "<br />";
                            markup += "<img src='" + t.user.profile_image_url + "' height='50px' width='50px' />";
                            markup += "<b><a href='https://twitter.com/" + t.user.screen_name + "' target='_blank'>" + t.user.name + "</b></a><br />";
                            markup += "<small>" + t.user.description + "</small><br />";
                            _this.placeInfoWindow(markup, lat, lon);
                            tweetCount++;
                        }
                    });
                    if (tweetCount < limit && response.search_metadata.next_results) {
                        _this.requestTweets(response.search_metadata.next_results, tweetCount);
                    }
                    else {
                        $.LoadingOverlay("hide");
                    }
                })
                    .fail(function (err) {
                    $.LoadingOverlay("hide");
                    console.log(err);
                });
            }
            catch (e) {
                $.LoadingOverlay("hide");
                alert("You need to be logged in.");
            }
        };
        this.calculateDistance = function (lat1, lon1, lat2, lon2) {
            var R = 6371;
            var dLat = (lat2 - lat1) * (Math.PI / 180);
            var dLon = (lon2 - lon1) * (Math.PI / 180);
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((lat1 * (Math.PI / 180))) * Math.cos((lat2 * (Math.PI / 180))) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            var d = R * c;
            return Number(d) / 2;
        };
        this.placeInfoWindow = function (text, lat, lon) {
            var infowindow = new google.maps.InfoWindow({
                content: text
            });
            var image = {
                url: 'http://4.bp.blogspot.com/-KO1FsAuQccg/VdI_BUrUp1I/AAAAAAAACBs/puSAV54RDMg/s1600/twitter.png',
                size: new google.maps.Size(32, 32),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(0, 0)
            };
            var marker = new google.maps.Marker({
                position: { lat: lat, lng: lon },
                map: map,
                icon: image,
                title: 'Twitter.'
            });
            _this._gMarkersArray.push(marker);
            infowindow.open(map, marker);
            marker.addListener('click', function () {
                infowindow.open(map, marker);
            });
        };
        this.TwitterAutorajz = function () {
            $.LoadingOverlay("show");
            OAuth.popup('twitter')
                .done(function (result) {
                var temp = $.extend(true, {}, result);
                _this._twitterAuthObject = temp;
                $.LoadingOverlay("hide");
                window.localStorage.setItem("twitter", JSON.stringify(temp));
            })
                .fail(function (err) {
                $.LoadingOverlay("hide");
                console.log(err);
            });
        };
        this.TwitterQuery = function () {
            $.LoadingOverlay("show");
            _this._twitterAuthObject.get($("#twitter-api-route").val())
                .done(function (response) {
                $.LoadingOverlay("hide");
                console.log(response);
            })
                .fail(function (err) {
                $.LoadingOverlay("hide");
                console.log(err);
            });
        };
        this.bindEvents();
    }
    return Twitter;
}());
new Twitter();
