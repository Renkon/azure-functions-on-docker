// For testing purposes, you can use githubusercontent, but we recommend that you upload a copy somewhere else.
// Even locally using a simple webserver should be enough.
const countriesPath = "https://raw.githubusercontent.com/Renkon/azure-functions-on-docker/master/weather/static/countries.json"
const citiesPath = "https://raw.githubusercontent.com/Renkon/azure-functions-on-docker/master/weather/static/cities.json"

const JSONUtils = {
	loadFile: (filePath, callbackMethod) => {
		const request = new XMLHttpRequest();
		request.overrideMimeType("application/json");
		request.open('GET', filePath, true);
		request.onreadystatechange = () => {
			if (request.readyState == 4)
				callbackMethod(request.responseText);
		};
		request.send(null);
	}
};

let countryNames;
let cities;

let citiesByCountry = {};

function countriesSetter(response)
{
	countryNames = JSON.parse(response);
	
}

function citiesSetter(response)
{
	cities = JSON.parse(response);
	// Given the fact that cities file is way bigger,
	// I'll execute the callback from here.
	onFilesDownloaded();
}

function onFilesDownloaded()
{
	// First, we create the keys for our citiesByCountry array
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
	
	console.log(JSON.stringify(citiesByCountry['AR']));
}

function sortByCityName(cityA, cityB)
{
	const cityAName = cityA.name.toLowerCase();
	const cityBName = cityB.name.toLowerCase();
	
	return cityAName.localeCompare(cityBName);
}

JSONUtils.loadFile(countriesPath, countriesSetter);
JSONUtils.loadFile(citiesPath, citiesSetter);

