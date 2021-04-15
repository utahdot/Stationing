require(["esri/geometry/Point", "esri/Map","esri/layers/MapImageLayer", "esri/views/MapView", "esri/request", "esri/widgets/Expand","esri/geometry/projection","esri/geometry/SpatialReference"],
  function (Point, Map, MapImageLayer, MapView, esriRequest, Expand,projection,SpatialReference) {
    "use strict"
    const xInput = document.getElementById("X");
    const yInput = document.getElementById("Y");
    const sInput = document.getElementById("station");
    const rInput = document.getElementById("routeID");
    const stationingForm = document.getElementById("stationingForm");

    const stationLayer = new MapImageLayer({
      url: "https://maps.udot.utah.gov/randh/rest/services/Test/MM_Stationing_Test/MapServer"
    });

    const map = new Map({
      layers: [stationLayer],
      basemap: "gray" // Basemap  layer service
      
    });
   
    const view = new MapView({
      map: map,
      
      center: [-111.8910, 40.7608], // Longitude, latitude
      zoom: 13, // Zoom level
      container: "viewDiv" // Div element
    });
    
    view.on("click", function(event){
      const WGS84 = new SpatialReference({ wkid: 3857 });
      const NAD83 = new SpatialReference({ wkid: 26912 });
      console.log(event.mapPoint.x);
      console.log(event.mapPoint.y)
      let point = new Point({
        type: "point",
        x: event.mapPoint.x,
        y: event.mapPoint.y
      })
      projection.load().then(function(){

        // const transformations = projection.getTransformations(WGS84, NAD83);
        // console.log(transformations);

        point = projection.project(point, NAD83);
        console.log(point);
  
      })

    })
    
    const stationExpand = new Expand({
      expandIconClass: "esri-icon-layer-list",  
      view: view,
      content: stationingForm
    })

    view.ui.add(stationExpand, "top-right");

    getStation.addEventListener("click", function (btn) {
      const X = xInput.value;
      const Y = yInput.value;
      const url = btn.target.value;

      let options = {
        query: {
          locations: `[{"routeId" : "", "geometry" : { "x" : ${X}, "y" : ${Y} }}]`,
          inSR: 26912,
          outSR: 4326,
          f: "json"
        },
        responseType: "json"
      };
      makeRequest(url, options)
    });

    getCoords.addEventListener("click", function (btn) {
      const url = btn.target.value;
      const station = sInput.value;
      const routeID = rInput.value;

      let options = {
        query: {
          locations: `[{ "routeId" : ${routeID}, "station" : ${station} }]`,
          outSR: 4326,
          f: "json"
        },
        responseType: "json"
      };
      makeRequest(url, options)

    });

    function makeRequest(url, options) {
      esriRequest(url, options).then(function (response) {
        console.log("response", response);
        let responseJSON = JSON.stringify(response, null, 2);
        alert(responseJSON);
      });
    }
  });