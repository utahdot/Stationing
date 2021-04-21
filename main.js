/**todo
 * geom->measure?
 * route, measure -> geom -> station 
 * station -> measure
 * pop-up
 * Zoom level
 * station+50.01 ->next up
 * station+49.9-> station
 * 
 * 
 * https://jsfiddle.net/b3gcehnf/ 
 * https://codepen.io/U_B_U/pen/bGgaBKX?editors=1000
 * 
 * 
*/

require(["esri/Graphic","esri/symbols/SimpleFillSymbol","esri/symbols/SimpleMarkerSymbol","esri/layers/GraphicsLayer","esri/geometry/Point","esri/geometry/geometryEngine", "esri/layers/FeatureLayer", "esri/Map", "esri/layers/MapImageLayer", "esri/views/MapView", "esri/request", "esri/widgets/Expand", "esri/geometry/projection", "esri/geometry/SpatialReference"],
  function (Graphic,SimpleFillSymbol,SimpleMarkerSymbol,GraphicsLayer,Point, geometryEngine, FeatureLayer, Map, MapImageLayer, MapView, esriRequest, Expand, projection, SpatialReference) {
    "use strict"
    const mpInput = document.getElementById("milepost");
    const sInput = document.getElementById("station");
    const rInput = document.getElementById("routeID");
    const stationingForm = document.getElementById("stationingForm");
    const NAD83 = new SpatialReference({ wkid: 26912 });
    
        // Layers
        var bufferLayer = new GraphicsLayer();
        var selectionLayer = new GraphicsLayer();
      
        // Symbols
        var Symbol = new SimpleMarkerSymbol({
          color: [240, 98, 146],
          outline: {
            color: [128, 128, 128, 0.5],
            width: 0.5
          }
        });
        var selectSymbol = new SimpleMarkerSymbol({
          color: "cyan",
          outline: {
            color: [128, 128, 128, 0.5],
            width: "0.5px"
          }
        });
        var nearestSymbol = new SimpleMarkerSymbol({
          color: "#ffd700",
          size: 20,
          style: "circle",
          outline: {
            color: [128, 128, 128, 0.5],
            width: 3
          }
        });
        var fillSymbol = new SimpleFillSymbol({
          color: [33, 150, 243, 0.5],
          outline: {
            color: [128, 128, 128, 0.5],
            width: "2px"
          }
        });


    const routesLayer = new FeatureLayer({
      url: "https://maps.udot.utah.gov/randh/rest/services/Test/MM_Stationing_Test/MapServer/1",
    });

    const stationLayer = new FeatureLayer({
      url: "https://maps.udot.utah.gov/randh/rest/services/Test/MM_Stationing_Test/MapServer/0"
    });
    
    const map = new Map({
      layers: [routesLayer, stationLayer,bufferLayer, selectionLayer],
      basemap: "gray" // Basemap  layer service
    });

    const view = new MapView({
      map: map,
      center: [-111.8910, 40.7608], // Longitude, latitude
      zoom: 13, // Zoom level
      container: "viewDiv" // Div element
    });

    const stationExpand = new Expand({
      expandIconClass: "esri-icon-layer-list",
      view: view,
      expanded: true,
      content: stationingForm
    });

    view.ui.add(stationExpand, "top-right");

    let stationLayerView;
    view.whenLayerView(stationLayer).then(function(layer){
      stationLayerView = layer;
    });

    let routesLayerView;
    view.whenLayerView(routesLayer).then(function(layer){
      routesLayerView = layer;
    });

    function highlightFilter(route, station) {
      station = splitstation(station)
      let featureFilter = {
        where: `STATION_LABEL = '${route}_${station}'`
      };
      console.log(featureFilter);
      // set effect on excluded features
      // make them gray and transparent
      
      stationLayerView.effect = {
          filter: featureFilter,
          excludedEffect: "grayscale(100%) opacity(30%)"
      };

    }
   
    function convertSR(geometry) {
      /**Promise takes in latitude and longitude
       * converts to point geometry
       * projects to NAD83 Zone 12
       * TODO: make this just return the reprojected point
       */
      return new Promise((resolve) => {
        projection.load().then(function () {
         
          const projectedGeom = projection.project(geometry, NAD83);
         
          resolve(projectedGeom);
        });
      });
    }

    view.on("click", function (event) {
      /**gets the coordinates of the spot you click in the map
      * converts those coordinates to NAD83
      * populates those coordinates in the stationing form
      */

       let mapPoint = new Point({
        x: event.mapPoint.longitude,
        y: event.mapPoint.latitude
      })

      convertSR(mapPoint).then((projectedPoint)=>{
        console.log(projectedPoint.spatialReference.wkid);
        const buffer = geometryEngine.buffer(
          projectedPoint,
          100, "feet"
        );
        bufferLayer.removeAll();
        selectionLayer.removeAll();
        bufferLayer.add(new Graphic({ geometry: buffer, symbol: fillSymbol }));
        let query = {geometry: buffer,spatialRelationship: "intersects", returnGeometry: true,outFields: ["*"]};
        routesLayer.queryFeatures(query).then(function(results){
        
          routesLayerView.filter = {
             geometry: query.geometry,
           };
           
            if(results.features.length>0){
            let intersect = geometryEngine.intersect(results.features[0].geometry,buffer);
          let nearestPoint = geometryEngine.nearestVertex(intersect,projectedPoint);

          let res = new Point({spatialReference: NAD83,y: nearestPoint.coordinate.y, x: nearestPoint.coordinate.x});

          selectionLayer.add(new Graphic({ geometry: res, symbol: selectSymbol }));

          setXYInput(nearestPoint.coordinate.x,nearestPoint.coordinate.y);
         } 
      });

       });
            
    });

    function setXYInput(x, y) {
      /**sets coodinates in stationing form */
      
      xInput.value = x;
      yInput.value = y;
    }

    getStation.addEventListener("click", function (btn) {
      /**listener for the 'Coordinates" portion of the Coordinates 
       * fetches values from form and adds them to the options for the REST API Call
      */
      const routeID = rInput.value;
      const measure = mpInput.value

      let options = {
        query: {
          locations: `[{"routeId": ${routeID},"measure": ${measure}}]`,
          outSR: 4326,
          f: "json"
        },
        responseType: "json"
      };
      makeRequest(options, "measureToGeometry")
    });

    getMP.addEventListener("click", function (btn) {
      /**listener for the 'Stationing" portion of the Coordinates 
      * fetches values from form and adds them to the options for the REST API Call
      */
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
      
      highlightFilter(routeID, station)
      makeRequest(options, "stationToGeometry")

    });
    function splitstation(station){
      return station.split("+")[0];
    }

    const urls={
      "measureToGeometry" : "https://maps.udot.utah.gov/randh/rest/services/ALRS/MapServer/exts/LRSServer/networkLayers/0/measureToGeometry",
      "stationToGeometry" : "https://maps.udot.utah.gov/randh/rest/services/Test/MM_Stationing_Test/MapServer/exts/LRSServer/eventLayers/0/stationToGeometry",
      "geometryToStation" : "https://maps.udot.utah.gov/randh/rest/services/Test/MM_Stationing_Test/MapServer/exts/LRSServer/eventLayers/0/geometryToStation"

    }
    function makeRequest(options, type) {
      /**Takes in REST Call options and which type, 
       * based on which button was clicked i the form */
      esriRequest(urls[type], options).then(function (response) {
        console.log(response)
        setResults(response, type);
      });
    }

    function setResults(response, type) {
      /**takes results of rest call
       * gets the x/y and route/station depending on call type
       * sets to form
       * calls zoomTo, to center the map.
       */
   
      let x, y,station,routeID,measure;
      if (type == "stationToGeometry") {
        console.log(response)
        routeID = response["data"]["locations"][0].routeId;
        measure = response["data"]["locations"][0]["geometries"][0].m;
        x = response["data"]["locations"][0]["geometries"][0].x;
        y = response["data"]["locations"][0]["geometries"][0].y;
        mpInput.value = Number((measure).toFixed(3));

      }
      else if (type=="measureToGeometry"){
        x = response["data"]["locations"][0]["geometry"].x;
        y = response["data"]["locations"][0]["geometry"].y;
        routeID = response["data"]["locations"][0].routeId;

        convertSR(new Point({x:x, y:y})).then((r) =>{
          let options = {
            query: {
              locations: `[{"routeId" : ${routeID}, "geometry" : { "x" : ${r.x}, "y" : ${r.y} }}]`,
              inSR: 26912,
              outSR: 4326,
              f: "json"
            },
            responseType: "json"
          };
          makeRequest(options, "geometryToStation")
        })
        
      }else{
        station = response["data"]["locations"][0]["results"][0].station;
        routeID = response["data"]["locations"][0]["results"][0].routeId;
        sInput.value = station;
        rInput.value = routeID;
        highlightFilter(routeID, station)        
        x = response["data"]["locations"][0]["results"][0].geometry.x;
        y = response["data"]["locations"][0]["results"][0].geometry.y;
      }
      zoomTo(x, y);
    }

    function zoomTo(x, y) {
      view.goTo({
        center: [x, y]

      }).catch(function (error) {
        if (error.name != "AbortError") {
          console.error(error);
        }
      });

    }
  });