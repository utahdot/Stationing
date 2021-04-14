require(["esri/request"], function(esriRequest) {
    "use strict"
    const resultsDiv = document.getElementById("resultsDiv");
    const latInput = document.getElementById("latitude");
    const lonInput = document.getElementById("longitude");


    // Make the request on a button click using the
    // value of the 'input' text
    getStation.addEventListener("click", function(btn) {
        const latitude = latInput.value;
        const longitude = lonInput.value;
        const url = btn.target.value;
        
        const options = {
            query: {
              locations: `[{"routeId" : "", "geometry" : { "x" : ${latitude}, "y" : ${longitude} }}]`,
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