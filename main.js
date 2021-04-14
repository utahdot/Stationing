require(["esri/request"], function(esriRequest) {
    "use strict"
    const resultsDiv = document.getElementById("resultsDiv");
    const xInput = document.getElementById("X");
    const yInput = document.getElementById("Y");
    const sInput = document.getElementById("station")
    const rInput = document.getElementById("routeID")


    // Make the request on a button click using the
    // value of the 'input' text
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

    })

    function makeRequest(url, options){
        esriRequest(url, options).then(function(response) {
            console.log("response", response);
            let responseJSON = JSON.stringify(response, null, 2);
            resultsDiv.innerHTML = responseJSON;
          });
    }
  });