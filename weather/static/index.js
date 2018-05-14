// For testing purposes, you can use githubusercontent, but we recommend that you upload a copy somewhere else.
// Even locally using a simple webserver should be enough.
const countriesPath = "https://raw.githubusercontent.com/Renkon/azure-functions-on-docker/master/weather/static/countries.json"
const citiesPath = "https://raw.githubusercontent.com/Renkon/azure-functions-on-docker/master/weather/static/cities.json"
const backEndPath = "http://localhost:8080/api/weather";

const JSONUtils = {
	loadFile: (fileUrl, callbackMethod) => {
		RequestUtils.createGetRequest(fileUrl, callbackMethod, null, true, 'application/json');
	}
};

const RequestUtils = {
	createGetRequest: (url, callbackMethod, sendInfo, asynchronous, mimeType) => {
		const request = new XMLHttpRequest();
		request.overrideMimeType(mimeType);
		request.open('GET', url, asynchronous);
		request.onreadystatechange = () => {
			if (request.readyState == 4)
				callbackMethod(request.responseText);
		};
		request.send(sendInfo);
	}
};

let countryNames;
let cities;

let comboCountry;
let comboCity;

let mapElement;
let mapMarker;

let units = 'metric';
let currentCity;

let citiesByCountry = {};

function countriesSetter(response)
{
	countryNames = JSON.parse(response);
	
	onDownloadComplete('#loadCountriesDiv');
}

function citiesSetter(response)
{
	cities = JSON.parse(response);
	// Given the fact that cities file is way bigger,
	// I'll execute the callback from here.
	onFilesDownloaded();
	onDownloadComplete('#loadCitiesDiv');
	comboCountry.enable();
}

function onDownloadComplete(divId)
{
	$(divId).css('color', '#00aa00');
	$(divId).find('img').attr("src","img/loaded.png"); 
}

function onFilesDownloaded()
{
	function sortByCityName(cityA, cityB)
	{
		const cityAName = cityA.name.toLowerCase();
		const cityBName = cityB.name.toLowerCase();
		
		return cityAName.localeCompare(cityBName);
	}

	//	First, we create the keys for our citiesByCountry array
	Object.keys(countryNames).forEach((countryCode) => {
		citiesByCountry[countryCode] = [];
	});
	
	// Then, we populate the tables
	cities.forEach((city) => {
		if (city.country !== '')
			citiesByCountry[city.country].push(city);
	});
	
	// Finally, we sort each table alphabetically by city name
	Object.keys(citiesByCountry).forEach((countryCode) => {
		citiesByCountry[countryCode].sort(sortByCityName);
	});
}

function onSelectedInfoChanged(city, units)
{
	function getRequestUrl(city, units)
	{
		return backEndPath + '?cityId=' + city.id + '&units=' + units;
	}
	
	function onCallback(response)
	{
		console.log('r: ' + response);
	}
	
	if (city != null)
	{
		RequestUtils.createGetRequest(getRequestUrl(city, units), onCallback, null, true, 'application/json');
		
		if (mapElement.getZoom() !== 8)
			mapElement.setZoom(8);
		
		const newCenter = { lat: city.coord.lat, lng: city.coord.lon };
		markerElement.setPosition(newCenter);
		markerElement.setMap(mapElement);
		mapElement.setCenter(newCenter);
	}
	else
	{
		markerElement.setMap(null);
		if (mapElement.getZoom() !== 1)
			mapElement.setZoom(1);
		mapElement.setCenter({lat: 0, lng: 0});
	}
}

JSONUtils.loadFile(countriesPath, countriesSetter);
JSONUtils.loadFile(citiesPath, citiesSetter);

function onMapReady()
{
	mapElement = new google.maps.Map($('#map')[0], {
		zoom: 1,
		center: {lat: 0, lng: 0}
	});
	
	markerElement = new google.maps.Marker({
		position: {lat: 0, lng: 0},
		map: null
	});
}

/* On ready event */
$(document).ready(() => {
	// We initialize the comboboxes.
	comboCountry = new dhtmlXCombo('comboCountry', 'combo1', 350);
	comboCountry.setPlaceholder('Country name');
	Object.keys(countryNames).forEach((countryCode) => {
		let countryName = countryNames[countryCode];
		comboCountry.addOption(countryCode, countryName);
	});
	comboCountry.enableFilteringMode(true);
	comboCountry.disable();
	
	comboCity = new dhtmlXCombo('comboCity', 'combo2', 350);
	comboCity.setPlaceholder('City name');
	comboCity.enableFilteringMode(true);
	comboCity.disable();
	
	// We attach an event to our comboCountry.
	comboCountry.attachEvent('onChange', (selectedCountry) => {
		comboCity.clearAll();
		comboCity.setComboValue(null);
		comboCity.setComboText('');
		
		if (selectedCountry == null) 
		{
			comboCity.disable();
		}
		else 
		{
			comboCity.enable();
			citiesByCountry[selectedCountry].forEach((city) => {
				comboCity.addOption(city, city.name);
			});			
			comboCity.attachEvent('onChange', (selectedCity) => {
				currentCity = selectedCity;
				onSelectedInfoChanged(selectedCity, units);
			});
		}
	});
});

