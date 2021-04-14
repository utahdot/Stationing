require(["esri/request"], function(esriRequest) {
    const resultsDiv = document.getElementById("resultsDiv");
    const input = document.getElementById("inputUrl");

    // Define the 'options' for the request
    var geometryToStation = {
      query: {
        locations: `[{"routeId" : "", "geometry" : { "x" : ${latitude}, "y" : ${longitude} }}]`,
        inSR: 26912,
        outSR: 4326,
        f: "json"
      },
      responseType: "json"
    };

    // Make the request on a button click using the
    // value of the 'input' text
    btnQuery.addEventListener("click", function() {
      var url = input.value;
      esriRequest(url, geometryToStation).then(function(response) {
        console.log("response", response);
        var responseJSON = JSON.stringify(response, null, 2);
        resultsDiv.innerHTML = responseJSON;
      });
    });
  });