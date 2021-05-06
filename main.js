/**todo
 * pop-up
 * Zoom level
 *
 * handle errors in rest calls
 * add point on get REf Post/Linear Measure

 *
 * questions?
 * buffer size?
 *re-use of routeId/routeID is causing bugs
 * vertex highlight? -> nearestpoint?
 *
 * refactor to factory functions probably
 *
 */

require([
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

  const exMeasure = document.querySelector("#exMeasure");
  const exLat = document.querySelector("#exLat");
  const exLon = document.querySelector("#exLon");
  const openRoadview = document.querySelector("#openRoadview");
  const openGoogleStreet = document.querySelector("#openGoogleStreet");
  const exrouteId = document.querySelector("#exrouteId");

  let maxRouteStation = {};
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
    url:
      "https://maps.udot.utah.gov/randh/rest/services/PrimaryRoutes/MapServer/0",
    definitionExpression: "ROUTE_TYPE =  'M'",
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

  const stationLayer = new FeatureLayer({
    url:
      "https://maps.udot.utah.gov/randh/rest/services/Test/MM_Stationing_Test/MapServer/0",
    labelingInfo: stationLabel,
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

  stationLayer.when(() => {
    /**query the StationLayer to get a feature set */
    stationLayer.queryFeatures().then((res) => getMaxStation(res.features));
  });

  function getMaxStation(features) {
    /**takes in feature set and interates through to get the largest Station for each */
    features.forEach((feature) => {
      let routeId = feature.attributes.ROUTE_ID;
      let legend = parseInt(feature.attributes.LEGEND);
      if (maxRouteStation[routeId]) {
        if (legend > maxRouteStation[routeId]) {
          maxRouteStation[routeId] = legend;
        }
      } else {
        maxRouteStation[routeId] = legend;
      }
    });
    populateRoutes(maxRouteStation);
  }

  function populateRoutes(maxStation) {
    /**takes in maxStation Object and creats an option foreach route entry */
    for (let key in maxStation) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.innerHTML = key;
      rInput.appendChild(opt);
    }
  }

  let stationLayerView;
  view.whenLayerView(stationLayer).then(function (layer) {
    stationLayerView = layer;
  });

  function highlightFilter(route, station) {
    station = splitstation(station);
    let featureFilter = {
      where: `STATION_LABEL = '${route}_${station}'`,
    };

    // set effect on excluded features
    // make them gray and transparent

    stationLayerView.effect = {
      filter: featureFilter,
      excludedEffect: "grayscale(60%) opacity(50%)",
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
      y: event.mapPoint.latitude,
    });

    //
    const buffer = geometryEngine.geodesicBuffer(mapPoint, 200, "feet");
    bufferLayer.removeAll();
    selectionLayer.removeAll();

    bufferLayer.add(new Graphic({ geometry: buffer, symbol: fillSymbol }));
    let query = {
      geometry: buffer,
      spatialRelationship: "intersects",
      returnGeometry: true,
      outFields: ["*"],
    };
    routesLayer.queryFeatures(query).then(function (results) {
      if (results.features.length > 0) {
        let intersect = geometryEngine.intersect(
          results.features[0].geometry,
          buffer
        );
        let rId = results.features[0].attributes.ROUTE_ID;
        let nearestPoint = geometryEngine.nearestVertex(intersect, mapPoint);

        let res = new Point({
          y: nearestPoint.coordinate.y,
          x: nearestPoint.coordinate.x,
        });

        selectionLayer.add(
          new Graphic({ geometry: res, symbol: selectSymbol })
        );
        console.log();

        convertSR(res).then((projectedPoint) => {
          let options = {
            query: {
              locations: `[{"routeId" : "${rId}", "geometry" : { "x" : ${projectedPoint.x}, "y" : ${projectedPoint.y} }}]`,
              inSR: 26912,
              outSR: 4326,
              f: "json",
            },
            responseType: "json",
          };

          makeRequest(options, "geometryToStation");
        });
      }
    });
  });

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

  getStation.addEventListener("click", function () {
    /**listener for the 'Coordinates" portion of the Coordinates
     * fetches values from form and adds them to the options for the REST API Call
     */
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
      "https://maps.udot.utah.gov/randh/rest/services/ALRS_RP_Stationing/MapServer/exts/LRSServer/eventLayers/0/geometryToStation",
    concurrencies:
      "https://maps.udot.utah.gov/randh/rest/services/ALRS_RP_Stationing/MapServer/exts/LRSServer/networkLayers/1/concurrencies",
  };
  function makeRequest(options, type) {
    /**Takes in REST Call options and which type,
     * based on which button was clicked i the form */
    esriRequest(urls[type], options).then(function (response) {
      setResults(response, type);
    });
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
      updateExternal("stationToGeometry", routeId, measure, y, x);

      updateForm(routeId, measure, false);
    } else if (type == "measureToGeometry") {
      x = response["data"]["locations"][0]["geometry"].x;
      y = response["data"]["locations"][0]["geometry"].y;
      measure = response["data"]["locations"][0]["geometry"].m;
      routeId = response["data"]["locations"][0].routeId;
      updateForm(routeId, measure, false);
      updateExternal(routeId, measure, y, x);

     
        let options = {
          query: {
            locations: `[{"routeId" : ${routeId}, "geometry" : { "x" : ${x}, "y" : ${y} }}]`,
            inSR: 26912,
            outSR: 4326,
            f: "json",
          },
          responseType: "json",
        };
        makeRequest(options, "geometryToStation");
      
    } else {
      station = response["data"]["locations"][0]["results"][0].station;
      routeId = response["data"]["locations"][0]["results"][0].routeId;
      measure = response["data"]["locations"][0]["results"][0].geometry.m;
      x = response["data"]["locations"][0]["results"][0].geometry.x;
      y = response["data"]["locations"][0]["results"][0].geometry.y;

      updateForm(routeId, measure, station);
      updateExternal(routeId, measure, y, x);
      highlightFilter(routeId, station);
    }
    zoomTo(x, y);
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
    if (measure) {
      mpInput.value = Number(measure.toFixed(7));
    }
    if (station) {
      sInput.value = station;
    }
  }

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
  }
});
