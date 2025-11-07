class WeatherAPI {
    constructor() {
        this.apiKey = CONFIG.OPENWEATHER_API_KEY;
        this.baseUrl = CONFIG.OPENWEATHER_BASE_URL;
        this.units = CONFIG.WEATHER_UNITS;
        this.lang = CONFIG.LANGUAGE;
    }

    async getCurrentWeather(cityName) {
        try {
            const url = `${this.baseUrl}/weather?q=${cityName}&appid=${this.apiKey}&units=${this.units}&lang=${this.lang}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return this.formatCurrentWeather(data);
        } catch (error) {
            console.error('Időjárás lekérési hiba:', error);
            return null;
        }
    }

    async getForecast(cityName) {
        try {
            const url = `${this.baseUrl}/forecast?q=${cityName}&appid=${this.apiKey}&units=${this.units}&lang=${this.lang}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return this.formatForecast(data);
        } catch (error) {
            console.error('Előrejelzés lekérési hiba:', error);
            return null;
        }
    }

    async getWeatherByCoordinates(lat, lon) {
        try {
            const url = `${this.baseUrl}/onecall?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=${this.units}&lang=${this.lang}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return this.formatOneCallWeather(data);
        } catch (error) {
            console.error('Koordináta alapú időjárás hiba:', error);
            return null;
        }
    }

    formatCurrentWeather(data) {
        return {
            temp: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            tempMin: Math.round(data.main.temp_min),
            tempMax: Math.round(data.main.temp_max),
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            clouds: data.clouds.all,
            windSpeed: data.wind.speed,
            sunrise: new Date(data.sys.sunrise * 1000),
            sunset: new Date(data.sys.sunset * 1000),
            cityName: data.name,
            country: data.sys.country
        };
    }

    formatForecast(data) {
        const dailyData = {};
        
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000).toLocaleDateString('hu-HU');
            
            if (!dailyData[date]) {
                dailyData[date] = {
                    temps: [],
                    humidity: [],
                    descriptions: [],
                    icons: [],
                    clouds: []
                };
            }
            
            dailyData[date].temps.push(item.main.temp);
            dailyData[date].humidity.push(item.main.humidity);
            dailyData[date].descriptions.push(item.weather[0].description);
            dailyData[date].icons.push(item.weather[0].icon);
            dailyData[date].clouds.push(item.clouds.all);
        });

        return Object.keys(dailyData).map(date => ({
            date: date,
            avgTemp: Math.round(
                dailyData[date].temps.reduce((a, b) => a + b, 0) / dailyData[date].temps.length
            ),
            minTemp: Math.round(Math.min(...dailyData[date].temps)),
            maxTemp: Math.round(Math.max(...dailyData[date].temps)),
            avgHumidity: Math.round(
                dailyData[date].humidity.reduce((a, b) => a + b, 0) / dailyData[date].humidity.length
            ),
            avgClouds: Math.round(
                dailyData[date].clouds.reduce((a, b) => a + b, 0) / dailyData[date].clouds.length
            ),
            sunshine: Math.round(100 - dailyData[date].clouds.reduce((a, b) => a + b, 0) / dailyData[date].clouds.length),
            description: dailyData[date].descriptions[0],
            icon: dailyData[date].icons[0]
        }));
    }

    formatOneCallWeather(data) {
        return {
            current: {
                temp: Math.round(data.current.temp),
                humidity: data.current.humidity,
                clouds: data.current.clouds,
                windSpeed: data.current.wind_speed
            },
            daily: data.daily.map(day => ({
                date: new Date(day.dt * 1000),
                temp: Math.round(day.temp.day),
                tempMin: Math.round(day.temp.min),
                tempMax: Math.round(day.temp.max),
                humidity: day.humidity,
                clouds: day.clouds,
                sunshine: Math.round(100 - day.clouds),
                description: day.weather[0].description,
                icon: day.weather[0].icon
            }))
        };
    }
}

class PlacesAPI {
    constructor() {
        this.apiKey = CONFIG.GOOGLE_API_KEY;
        this.baseUrl = CONFIG.GOOGLE_PLACES_URL;
        this.language = CONFIG.LANGUAGE;
    }

    async searchPlaces(query, location = null) {
        try {
            let url = `${this.baseUrl}/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}&language=${this.language}`;
            
            if (location) {
                url += `&location=${location.lat},${location.lng}&radius=50000`;
            }

            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return this.formatPlaceResults(data.results);
        } catch (error) {
            console.error('Helyszín keresési hiba:', error);
            return [];
        }
    }

    async getPlaceDetails(placeId) {
        try {
            const url = `${this.baseUrl}/details/json?place_id=${placeId}&key=${this.apiKey}&language=${this.language}&fields=name,rating,formatted_address,geometry,photos,types,user_ratings_total`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.result;
        } catch (error) {
            console.error('Helyszín részletek lekérési hiba:', error);
            return null;
        }
    }

    getPhotoUrl(photoReference, maxWidth = 400) {
        return `${this.baseUrl}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${this.apiKey}`;
    }

    async getAutocompleteSuggestions(input) {
        try {
            const url = `${this.baseUrl}/autocomplete/json?input=${encodeURIComponent(input)}&types=(cities)&key=${this.apiKey}&language=${this.language}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.predictions;
        } catch (error) {
            console.error('Autocomplete hiba:', error);
            return [];
        }
    }

    formatPlaceResults(results) {
        return results.map(place => ({
            placeId: place.place_id,
            name: place.name,
            address: place.formatted_address,
            location: place.geometry.location,
            rating: place.rating || 0,
            userRatingsTotal: place.user_ratings_total || 0,
            types: place.types,
            photos: place.photos ? place.photos.map(photo => 
                this.getPhotoUrl(photo.photo_reference)
            ) : []
        }));
    }

    async getNearbyPlaces(location, radius = 5000, type = 'tourist_attraction') {
        try {
            const url = `${this.baseUrl}/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&type=${type}&key=${this.apiKey}&language=${this.language}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return this.formatPlaceResults(data.results);
        } catch (error) {
            console.error('Közeli helyek keresési hiba:', error);
            return [];
        }
    }
}

class DestinationSearchService {
    constructor() {
        this.weatherAPI = new WeatherAPI();
        this.placesAPI = new PlacesAPI();
    }

    async searchDestination(cityName) {
        try {
            const [weather, forecast, places] = await Promise.all([
                this.weatherAPI.getCurrentWeather(cityName),
                this.weatherAPI.getForecast(cityName),
                this.placesAPI.searchPlaces(cityName + ' attractions')
            ]);

            return {
                city: cityName,
                weather: weather,
                forecast: forecast,
                places: places.slice(0, 5),
                photos: places[0]?.photos || []
            };
        } catch (error) {
            console.error('Komplex keresési hiba:', error);
            return null;
        }
    }

    async compareDestinations(cities) {
        const results = await Promise.all(
            cities.map(city => this.searchDestination(city))
        );
        
        return results.filter(result => result !== null);
    }
}

const weatherAPI = new WeatherAPI();
const placesAPI = new PlacesAPI();
const destinationSearch = new DestinationSearchService();