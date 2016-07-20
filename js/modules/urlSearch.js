// test search = http://127.0.0.1:8080/?address=900%20Van%20Ness%20Avenue&city=San%20Francisco&state=CA&zip=94109
// test searchLive = https://sf-crime-data-61764.firebaseapp.com/?address=900%20Van%20Ness%20Avenue&city=San%20Francisco&state=CA&zip=94109

var urlSearch = (function(){

  function _runURLsearch(){
    var uri = new URI();
    uri = uri.query(true);

    var search = uri.address + ", " + uri.city + ", " + uri.state + ", " + uri.zip

    //Assign the returned autocomplete values to a variable
    var addressCall = resourcesModule.getJustAddress(search);

    addressCall.done(function(data){

      //Use the map module to change the user pin's location
      mapModule.plotUserLocation(data.features[0]);
      mapModule.centerMapOnLocation(data.features[0]);

      //assign the selected value to the address field
      $('#inputAddress').val(search);

      //Start the API call
      var userLocation = mapModule.getUserLocation();
      var query = "?$where=date >= '" + controlsModule.getStartDate() + "' AND date <= '" + controlsModule.getEndDate() + "' AND within_circle(location," + userLocation["geometry"]["coordinates"][1] + "," + userLocation["geometry"]["coordinates"][0] + "," + mapModule.getUserSearchRadius() + ")&$order=date DESC";

      mapModule.showLoader();

      resourcesModule.getIncidentsFromAPI(query, function(data) {
          //data - is a FeatureCollection with an array "features"
          mapModule.drawApiResponse(data);
          controlsModule.refreshDownloadButtonURLs(query);
          controlsModule.loadDataToTable(query);
      });
    })
  }

  function _urlPushSearch(locationResult) {
    var newSearch = null;
    var uri = new URI();
    var searchInput = {
      address: locationResult.properties.name,
      city: locationResult.properties.locality,
      state: locationResult.properties.region_a,
      zip: locationResult.properties.postalcode
    }
    uri.setSearch(searchInput)
    newSearch = uri.build();

    history.pushState(null, '', newSearch)
  }

  return {
    runURLsearch: _runURLsearch,
    urlPushSearch: _urlPushSearch
  }
})()
