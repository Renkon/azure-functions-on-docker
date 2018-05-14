#r "Newtonsoft.Json"

using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;

private const string WEATHER_API_KEY = "[OPENWEATHERMAP_API_HERE]";
private static readonly string[] VALID_UNITS = { "metric", "imperial" };

public static async Task<IActionResult> Run(HttpRequest req, TraceWriter log)
{
    // Defs
    string cityId;
    string units;

    Dictionary<string, string> queryStringDictionary = new Dictionary<string, string>();

    // Init
    log.Info("C# HTTP trigger function processed a request.");

    cityId = req.Query["cityId"];
    units = req.Query["units"];

    // Pre-checking for invalid IDs (server-sided verification)
    if (cityId == null || !IsValidID(cityId))
        return new BadRequestObjectResult("Invalid cityId. Make sure you are sending it " +
                "to the queryString and that it's a valid integer");
    if (units != null && !ArrayContains(VALID_UNITS, units))
        return new BadRequestObjectResult("Invalid unit type. You may only use imperial or metric");
                
    // We include needed queryString key/values in our dictionary
    queryStringDictionary.Add("id", cityId);
    queryStringDictionary.Add("APPID", WEATHER_API_KEY);
    queryStringDictionary.Add("units", units != null ? units : "metric");
    
    var output = await DoGetRequest(GetApiUrl(queryStringDictionary));

    return (ActionResult) new OkObjectResult(output);
}

private static bool ArrayContains(Array array, Object obj)
{
    return Array.IndexOf(array, obj) >= 0;
}

private static bool IsValidID(string id)
{
    int dummyOutId;
    return Int32.TryParse(id, out dummyOutId);
}

private static string GetApiUrl(Dictionary<string, string> queryString)
{
    string apiBaseUrl = "http://api.openweathermap.org/data";
    string apiVersion = "2.5";
    string apiMethod = "weather";

    StringBuilder apiUrl = new StringBuilder($"{apiBaseUrl}/{apiVersion}/{apiMethod}?");

    foreach(var queryElement in queryString)
        apiUrl.Append($"{queryElement.Key}={queryElement.Value}&");

    return apiUrl.ToString().TrimEnd('&'); // we remove the extra &.
}

private static async Task<string> DoGetRequest(string apiUrl)
{
    using (var httpClient = new HttpClient())
    {
        var response = await httpClient.GetAsync(apiUrl);
        var jsonContent = await response.Content.ReadAsStringAsync();
        string output;
        
        if ((int) response.StatusCode != 200)
        {
            // We throw an error
            var errInfo = new JsonOutput("ERROR", (int) response.StatusCode, response.ReasonPhrase); 
            output = JsonConvert.SerializeObject(errInfo);
        }
        else
        {
            var weatherResponse = JsonConvert.DeserializeObject<WeatherAPIResponse>(jsonContent);
            var weatherEntity = new WeatherEntity(weatherResponse);
            
            var outInfo = new JsonOutput("OK", (int) response.StatusCode, weatherEntity);
            output = JsonConvert.SerializeObject(outInfo);
        }
        return output;
    }
}

/*
    This class will be used to return the desired information to our front-end.
*/
private class JsonOutput
{
    public string type { get; private set; }
    public int status { get; private set; }
    public Object response { get; private set; }

    public JsonOutput(string type, int status, Object response)
    {
        this.type = type;
        this.status = status;
        this.response = response;
    }
}

/*
    This class is a wrapper that we will use to return information
    There are less parameters used here, and it's simplified.
*/
private class WeatherEntity
{
    public class Weather
    {
        public string name { get; set; }
        public string description { get; set; }
        public string icon { get; set; }

        public Weather(WeatherAPIResponse.Weather responseWeather)
        {
            this.name = responseWeather.main;
            this.description = responseWeather.description;
            this.icon = responseWeather.icon;
        }
    }

    public List<WeatherEntity.Weather> weatherList { get; set; }
    public double temperature { get; set; }
    public double humidity { get; set; }
    public double pressure { get; set; }
    public double windSpeed { get; set; }
    public string windDirection { get; set; }
    public long sunrise { get; set; }
    public long sunset { get; set; }

    public WeatherEntity(WeatherAPIResponse response)
    {
        this.weatherList = new List<WeatherEntity.Weather>();

        foreach (var weatherInfo in response.weather)
            weatherList.Add(new WeatherEntity.Weather(weatherInfo));
    
        this.temperature = response.main.temp;
        this.humidity = response.main.humidity;
        this.pressure = response.main.pressure;
        this.windSpeed = response.wind.speed;
        this.windDirection = getWindDirection(response.wind.deg);
        this.sunrise = response.sys.sunrise;
        this.sunset = response.sys.sunset;
    }

    private string getWindDirection(double deg)
    {
        string[] cardinals = {"N", "NNE", "NE", "ENE", 
                              "E", "ESE", "SE", "SSE", 
                              "S", "SSW", "SW", "WSW", 
                              "W", "WNW", "NW", "NNW", "N" };

        return cardinals[(int)Math.Round(((double) deg * 10 % 3600) / 225)];
    }
}

/*
    This class is used to deserialize what we get from OpenWeatherMap
*/
private class WeatherAPIResponse
{
    public class Coord
    {
        public double lon { get; set; }
        public double lat { get; set; }
    }

    public class Weather
    {
        public int id { get; set; }
        public string main { get; set; }
        public string description { get; set; }
        public string icon { get; set; }
    }

    public class Main
    {
        public double temp { get; set; }
        public double pressure { get; set; }
        public double humidity { get; set; }
        public double temp_min { get; set; }
        public double temp_max { get; set; }
}

    public class Wind
    {
        public double speed { get; set; }
        public double deg { get; set; }
    }

    public class Clouds
    {
        public int all { get; set; }
    }

    public class Sys
    {
        public int type { get; set; }
        public int id { get; set; }
        public double message { get; set; }
        public string country { get; set; }
        public long sunrise { get; set; }
        public long sunset { get; set; }
    }

    public Coord coord { get; set; }
    public List<WeatherAPIResponse.Weather> weather { get; set; }
    public string @base { get; set; }
    public Main main { get; set; }
    public int visibility { get; set; }
    public Wind wind { get; set; }
    public Clouds clouds { get; set; }
    public long dt { get; set; }
    public Sys sys { get; set; }
    public int id { get; set; }
    public string name { get; set; }
    public int cod { get; set; }
}