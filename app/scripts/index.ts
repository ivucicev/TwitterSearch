
/// <reference path="../typings/tsd.d.ts" />

declare var OAuth;
declare var google;
declare var map;

const GEO_ROUTE: string = '/1.1/search/tweets.json';
const GEO_SEARCH: string = '/1.1/geo/search.json';

class Twitter {

    private _twitterAuthObject: any = {};
    private _gMarkersArray: any[] = [];
    private _routeArray: any[] = [];
    private _bounds: any;
    private _boundingBox: any;
    private _cityCircle: any;
    private _renderer: any;

    constructor() {
        this.bindEvents();
    }

    private bindEvents = () => {

        OAuth.initialize('7StUz8jr61ApE7hEwX5fAMsVIjY');

        google.maps.event.addListener(map, 'click', (e) => {
           this.placeMarker(e.latLng);
        });

        $("#twitter-login").on("click", () => {
            this.TwitterAutorajz();
        });

        $("#twitter-kveri").on("click", (e) => {
            e.preventDefault();
            this.TwitterQuery();
        });

    }

    private placeMarker = (latlng) => {

        if (this._gMarkersArray.length > 1) {
            $.each(this._gMarkersArray, (i: number, m: any) => {
                m.setMap(null);
            });
            this._gMarkersArray = [];
            this._boundingBox.setMap(null);
            this._boundingBox.setMap(null);
            this._cityCircle.setMap(null);
            this._renderer.setMap(null);
            return;
        }

        var marker = new google.maps.Marker({
            position: latlng,
            map: map
        });

        this._gMarkersArray.push(marker);

        if (this._gMarkersArray.length > 1) this.directions();

    }

    private directions = () => {

        ($ as any).LoadingOverlay("show");

        var self = this;

        this._renderer = new google.maps.DirectionsRenderer( {'draggable':true} );
        this._renderer.setMap(map);
        this._renderer.setOptions( { suppressMarkers: true } );
        this._renderer.setPanel(document.getElementById("directionsPanel"));
        var ser = new google.maps.DirectionsService();

        ser.route(
            {
                'origin':  new google.maps.LatLng(self._gMarkersArray[0].position.lat(), self._gMarkersArray[0].position.lng()),
                'destination': new google.maps.LatLng(self._gMarkersArray[1].position.lat(), self._gMarkersArray[1].position.lng()),
                'travelMode': google.maps.DirectionsTravelMode.DRIVING},
                (res, sts) => {
                    console.log(res, sts);
                    if(sts=='OK') {
                        this._renderer.setDirections(res);
                        self._routeArray = res.routes[0].overview_path;
                        self._bounds = res.routes[0].bounds;
                        self.getTweets();
                    } else {
                        ($ as any).LoadingOverlay("hide");
                    }
            }
        );

    }

    private getTweets = () => {

        let temp = JSON.parse(JSON.stringify(this._bounds));

        let sn = (temp.south + temp.north) / 2;
        let we = (temp.west + temp.east) / 2;
        let dist = this.calculateDistance(temp.south, temp.west, temp.north, temp.east);

        var boundingCoords = [
          //{lat: temp.south, lng: temp.west},
          {lat: temp.south, lng: temp.west},
          {lat: temp.south, lng: temp.east},
          {lat: temp.north, lng: temp.east},
          {lat: temp.north, lng: temp.west}
        ];

        // Construct the polygon.
        this._boundingBox = new google.maps.Polygon({
          paths: boundingCoords,
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.35
        });

        this._boundingBox.setMap(map);

        this._cityCircle = new google.maps.Circle({
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.35,
            map: map,
            center: {lat: sn, lng: we},
            radius: (dist) * 1000
        });

        var hashtag: any = (window as any).encodeURIComponent($("#twitter-api-hashtag").val());

        this.requestTweets('?q=' + hashtag + '&geocode=' + sn + ',' + we + ',' + Math.round(dist) + 'km&count=100&result_type=mixed');

    }

    private requestTweets = (URL, cnt?) => {

        try {
            var limit = Number($("#twitter-api-limit").val());
        } catch(e) {
            alert("Incorrect limit.");
        }

        try {

            this._twitterAuthObject.get(GEO_ROUTE + URL)
            .done((response) => {;
                var tweetCount = cnt || 0;
                $.each(response.statuses, (index: number, t: any) => {
                    let text = null, lat = null, lon = null;
                    try {
                        text = t.text;
                        lat = t.coordinates.coordinates[1];
                        lon = t.coordinates.coordinates[0];
                    } catch(e) {
                        // ignore crappy twitter exception
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

                        this.placeInfoWindow(markup, lat, lon);
                        tweetCount++;
                    }
                });
                if (tweetCount < limit && response.search_metadata.next_results) {
                    this.requestTweets(response.search_metadata.next_results, tweetCount);
                } else {
                    ($ as any).LoadingOverlay("hide");
                }
            })
            .fail((err) => {
                ($ as any).LoadingOverlay("hide");
                console.log(err);
            });

        } catch(e) {

            ($ as any).LoadingOverlay("hide");
            alert("You need to be logged in.");

        }

    }

    private calculateDistance = (lat1, lon1, lat2, lon2) => {

        var R = 6371;
		var dLat = (lat2-lat1) * (Math.PI/180);
		var dLon = (lon2-lon1) * (Math.PI/180);
		var a =
				Math.sin(dLat/2) * Math.sin(dLat/2) +
				Math.cos((lat1 * (Math.PI/180))) * Math.cos((lat2 * (Math.PI/180))) *
				Math.sin(dLon/2) * Math.sin(dLon/2);
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		var d = R * c;
		return Number(d) / 2;

    }

    private placeInfoWindow = (text, lat, lon) => {

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
          position: {lat: lat, lng: lon},
          map: map,
          icon: image,
          title: 'Twitter.'
        });

        this._gMarkersArray.push(marker);

        infowindow.open(map, marker);

        marker.addListener('click', () => {
            infowindow.open(map, marker);
        });

    }

    public TwitterAutorajz = () => {
        ($ as any).LoadingOverlay("show");
        OAuth.popup('twitter')
        .done((result) => {
                var temp = $.extend(true, {}, result);
                this._twitterAuthObject = temp;
                ($ as any).LoadingOverlay("hide");
                window.localStorage.setItem("twitter", JSON.stringify(temp));
            })
            .fail((err) => {
            ($ as any).LoadingOverlay("hide");
              console.log(err);
        });

    }

    public TwitterQuery = () => {
        ($ as any).LoadingOverlay("show");
        this._twitterAuthObject.get($("#twitter-api-route").val())
        .done((response) => {
            ($ as any).LoadingOverlay("hide");
            console.log(response);
        })
        .fail((err) => {
            ($ as any).LoadingOverlay("hide");
            console.log(err);
        });

    }

}

new Twitter();
