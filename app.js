const today = new Date().toISOString().split('T')[0];
document.getElementById('startDate').min = today;
document.getElementById('startDate').value = today;

document.getElementById('searchForm').addEventListener('submit', handleSearch);

async function handleSearch(e) {
    e.preventDefault();
    
    const formData = getFormData();
    
    if (!validateForm(formData)) {
        return;
    }
    
    showLoading();
    hideError();
    
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

function getFormData() {
    return {
        startDate: document.getElementById('startDate').value,
        duration: parseInt(document.getElementById('duration').value),
        minTemp: parseInt(document.getElementById('minTemp').value),
        maxTemp: parseInt(document.getElementById('maxTemp').value),
        sunny: document.getElementById('sunny').checked,
        beach: document.getElementById('beach').checked,
        culture: document.getElementById('culture').checked,
        nature: document.getElementById('nature').checked
    };
}

function validateForm(data) {
    if (data.minTemp > data.maxTemp) {
        showError('A minimum hőmérséklet nem lehet nagyobb, mint a maximum!');
        return false;
    }
    
    if (data.duration < 1 || data.duration > 30) {
        showError('A tartózkodás időtartama 1 és 30 nap között lehet!');
        return false;
    }
    
    return true;
}

async function searchDestinationsWithAPI(criteria) {
    console.log('Keresési feltételek:', criteria);
    
    const cityPromises = destinations.map(async (dest) => {
        try {
            console.log(`Időjárás lekérése: ${dest.name}...`);
            
            const [weather, forecast] = await Promise.all([
                weatherAPI.getCurrentWeather(dest.name),
                weatherAPI.getForecast(dest.name)
            ]);
            
            if (!weather || !forecast || forecast.length === 0) {
                console.warn(`Nem sikerült lekérni: ${dest.name}`);
                return null;
            }

            const avgTemp = Math.round(
                forecast.reduce((sum, day) => sum + day.avgTemp, 0) / forecast.length
            );
            
            const avgSunshine = Math.round(
                forecast.reduce((sum, day) => sum + day.sunshine, 0) / forecast.length
            );

            console.log(`${dest.name}: ${avgTemp}°C, napsütés: ${avgSunshine}%`);

            if (avgTemp < criteria.minTemp || avgTemp > criteria.maxTemp) {
                console.log(`${dest.name} kiszűrve (hőmérséklet)`);
                return null;
            }
            
            if (criteria.sunny && avgSunshine < 70) {
                console.log(`${dest.name} kiszűrve (napsütés)`);
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
    
    console.log(`${validResults.length} találat a ${destinations.length} városból`);
    
    return calculateScores(validResults, criteria);
}

function calculateScores(destinations, criteria) {
    const scored = destinations.map(dest => {
        let score = 0;

        const tempMid = (criteria.minTemp + criteria.maxTemp) / 2;
        const tempDiff = Math.abs(dest.avgTemp - tempMid);
        score += Math.max(0, 40 - tempDiff * 2);

        if (criteria.sunny) {
            score += dest.sunshine * 0.3;
        }

        if (criteria.beach && dest.beach) score += 10;
        if (criteria.culture && dest.culture) score += 10;
        if (criteria.nature && dest.nature) score += 10;

        score += dest.sunshine * 0.2;

        return {
            ...dest,
            matchScore: Math.round(score)
        };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);

    return scored;
}

function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    if (results.length === 0) {
        resultsDiv.innerHTML = `
            <div class="no-results">
                Nincs találat<br>
            </div>
        `;
        return;
    }

    console.log('Megjelenítendő eredmények:', results);

    results.forEach(dest => {
        const card = createDestinationCard(dest);
        resultsDiv.appendChild(card);
    });
}

function createDestinationCard(dest) {
    const card = document.createElement('div');
    card.className = 'destination-card';
    
    const tags = [];
    if (dest.beach) tags.push('<span class="tag">🏖️ Tengerpart</span>');
    if (dest.culture) tags.push('<span class="tag">🏛️ Kultúra</span>');
    if (dest.nature) tags.push('<span class="tag">🌲 Természet</span>');

    const weatherIcon = dest.realTimeWeather?.icon 
        ? `<img src="https://openweathermap.org/img/wn/${dest.realTimeWeather.icon}@2x.png" alt="időjárás" style="width: 50px; height: 50px;">` 
        : dest.emoji;

    card.innerHTML = `
        <div class="card-image">
            ${weatherIcon}
        </div>
        <div class="card-content">
            <div class="card-title">${dest.name}</div>
            <div class="card-country">${dest.country}</div>
            
            <div class="weather-info">
                <div class="weather-item">
                    <div class="weather-label">Hőmérséklet</div>
                    <div class="weather-value">${dest.avgTemp}°C</div>
                </div>
                <div class="weather-item">
                    <div class="weather-label">Napsütés</div>
                    <div class="weather-value">${dest.sunshine}%</div>
                </div>
                <div class="weather-item">
                    <div class="weather-label">Páratartalom</div>
                    <div class="weather-value">${dest.humidity}%</div>
                </div>
            </div>
            
            ${tags.length > 0 ? `<div class="tags">${tags.join('')}</div>` : ''}
            
            <div class="description">${dest.description}</div>
            
            <div class="match-score">🎯 ${dest.matchScore}% találat</div>
            
            ${dest.realTimeWeather ? `
                <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                    <strong>Aktuális:</strong> ${dest.realTimeWeather.description}
                    ${dest.realTimeWeather.windSpeed ? ` • Szél: ${dest.realTimeWeather.windSpeed} m/s` : ''}
                </div>
            ` : ''}
        </div>
    `;
    
    card.addEventListener('click', () => showDetailedForecast(dest));
    
    return card;
}

function showDetailedForecast(dest) {
    if (!dest.forecastData || dest.forecastData.length === 0) {
        alert('Nincs elérhető előrejelzés ehhez a városhoz.');
        return;
    }

    let forecastHTML = `
        <strong>${dest.name} - ${dest.forecastData.length} napos előrejelzés:</strong><br><br>
    `;

    dest.forecastData.slice(0, 5).forEach(day => {
        forecastHTML += `
📅 ${day.date}: ${day.minTemp}°C - ${day.maxTemp}°C
   ${day.description}, napsütés: ${day.sunshine}%\n
        `;
    });

    alert(forecastHTML);
}

function showLoading() {
    document.getElementById('loading').classList.add('show');
    document.getElementById('results').innerHTML = '';
}

function hideLoading() {
    document.getElementById('loading').classList.remove('show');
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    
    setTimeout(() => {
        hideError();
    }, 5000);
}

function hideError() {
    document.getElementById('errorMessage').classList.remove('show');
}

const API_TIMEOUT = 10000;

async function searchDestinationsWithTimeout(criteria) {
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API timeout')), API_TIMEOUT)
    );

    try {
        return await Promise.race([
            searchDestinationsWithAPI(criteria),
            timeoutPromise
        ]);
    } catch (error) {
        console.warn('API hiba:', error);
        return searchDestinationsMock(criteria);
    }
}

function searchDestinationsMock(criteria) {
    console.log('Mock keresés használata...');
    
    let filtered = destinations.filter(dest => {
        if (dest.avgTemp < criteria.minTemp || dest.avgTemp > criteria.maxTemp) return false;
        if (criteria.sunny && dest.sunshine < 70) return false;
        if (criteria.beach && !dest.beach) return false;
        if (criteria.culture && !dest.culture) return false;
        if (criteria.nature && !dest.nature) return false;
        return true;
    });

    return calculateScores(filtered, criteria);
}

console.log('Nyaralástervező alkalmazás betöltve');
console.log('API-k inicializálva:', {
    weather: typeof weatherAPI !== 'undefined',
    places: typeof placesAPI !== 'undefined'
});