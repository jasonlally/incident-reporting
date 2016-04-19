var controlsModule = (function(window,$){
    
	//Global variables within the module scope
    var _controlBarContainer;
    var _options = {
	    "startDate": null,
		"endDate": null
	};
	
    /**
      * @param {object} domContainer
    */		
	function _init(domContainer){
	
	    //Initialize the module here
		if(!!domContainer){
		    //Yeah - it does exist
           _controlBarContainer = domContainer;

            //Wire events
            _controlBarContainer.find('.typeahead').on('keypress', function(e) {
		        if ($(e.target).val().length > 3) {
		            resourcesModule.getAutoSuggestionsFromService($(e.target).val(), function(data){
                        var suggestions = controlsModule.populateSuggestionsList(data);
				        controlsModule.setSuggestionsListContent(suggestions);
	                });
		        }	
            });

            _controlBarContainer.find('#range-slider').noUiSlider({
                start: [1320],
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
			    "change": function(){
				    var userLocation = mapModule.getUserLocation();		
			        var query = "?$where=date >= '" + _options["startDate"] + "' AND date <= '" + _options["endDate"] + "' AND within_circle(location," + userLocation["geometry"]["coordinates"][1] + "," + userLocation["geometry"]["coordinates"][0] + "," + mapModule.getUserSearchRadius() + ")&$order=date DESC";
			        
					mapModule.showLoader();
					
					resourcesModule.getIncidentsFromAPI(query, function(data){
			            //data - is a FeatureCollection with an array "features"
				        mapModule.drawApiResponse(data);
			        });
				},
			    "set": function(){
				    mapModule.setUserSearchRadius($(this).val() * .3048);
				    var userLocation = mapModule.getUserLocation();		
			        var query = "?$where=date >= '" + _options["startDate"] + "' AND date <= '" + _options["endDate"] + "' AND within_circle(location," + userLocation["geometry"]["coordinates"][1] + "," + userLocation["geometry"]["coordinates"][0] + "," + mapModule.getUserSearchRadius() + ")&$order=date DESC";
			        
					mapModule.showLoader();
					
					resourcesModule.getIncidentsFromAPI(query, function(data){
			            //data - is a FeatureCollection with an array "features"
				        mapModule.drawApiResponse(data);
			        });
					
/*
      var datasetUrlJson = datasetAPI + ".json" + query;
      var datasetUrlCsv = datasetAPI + ".csv" + query;
      table.ajax.url(datasetUrlJson).load();
      
      //var file = "https://data.sfgov.org/api/views/cuks-n6tp/rows.csv?accessType=DOWNLOAD";
      $('#open-cartodb').attr("href","//oneclick.cartodb.com/?file=" + encodeURIComponent(encodeURI(datasetUrlGeo)) + "&provider=DataSF"); //and logo=
      $('#download-csv').attr("href",datasetUrlCsv);
      $("#open-geojsonio").attr("href","http://geojson.io/#data=data:text/x-url,"+encodeURIComponent(datasetUrlGeo));
*/

					
				}					
            });
			
            _controlBarContainer.find("#range-slider").Link('lower').to($('#range-slider-input'), null, wNumb({
                decimals: 0
            }));
			
            _options["startDate"] = moment().subtract(29, 'days').format('YYYY-MM-DD');
            _options["endDate"] = moment().format('YYYY-MM-DD');
  
            _controlBarContainer.find('#daterange').val(moment().subtract(29, 'days').format('MM/DD/YYYY') + ' - ' + moment().format('MM/DD/YYYY'));
			
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
				startDate: moment().subtract(29, 'days'),
				endDate: moment(),
				format: 'MM/DD/YYYY'
			},
			function(start, end) {
				_options["startDate"] = start.format('YYYY-MM-DD');
				_options["endDate"] = end.format('YYYY-MM-DD');
				_controlBarContainer.find('#daterange').val(start.format('MM/DD/YYYY') + ' - ' + end.format('MM/DD/YYYY'));
				
				//Start the API call
				var userLocation = mapModule.getUserLocation();		
				var query = "?$where=date >= '" + _options["startDate"] + "' AND date <= '" + _options["endDate"] + "' AND within_circle(location," + userLocation["geometry"]["coordinates"][1] + "," + userLocation["geometry"]["coordinates"][0] + "," + mapModule.getUserSearchRadius() + ")&$order=date DESC";
				
				mapModule.showLoader();
				
				resourcesModule.getIncidentsFromAPI(query, function(data){
					//data - is a FeatureCollection with an array "features"
					mapModule.drawApiResponse(data);
				});
				
			});			
			
		}
		else
		{
		    //Error
		    alert("Sidebar container doesn't exist");
		}		
	}
	
	
	
    /**
      * @param {array} sgstnData
    */	
    function _populateSuggestionsList(sgstnData){
	    var $sgstnList = $("<ul>");
	    $.each(sgstnData, function(key, val){
			var $result = $('<li>').attr('data-index', val.idx).html(val.text);
			$sgstnList.append($result);
		});
        return $sgstnList;		
	}

    /**
      * @param {object} sgstnList
    */		
	function _setSuggestionsListContent(sgstnList){	   
		_controlBarContainer.find("#suggestresults").empty().show().html(sgstnList.html());
		_controlBarContainer.find("#suggestresults li").on('click', function(e) {
            
			//Assign the returned autocomplete values to a variable
			var acFeatures = resourcesModule.getLatestAutocompleteFeatures();
			
			//Use the map module to change the user pin's location
			mapModule.plotUserLocation(acFeatures[$(e.target).attr('data-index')]);
            mapModule.centerMapOnLocation(acFeatures[$(e.target).attr('data-index')]);
            
			//assign the selected value to the address field
			$('#inputAddress').val($(e.target).html());
            
			//Hide the suggestions list
			$(this).parent().hide();
			
			//Start the API call
            var userLocation = mapModule.getUserLocation();		
			var query = "?$where=date >= '" + _options["startDate"] + "' AND date <= '" + _options["endDate"] + "' AND within_circle(location," + userLocation["geometry"]["coordinates"][1] + "," + userLocation["geometry"]["coordinates"][0] + "," + mapModule.getUserSearchRadius() + ")&$order=date DESC";
			
			mapModule.showLoader();
			
			resourcesModule.getIncidentsFromAPI(query, function(data){
			    //data - is a FeatureCollection with an array "features"
				mapModule.drawApiResponse(data);
			});
        });		
	}
	
	function _getStartDate(){
	    return _options["startDate"];
	}
	
	function _getEndDate(){
	    return _options["endDate"];
	}	
	
    return {
	    init: _init,
		populateSuggestionsList: _populateSuggestionsList,
		setSuggestionsListContent: _setSuggestionsListContent,
		getEndDate: _getEndDate,
		getStartDate: _getStartDate
    };
  
})(window, jQuery);