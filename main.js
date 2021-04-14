require(["esri/Map", "esri/views/MapView","esri/request","esri/widgets/Expand"], 
function(Map, MapView, esriRequest,Expand) {
    "use strict"
    const resultsDiv = document.getElementById("resultsDiv");
    const xInput = document.getElementById("X");
    const yInput = document.getElementById("Y");
    const sInput = document.getElementById("station")
    const rInput = document.getElementById("routeID")
    const stationingForm = document.getElementById("stationingForm")
    const map = new Map({
      basemap: "gray" // Basemap  layer service
    });

    const view = new MapView({
      map: map, 
      center: [-111.8910, 40.7608], // Longitude, latitude
      zoom: 13, // Zoom level
      container: "viewDiv" // Div element
    });

    const stationExpand = new Expand({
      expandIconClass: "esri-icon-layer-list",  // see https://developers.arcgis.com/javascript/latest/guide/esri-icon-font/
      // expandTooltip: "Expand LayerList", // optional, defaults to "Expand" for English locale
      view: view,
      content: stationingForm
    })

    view.ui.add(stationExpand, "top-right");

    getStation.addEventListener("click", function(btn) {
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

   getCoords.addEventListener("click", function(btn){
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

  function makeRequest(url, options){
      esriRequest(url, options).then(function(response) {
          console.log("response", response);
          let responseJSON = JSON.stringify(response, null, 2);
          alert(responseJSON);
        });
  }
  });