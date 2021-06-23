/**todo
 * 
 *
 * 
 * get measure if there is no reference post?
 * 
 * 
 * copy to clip board
 * instructions modal
 *re-use of routeId/routeID is causing bugs
 *
 */

 require([
  "esri/geometry/Polyline",
  "esri/widgets/BasemapGallery",
  "esri/layers/support/LabelClass",
  "esri/Graphic",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/layers/GraphicsLayer",
  "esri/geometry/Point",
  "esri/geometry/geometryEngine",
  "esri/layers/FeatureLayer",
  "esri/Map",
  "esri/views/MapView",
  "esri/request",
  "esri/widgets/Expand",
  "esri/geometry/projection",
  "esri/geometry/SpatialReference",
], function (
  Polyline,
  BasemapGallery,
  LabelClass,
  Graphic,
  SimpleFillSymbol,
  SimpleMarkerSymbol,
  GraphicsLayer,
  Point,
  geometryEngine,
  FeatureLayer,
  Map,
  MapView,
  esriRequest,
  Expand,
  projection,
  SpatialReference
) {
  "use strict";
  const mpInput = document.getElementById("milepost");
  const sInput = document.getElementById("station");
  const rInput = document.getElementById("routeID");
  const stationingForm = document.getElementById("stationingForm");
  const externalLinks = document.getElementById("extrnalLinks");
  const offset = document.getElementById("offset");

  const exMeasure = document.querySelector("#exMeasure");
  const exLat = document.querySelector("#exLat");
  const exLon = document.querySelector("#exLon");
  const openRoadview = document.querySelector("#openRoadview");
  const openGoogleStreet = document.querySelector("#openGoogleStreet");
  const exrouteId = document.querySelector("#exrouteId");

  let  routeList = [] ;
  const NAD83 = new SpatialReference({ wkid: 26912 });

  // Layers
  let bufferLayer = new GraphicsLayer();
  let selectionLayer = new GraphicsLayer();

  const selectSymbol = new SimpleMarkerSymbol({
    color: "cyan",
    outline: {
      color: [128, 128, 128, 0.5],
      width: "0.5px",
    },
  });

  const fillSymbol = new SimpleFillSymbol({
    color: [33, 150, 243, 0.5],
    outline: {
      color: [128, 128, 128, 0.5],
      width: "2px",
    },
  });

  const routesLayer = new FeatureLayer({
    url: "https://maps.udot.utah.gov/randh/rest/services/PrimaryRoutes/MapServer/0",
    definitionExpression: "ROUTE_TYPE =  'M' AND ROUTE_ID < '1000PM'",
  });

  const stationLabel = new LabelClass({
    labelExpressionInfo: { expression: "$feature.LEGEND" },
    symbol: {
      type: "text", // autocasts as new TextSymbol()
      color: "black",
      haloSize: 1,
      haloColor: "white",
      font: {
        // autocast as new Font()
        family: "Ubuntu Mono",
        size: 9,
        weight: "bold",
      },
    },
    labelPlacement: "center-center",
  });

  const refSymbol = {
    type: "picture-marker",  // autocasts as new PictureMarkerSymbol()
    url: "https://maps.udot.utah.gov/uplan_data/documents/UPlanIcons/RPblankmed_edit.png",
    width: "40px",
    height: "40px",
  };

  const stationLayer = new FeatureLayer({
    url: "https://maps.udot.utah.gov/randh/rest/services/Test/MM_Stationing_Test/MapServer/0",
    labelingInfo: stationLabel,
    renderer: {
          type: 'simple',
          symbol: refSymbol
        }
  });

  const map = new Map({
    layers: [routesLayer, stationLayer, bufferLayer, selectionLayer],
    basemap: "gray", // Basemap  layer service
  });

  const view = new MapView({
    map: map,
    center: [-111.891, 40.7608], // Longitude, latitude
    zoom: 13, // Zoom level
    container: "viewDiv", // Div element
  });

  const basemapGallery = new BasemapGallery({
    view: view,
  });

  const externalExpand = new Expand({
    expandIconClass: "esri-icon-hollow-eye",
    view: view,
    expanded: false,
    content: externalLinks,
    group: "top-left",
  });

  const stationExpand = new Expand({
    expandIconClass: "esri-icon-applications",
    view: view,
    expanded: true,
    content: stationingForm,
    group: "top-left",
  });
  const basemapExpand = new Expand({
    expandIconClass: "esri-icon-basemap",
    view: view,
    content: basemapGallery,
  });

  view.ui.add([stationExpand, externalExpand], "top-left");
  view.ui.add(basemapExpand, "top-right");

  routesLayer.when(() => {
    /**query the StationLayer to get a feature set */
    routesLayer.queryFeatures().then((res) => makeRouteList(res.features));
  });

  function makeRouteList(features) {
    /**takes in feature set and interates through to get the largest Station for each */
    features.forEach((feature) => {
      let routeId = feature.attributes.ROUTE_ID;
      if (!routeList.includes(routeId)) {
          routeList.push(routeId)
      } 
    });
    populateRoutes(routeList.sort());
  }

  function populateRoutes(routes) {
    /**takes in maxStation Object and creats an option foreach route entry */
    
    routes.forEach((route) => {
      const opt = document.createElement("option");
      opt.value = route;
      opt.innerHTML = route;
      rInput.appendChild(opt);
    });
  }

  let stationLayerView;
  view.whenLayerView(stationLayer).then(function (layer) {
    stationLayerView = layer;
  });

  function highlightFilter(route = "", station = "") {
    if (!route || !station) {
      stationLayerView.effect = {
        filter: {
          where: "1=1",
        },
        includeEffect: "opacity(100%)",
      };
    } else {
      station = splitstation(station);

      // set effect on excluded features
      // make them gray and transparent
      stationLayerView.effect = {
        filter: {
          where: `STATION_LABEL = '${route}_${station}'`,
        },
        excludedEffect: "grayscale(60%) opacity(50%)",
      };
    }
  }

  async function convertSR(x, y) {
    let geometry = new Point({ y: y, x: x });

    await projection.load();
    const projectedGeom = projection.project(geometry, NAD83);
    return projectedGeom;
  }

  view.on("click", viewClick);

  function viewClick(event) {
    let mapPoint = new Point({
      x: event.mapPoint.longitude,
      y: event.mapPoint.latitude,
    });
    
    getRouteInfo(mapPoint);
  }

  async function getRouteInfo(mapPoint) {
    selectionLayer.removeAll();
    function getDistance(nearestPoint, mapPoint) {
      const pointsLine = new Polyline({
        paths: [
          [nearestPoint.coordinate.x, nearestPoint.coordinate.y],
          [mapPoint.x, mapPoint.y],
        ],
      });
      offset.value = geometryEngine.geodesicLength(pointsLine, "feet");
    }

    const buffer = geometryEngine.geodesicBuffer(mapPoint, 200, "feet");
    bufferLayer.removeAll();

    bufferLayer.add(new Graphic({ geometry: buffer, symbol: fillSymbol }));
    let query = {
      geometry: buffer,
      spatialRelationship: "intersects",
      returnGeometry: true,
      outFields: ["*"],
    };

    const results = await routesLayer.queryFeatures(query);
    addPoint(mapPoint.x, mapPoint.y);
    updateExternal(false, false, mapPoint.y, mapPoint.x);

    if (results.features.length > 0) {
      let intersect = geometryEngine.intersect(
        results.features[0].geometry,
        buffer
      );
      let rId = results.features[0].attributes.ROUTE_ID;
      let nearestPoint = geometryEngine.nearestCoordinate(intersect, mapPoint);

      addPoint(nearestPoint.coordinate.x, nearestPoint.coordinate.y);

      const projectedPoint = await convertSR(
        nearestPoint.coordinate.x,
        nearestPoint.coordinate.y
      );

      getDistance(nearestPoint, mapPoint);
  
      let options = {
        query: {
          locations: `[{"routeid" : "${rId}", "geometry" : { "x" : ${projectedPoint.x}, "y" : ${projectedPoint.y}}}]`,
          inSR: 26912,
          outSR: 4326,
          f: "json",
        },
        responseType: "json",
      };

      makeRequest(options, "geometryToStation");
    } else {
      highlightFilter();
      updateForm(false, 0, "0+00");
      offset.value = 0;
    }
  }

  openRoadview.addEventListener("click", function () {
    const url = `https://roadview.udot.utah.gov/utah/rvxsearch.php?Route=${exrouteId.value.substring(
      0,
      5
    )}&Mile=${exMeasure.value}`;
    window.open(url, "_blank");
  });
  openGoogleStreet.addEventListener("click", function () {
    const url = `https://maps.google.com/maps?q=&layer=c&ll=${exLat.value},${exLon.value}&cbll=${exLat.value},${exLon.value}&cbp=11,0,0,0,0`;
    window.open(url, "_blank");
  });

  getLocation.addEventListener("click", function(){
    navigator.geolocation.getCurrentPosition(success, error);
    function error() {
      alert("Unable to retrieve your location");
    }
    function success(position) {
      let mapPoint = new Point({
        x: position.coords.longitude,
        y: position.coords.latitude
      });
      getRouteInfo(mapPoint);
    };
  })

  getStation.addEventListener("click", function () {
    /**listener for the 'Coordinates" portion of the Coordinates
     * fetches values from form and adds them to the options for the REST API Call
     */
    bufferLayer.removeAll();
    selectionLayer.removeAll();
    offset.value = 0;
    const routeID = rInput.value;
    const measure = mpInput.value;

    let options = {
      query: {
        locations: `[{"routeId": ${routeID},"measure": ${measure}}]`,
        outSR: 26912,
        f: "json",
      },
      responseType: "json",
    };
    makeRequest(options, "measureToGeometry");
  });
  ("");

  getMP.addEventListener("click", function () {
    /**listener for the 'Stationing" portion of the Coordinates
     * fetches values from form and adds them to the options for the REST API Call
     */
    bufferLayer.removeAll();
    selectionLayer.removeAll();
    offset.value = 0;
    const station = sInput.value;
    const routeID = rInput.value;

    let options = {
      query: {
        locations: `[{ "routeId" : ${routeID}, "station" : ${station} }]`,
        outSR: 4326,
        f: "json",
      },
      responseType: "json",
    };

    highlightFilter(routeID, station);
    makeRequest(options, "stationToGeometry");
  });
  function splitstation(station) {
    return station.split("+")[0];
  }

  const urls = {
    measureToGeometry:
      "https://maps.udot.utah.gov/randh/rest/services/ALRS_RP_Stationing/MapServer/exts/LRSServer/networkLayers/1/measureToGeometry",
    stationToGeometry:
      "https://maps.udot.utah.gov/randh/rest/services/ALRS_RP_Stationing/MapServer/exts/LRSServer/eventLayers/0/stationToGeometry",
    geometryToStation:
      //"https://maps.udot.utah.gov/randh/rest/services/ALRS_RP_Stationing/MapServer/exts/LRSServer/eventLayers/0/geometryToStation",
      "https://maps.udot.utah.gov/randh/rest/services/Public/Points2RefPost/GPServer/Points2RefPost/execute",
    concurrencies:
      "https://maps.udot.utah.gov/randh/rest/services/ALRS_RP_Stationing/MapServer/exts/LRSServer/networkLayers/1/concurrencies",
      geometryToMeasure:
      "https://maps.udot.utah.gov/randh/rest/services/ALRS/MapServer/exts/LRSServer/networkLayers/0/geometryToMeasure"
  };
  async function makeRequest(options, type) {
    /**Takes in REST Call options and which type,
     * based on which button was clicked i the form */
    const response = await esriRequest(urls[type], options);
    if (type = "geometryToStation" || response["data"]["locations"][0].status == "esriLocatingOK") {
      setResults(response, type);
    } else if(type != "geometryToMeasure") {
      let locations = JSON.parse(options.query.locations)[0]
      let newOptions = {
        query: {
          locations: `[{"routeId" : ${locations.routeId}, "geometry" : { "x" : ${locations.geometry.x}, "y" : ${locations.geometry.y} }}]`,
          inSR: 26912,
          outSR: 4326,
          f: "json",
        },
        responseType: "json",
      };
      makeRequest(newOptions, "geometryToMeasure")
    } else{
      console.log(response["data"]["locations"][0].status, type);
    }
  }

  function setResults(response, type) {
    /**takes results of rest call
     * gets the x/y and route/station depending on call type
     * sets to form
     * calls zoomTo, to center the map.
     */

    let x, y, station, routeId, measure;
    if (type == "stationToGeometry") {
      routeId = response["data"]["locations"][0].routeId;
      measure = response["data"]["locations"][0]["geometries"][0].m;
      x = response["data"]["locations"][0]["geometries"][0].x;
      y = response["data"]["locations"][0]["geometries"][0].y;
      addPoint(x, y);
      updateForm(routeId, measure, false);
    } else if (type == "geometryToMeasure"){
      
      x = response["data"]["locations"][0]["results"][0]["geometry"].x;
      y = response["data"]["locations"][0]["results"][0]["geometry"].y;
      measure = response["data"]["locations"][0]["results"][0].measure;
      routeId = response["data"]["locations"][0]["results"][0].routeId;
      updateForm(routeId, measure, "0+00");
     
    }else if (type == "measureToGeometry") {
      x = response["data"]["locations"][0]["geometry"].x;
      y = response["data"]["locations"][0]["geometry"].y;
      measure = response["data"]["locations"][0]["geometry"].m;
      routeId = response["data"]["locations"][0].routeId;
      updateForm(routeId, measure, false);
      
      let options = {
        query: {
          locations: `[{"routeId" : ${routeId}, "geometry" : { "x" : ${x}, "y" : ${y}}}]`,
          inSR: 26912,
          outSR: 4326,
          f: "json",
        },
        responseType: "json",
      };
      makeRequest(options, "geometryToStation");
    } else {
      console.log(response);
      station = response["data"]["results"][0]["value"]["results"][0].stationid;
      routeId = response["data"]["results"][0]["value"]["results"][0].routeid;
      measure = response["data"]["results"][0]["value"]["results"][0].measure;
      console.log(routeId, measure, station);
      y = exLat.value;
      x = exLon.value;
      addPoint(x, y);
      updateForm(routeId, measure, station);
      
      highlightFilter(routeId, station);
    }
    zoomTo(x, y);
    updateExternal(routeId, measure, y, x);
  }

  function addPoint(x, y) { 
    let res = new Point({
      y: y,
      x: x,
    });

    selectionLayer.add(new Graphic({ geometry: res, symbol: selectSymbol }));
  }

  function updateExternal(routeId, measure, lat, lon) {
    if (routeId) {
      exrouteId.value = routeId;
    }

    if (measure) {
      exMeasure.value = Number(measure).toFixed(7);
    }
    if (lat) {
      exLat.value = lat;
    }
    if (lon) {
      exLon.value = lon;
    }
  }

  function updateForm(routeId, measure, station) {
    if (routeId) {
      rInput.value = routeId;
    }
    if (measure || measure === 0) {
      mpInput.value = Number(measure.toFixed(7));
    }
    if (station) {
      sInput.value = station;
    }
  }

  view.when(() => {
    function error() {
      alert("Unable to retrieve your location");
    }
    function success(position) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      zoomTo(longitude, latitude);
    }
    navigator.geolocation.getCurrentPosition(success, error);
  });

  function zoomTo(x, y) {
    view
      .goTo({
        center: [x, y],
      })
      .catch(function (error) {
        if (error.name != "AbortError") {
          console.error(error);
        }
      });
    view.zoom = 18;
  }
});
