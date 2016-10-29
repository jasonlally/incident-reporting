var controlsModule = (function(window, $) {

    /*Global variables within the module scope*/
    var _controlBarContainer;
    var _controlBarLowerContainer;
    var _table;
    var _options = {
        "startDate": null,
        "endDate": null
    };

    /**
     * @param {object} domContainer
     */
    function _init(domContainer, domContainer2) {

        //Initialize the module here
        if (!!domContainer) {
            //Yeah - it does exist
            _controlBarContainer = domContainer;

            _setDataUpdated();
            _setDraggingMouse();

            //Wire events
            $('.typeahead').typeahead({
      				source: function (query, process) {
      					addresses = [];
      					resourcesModule.getAutoSuggestionsFromService(query, function(data){
      						$.each(data, function (i, address) {
      							addresses.push(address.text);
      						});
      						process(addresses);
      					});
      				},
      				updater: function(item) {
      					clickedIndex = $('.typeahead').find('.active').index();
      					controlsModule.setSuggestionsListContent(clickedIndex);
      					return item;
      				},
      				minLength: 4, items: 10
      			})

            _controlBarContainer.find('#range-slider').noUiSlider({
                start: [urlSearch.getRadius("ft")],
                step: 1,
                connect: 'lower',
                range: {
                    'min': [0],
                    'max': [5280]
                }
            });

            _controlBarContainer.find('#range-slider').on({
                "slide": function() {
                    mapModule.setUserSearchRadius($(this).val() * .3048);
                },
                "change": function() {
                    var userLocation = mapModule.getUserLocation();
                    urlSearch.urlPushSearch(userLocation, null, mapModule.getUserSearchRadius()) // push search results into url
                    var query = "?$where=date >= '" + _options["startDate"] + "' AND date <= '" + _options["endDate"] + "' AND within_circle(location," + userLocation["geometry"]["coordinates"][1] + "," + userLocation["geometry"]["coordinates"][0] + "," + mapModule.getUserSearchRadius() + ")&$order=date DESC";

                    mapModule.showLoader();

                    resourcesModule.getIncidentsFromAPI(query, function(data) {
                        //data - is a FeatureCollection with an array "features"
                        mapModule.drawApiResponse(data);
                        _refreshDownloadButtonURLs(query);
                        _loadDataToTable(query);
                    });
                },
                "set": function() {
                    mapModule.setUserSearchRadius($(this).val() * .3048);
                    var userLocation = mapModule.getUserLocation();
                    urlSearch.urlPushSearch(userLocation, null, mapModule.getUserSearchRadius()) // push search results into url
                    var query = "?$where=date >= '" + _options["startDate"] + "' AND date <= '" + _options["endDate"] + "' AND within_circle(location," + userLocation["geometry"]["coordinates"][1] + "," + userLocation["geometry"]["coordinates"][0] + "," + mapModule.getUserSearchRadius() + ")&$order=date DESC";

                    mapModule.showLoader();

                    resourcesModule.getIncidentsFromAPI(query, function(data) {
                        //data - is a FeatureCollection with an array "features"
                        mapModule.drawApiResponse(data);
                        _refreshDownloadButtonURLs(query);
                        _loadDataToTable(query);
                    });
                }
            });

            _controlBarContainer.find("#range-slider").Link('lower').to($('#range-slider-input'), null, wNumb({
                decimals: 0
            }));

            _options["startDate"] = moment().subtract(29, 'days').format('YYYY-MM-DD');
            _options["endDate"] = moment().format('YYYY-MM-DD');

            _controlBarContainer.find('#daterange').val(urlSearch.getStartDate().format('MM/DD/YYYY') + ' - ' + urlSearch.getEndDate().format('MM/DD/YYYY'));

            _controlBarContainer.find('#daterange').daterangepicker({
                    ranges: {
                        'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                        'This Month': [moment().startOf('month'), moment().endOf('month')],
                        'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
                        'This Quarter': [moment().startOf('quarter'), moment().endOf('quarter')],
                        'Last Quarter': [moment().subtract(3, 'months').startOf('quarter'), moment().subtract(3, 'months').endOf('quarter')],
                        'This Year': [moment().startOf('year'), moment()],
                        'Last Year': [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')]
                    },
                    startDate: urlSearch.getStartDate() || moment().subtract(29, 'days'), // OR isn't needed here, but would then totally depend on urlSearch module
                    endDate: urlSearch.getEndDate() || moment(), // OR isn't needed here, but would then totally depend on urlSearch module
                    format: 'MM/DD/YYYY'
                },
                function(start, end) {
                    _options["startDate"] = start.format('YYYY-MM-DD');
                    _options["endDate"] = end.format('YYYY-MM-DD');
                    _controlBarContainer.find('#daterange').val(start.format('MM/DD/YYYY') + ' - ' + end.format('MM/DD/YYYY'));

                    //Start the API call
                    var userLocation = mapModule.getUserLocation();

                    urlSearch.urlPushSearch(userLocation, _options, null) // push search results into url

                    var query = "?$where=date >= '" + _options["startDate"] + "' AND date <= '" + _options["endDate"] + "' AND within_circle(location," + userLocation["geometry"]["coordinates"][1] + "," + userLocation["geometry"]["coordinates"][0] + "," + mapModule.getUserSearchRadius() + ")&$order=date DESC";

                    mapModule.showLoader();

                    resourcesModule.getIncidentsFromAPI(query, function(data) {
                        //data - is a FeatureCollection with an array "features"
                        mapModule.drawApiResponse(data);
                        _refreshDownloadButtonURLs(query);
                        _loadDataToTable(query);
                    });
                });

        } else {
            //Error
            console.log("Upper controls container doesn't exist");
        }

        if (!!domContainer2) {
            _controlBarLowerContainer = domContainer2;

            _table = _controlBarLowerContainer.find('#example').DataTable({
                "ajax": {
                    "url": "empty.json",
                    "dataSrc": ""
                },
                "dom": '<"table-buttons"<"table-buttons"Bl>f>t<"table-buttons"ip>',
                "buttons":['colvis'],
                "fixedHeader": {
                    header: true,
                    footer: true
                },
                "columns": [{
                  "data": "incidntnum",
                  "title": "Incident #",
                  "name": "incidntnum",
                }, {
                  "data": "date",
                  "title": "Date",
                  "name": "date",
                  "render": function(data, type, row, meta) {
                    return moment(data).format('l')
                  },
                  "visible": false
                }, {
                  "data": "time",
                  "title": "Time",
                  "name": "time",
                  "visible": false
                }, {
                  "data": "address",
                  "title": "Address",
                  "name": "address",
                  "visible": false
                }, {
                  "data": "pddistrict",
                  "title": "District",
                  "name": "pddistrict",
                  "visible": false
                }, {
                  "data": "category",
                  "title": "Category",
                  "name": "category",
                }, {
                  "data": "descript",
                  "title": "Description",
                  "name": "descript",
                }, {
                  "data": "resolution",
                  "title": "Resolution",
                  "name": "resolution",
                }],
                "pageLength": 50,
                "footerCallback": function(tfoot, data, start, end, display) {
                  var dupHeaderRow = $(this.api().table().header()).children('tr:first').clone()
                  // $(tfoot).html(dupHeaderRow.html());
                }
            });
        } else {
            console.log("Lower controls container doesn't exist");
        }
    }

    function _setDraggingMouse() {
        var isDragging = false;
        var isCursorOverPin = false;
        var mapComponent = mapModule.getComponents()["map"]; //map
        var pinFeatureLayer = mapModule.getComponents()["layers"]["user"]; //FeatureLayer(pin)
        pinFeatureLayer.on("mouseover", function(e) { isCursorOverPin = true; });
        pinFeatureLayer.on("mouseout", function(e) { isCursorOverPin = false; });

        var diffLatlng = L.latLng(0.0, 0.0);
        mapComponent.on("mousedown", function(e) {
            if (isCursorOverPin) {
                userLatlng = pinFeatureLayer.getGeoJSON().geometry.coordinates;
                diffLatlng.lat = userLatlng[1] - e.latlng.lat;
                diffLatlng.lng = userLatlng[0] - e.latlng.lng;
                isDragging = true;
                mapComponent.dragging.disable();
            }
        });
        mapComponent.on("mouseup", function(e) {
            isDragging = false;
            mapComponent.dragging.enable();
            console.log(pinFeatureLayer.getGeoJSON().geometry.coordinates);
            //Search, again!!
        });

        mapComponent.on("mousemove", function(e) {
            if (!isDragging) return;
            current_geojson = pinFeatureLayer.getGeoJSON();
            current_geojson.geometry.coordinates[0] = e.latlng.lng + diffLatlng.lng;
            current_geojson.geometry.coordinates[1] = e.latlng.lat + diffLatlng.lat;
            pinFeatureLayer.setGeoJSON(current_geojson);
        });
    }

    /**
     * @param {string} query
     */
    function _refreshDownloadButtonURLs(query) {
        _controlBarLowerContainer.find("#download-csv").attr("href", resourcesModule.getCsvLink(query));
        _controlBarLowerContainer.find("#open-geojsonio").attr("href", resourcesModule.getGeojsonio(query));
        _controlBarLowerContainer.find("#open-cartodb").attr("href", resourcesModule.getCartoDbUrl(query));
        _controlBarLowerContainer.find("#email-share").attr("href", resourcesModule.setEmailLink());
    }

    /**
     * @param {string} query
     */
    function _loadDataToTable(query) {
        var datasetURL = resourcesModule.getDatasetJsonURL(query);
        _table.ajax.url(datasetURL).load(function(data){
          // console.log("data", data);
        });
    }

    /**
     * @param {number} clickedIndex
     */
    function _setSuggestionsListContent(clickedIndex) {

        //Assign the returned autocomplete values to a variable
        var acFeatures = resourcesModule.getLatestAutocompleteFeatures();

        //Use the map module to change the user pin's location
        mapModule.plotUserLocation(acFeatures[clickedIndex]);
        mapModule.centerMapOnLocation(acFeatures[clickedIndex]);

        //Hide the suggestions list
        $(this).parent().hide();

        //Start the API call
        var userLocation = mapModule.getUserLocation();

        urlSearch.urlPushSearch(userLocation, _options, mapModule.getUserSearchRadius()) // push search results into url

        var query = "?$where=date >= '" + _options["startDate"] + "' AND date <= '" + _options["endDate"] + "' AND within_circle(location," + userLocation["geometry"]["coordinates"][1] + "," + userLocation["geometry"]["coordinates"][0] + "," + mapModule.getUserSearchRadius() + ")&$order=date DESC";

        mapModule.showLoader();

        resourcesModule.getIncidentsFromAPI(query, function(data) {
            //data - is a FeatureCollection with an array "features"
            mapModule.drawApiResponse(data);
            _refreshDownloadButtonURLs(query);
            _loadDataToTable(query);
        });
    }

    function _setDataUpdated() {
        var query = "?$select=date,time&$limit=1&$order=date DESC,time DESC";
        var datasetRequest = resourcesModule.getDatasetJsonURL(query);
        $.getJSON(datasetRequest, function(data) {
            console.log(data)
            $('#data-updated').html('<b>Data available through ' + moment(data[0].date).format('MMMM DD, YYYY') + ' at ' + moment(data[0].time, 'HH:mm').format('hh:mm a') + '</b>')
        });
    }

    function _getStartDate() {
        return _options["startDate"];
    }

    function _getEndDate() {
        return _options["endDate"];
    }

    return {
        init: _init,
        setSuggestionsListContent: _setSuggestionsListContent,
        getEndDate: _getEndDate,
        getStartDate: _getStartDate,
        refreshDownloadButtonURLs: _refreshDownloadButtonURLs,
        loadDataToTable: _loadDataToTable
    };

})(window, jQuery);
