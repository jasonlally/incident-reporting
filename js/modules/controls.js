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
                    _loadRadialIncidentData();
                },
                "set": function() {
                    mapModule.setUserSearchRadius($(this).val() * .3048);
                    var userLocation = mapModule.getUserLocation();
                    urlSearch.urlPushSearch(userLocation, null, mapModule.getUserSearchRadius()); // push search results into url
                    _loadRadialIncidentData();
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

                    _loadRadialIncidentData();
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
        var radius = mapModule.getUserSearchRadius();

        urlSearch.urlPushSearch(userLocation, _options, radius); // push search results into url
        _loadRadialIncidentData();
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

    function _loadRadialIncidentData() {
        var query = _buildRadialIncidentDataQuery();

        mapModule.showLoader();
        resourcesModule.getIncidentsFromAPI(query, function(data) {
            mapModule.drawApiResponse(data);
            _refreshDownloadButtonURLs(query);
            _loadDataToTable(query);
        });
    }

    function _buildRadialIncidentDataQuery() {
        var startDate = _options.startDate;
        var endDate = _options.endDate;
        var coordinates = mapModule.getUserLocation().geometry.coordinates;
        var longitude = coordinates[0];
        var latitude = coordinates[1];
        var radius = mapModule.getUserSearchRadius();

        return "?$where="
          + "date >= '" + startDate + "'"
          + " AND date <= '" + endDate + "'"
          + " AND within_circle(location," +  latitude + "," + longitude + "," + radius + ")"
          + "&$order=date DESC"
          + "&$limit=100000";
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

    return {
        init: _init,
        setSuggestionsListContent: _setSuggestionsListContent,
        getEndDate: _getEndDate,
        getStartDate: _getStartDate,
        refreshDownloadButtonURLs: _refreshDownloadButtonURLs,
        loadDataToTable: _loadDataToTable
    };

})(window, jQuery);
