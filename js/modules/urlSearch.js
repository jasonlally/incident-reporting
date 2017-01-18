var urlSearchModule = (function() {

    var LOAD_INCIDENT_DATA_OPTIONS = { pushState: false };

    function _initializeViewModelFromUrlParameters() {
        var params = new URI().query(true);

        $.extend(true, viewModelModule, params);

        viewModelModule.searchShapeType = _getSearchShapeType(params);
        viewModelModule.searchGeoJson = params.searchGeoJson
            ? JSON.parse(params.searchGeoJson) : null;

       if(params.searchAddress && !(params.latitude && params.longitude)) {
           addressService.getAddress(params.searchAddress, _afterGetAddress);
       } else {
           pageModule.loadIncidentData(LOAD_INCIDENT_DATA_OPTIONS);
       }
    }

    function _afterGetAddress(address) {
        var firstFeature = address ? address.features[0] : {};
        if(firstFeature.coordinates) {
            viewModelModule.latitude = firstFeature.coordinates[1];
            viewModelModule.longitude = firstFeature.coordinates[0];
        }

        if(firstFeature.properties) {
            viewModelModule.searchAddress = firstFeature.properties.label;
            $('#inputAddress').val(firstFeature.properties.label);
        }

        pageModule.loadIncidentData(LOAD_INCIDENT_DATA_OPTIONS);
    }

    function _getSearchShapeType(params) {
        if(params.searchAddress || (params.latitude && params.longitude)) {
            return 'radial';
        } else if(params.searchGeoJson) {
            return 'polygon';
        } else {
            return viewModelModule.defaults.searchShapeType;
        }
    }

    return {
        initializeViewModelFromUrlParameters: _initializeViewModelFromUrlParameters
    };
})();
