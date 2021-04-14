require(["esri/request"], function(esriRequest) {
    "use strict"
    const resultsDiv = document.getElementById("resultsDiv");
    const xInput = document.getElementById("X");
    const yInput = document.getElementById("Y");


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
      
      esriRequest(url, options).then(function(response) {
        console.log("response", response);
        let responseJSON = JSON.stringify(response, null, 2);
        resultsDiv.innerHTML = responseJSON;
      });
    });
  });