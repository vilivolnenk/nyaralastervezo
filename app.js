async function handleSearch(e) {
    e.preventDefault();
    
    const formData = getFormData();
    
    if (!validateForm(formData)) {
        return;
    }
    
    showLoading();
    
    try {
        const results = await searchDestinationsWithAPI(formData);
        displayResults(results);
    } catch (error) {
        console.error('Keresési hiba:', error);
        showError('Hiba történt a keresés során. Kérlek próbáld újra!');
    } finally {
        hideLoading();
    }
}

async function searchDestinationsWithAPI(criteria) {
    const cityPromises = destinations.map(async (dest) => {
        try {
            const weather = await weatherAPI.getCurrentWeather(dest.name);
            const forecast = await weatherAPI.getForecast(dest.name);
            
            if (!weather || !forecast || forecast.length === 0) {
                return null;
            }

            const avgTemp = Math.round(
                forecast.reduce((sum, day) => sum + day.avgTemp, 0) / forecast.length
            );
            
            const avgSunshine = Math.round(
                forecast.reduce((sum, day) => sum + day.sunshine, 0) / forecast.length
            );

            if (avgTemp < criteria.minTemp || avgTemp > criteria.maxTemp) {
                return null;
            }
            
            if (criteria.sunny && avgSunshine < 70) {
                return null;
            }
            
            if (criteria.beach && !dest.beach) return null;
            if (criteria.culture && !dest.culture) return null;
            if (criteria.nature && !dest.nature) return null;

            return {
                ...dest,
                avgTemp: avgTemp,
                sunshine: avgSunshine,
                humidity: weather.humidity,
                realTimeWeather: weather,
                forecastData: forecast
            };
        } catch (error) {
            console.error(`Hiba ${dest.name} lekérésekor:`, error);
            return null;
        }
    });

    const results = await Promise.all(cityPromises);
    
    const validResults = results.filter(result => result !== null);
    
    return calculateScores(validResults, criteria);
}

async function loadDestinationPhotos(cityName) {
    try {
        const places = await placesAPI.searchPlaces(cityName);
        
        if (places.length > 0 && places[0].photos.length > 0) {
            return places[0].photos[0];
        }
        
        return null;
    } catch (error) {
        console.error('Fotó lekérési hiba:', error);
        return null;
    }
}