// ===== API CONFIGURATION =====
// Usando OpenWeatherMap API - versão gratuita
const API_KEY = 'b6fd43b53d41c4e7f3f18f0c74146b5d'; // Chave pública para demo
const WEATHER_API = 'https://api.openweathermap.org/data/2.5';
const GEO_API = 'https://api.openweathermap.org/geo/1.0';

// ===== DOM ELEMENTS =====
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const errorMessage = document.getElementById('error-message');
const loading = document.getElementById('loading');
const weatherContent = document.getElementById('weather-content');
const welcome = document.getElementById('welcome');

// ===== EVENT LISTENERS =====
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
locationBtn.addEventListener('click', getUserLocation);

// ===== MAIN FUNCTIONS =====

async function handleSearch() {
    const city = searchInput.value.trim();
    if (!city) {
        showError('Por favor, digite um nome de cidade!');
        return;
    }
    getWeatherByCity(city);
}

async function getWeatherByCity(city) {
    try {
        showLoading(true);
        hideError();
        
        // Get coordinates from city name
        const geoResponse = await fetch(
            `${GEO_API}/direct?q=${city}&limit=1&appid=${API_KEY}`
        );
        const geoData = await geoResponse.json();
        
        if (geoData.length === 0) {
            showError('Cidade não encontrada. Tente novamente!');
            showLoading(false);
            return;
        }
        
        const { lat, lon, name, country } = geoData[0];
        await fetchWeatherData(lat, lon, name, country);
        
    } catch (error) {
        console.error('Erro:', error);
        showError('Erro ao buscar dados. Tente novamente mais tarde.');
        showLoading(false);
    }
}

async function getUserLocation() {
    if (!navigator.geolocation) {
        showError('Localização não é suportada neste navegador.');
        return;
    }
    
    showLoading(true);
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
                // Get city name from coordinates (reverse geocoding)
                const response = await fetch(
                    `${GEO_API}/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
                );
                const data = await response.json();
                const name = data[0]?.name || 'Sua Localização';
                const country = data[0]?.country || '';
                
                await fetchWeatherData(latitude, longitude, name, country);
            } catch (error) {
                await fetchWeatherData(latitude, longitude, 'Sua Localização', '');
            }
        },
        (error) => {
            showError('Erro ao obter localização. Ative a permissão.');
            showLoading(false);
        }
    );
}

async function fetchWeatherData(lat, lon, cityName, country) {
    try {
        // Buscar dados de clima atual
        const weatherResponse = await fetch(
            `${WEATHER_API}/weather?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${API_KEY}`
        );
        const weatherData = await weatherResponse.json();
        
        // Buscar previsão 5 dias
        const forecastResponse = await fetch(
            `${WEATHER_API}/forecast?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${API_KEY}`
        );
        const forecastData = await forecastResponse.json();
        
        // Buscar qualidade do ar
        const airQualityResponse = await fetch(
            `${WEATHER_API}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        const airQualityData = await airQualityResponse.json();
        
        // Buscar UV Index
        const uvResponse = await fetch(
            `${WEATHER_API}/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        const uvData = await uvResponse.json();
        
        // Renderizar dados
        displayCurrentWeather(weatherData, cityName, country, uvData);
        displayForecast(forecastData);
        displayHourlyForecast(forecastData);
        displayAirQuality(airQualityData);
        
        showLoading(false);
        welcome.classList.add('hidden');
        weatherContent.classList.remove('hidden');
        
    } catch (error) {
        console.error('Erro:', error);
        showError('Erro ao carregar dados de clima.');
        showLoading(false);
    }
}

// ===== DISPLAY FUNCTIONS =====

function displayCurrentWeather(data, cityName, country, uvData) {
    const { main, weather, wind, sys, visibility, clouds, dt } = data;
    
    // Update city and date
    document.getElementById('cityName').textContent = 
        `${cityName}, ${country}`;
    document.getElementById('date-time').textContent = 
        formatDate(new Date(dt * 1000));
    
    // Update temperature and description
    document.getElementById('temperature').textContent = 
        Math.round(main.temp);
    document.getElementById('description').textContent = 
        weather[0].description;
    document.getElementById('feels-like').textContent = 
        `Sensação: ${Math.round(main.feels_like)}°C`;
    
    // Update weather icon
    const iconUrl = `https://openweathermap.org/img/wn/${weather[0].icon}@4x.png`;
    document.getElementById('weather-icon').src = iconUrl;
    
    // Update details
    document.getElementById('humidity').textContent = 
        `${main.humidity}%`;
    document.getElementById('wind').textContent = 
        `${(wind.speed * 3.6).toFixed(1)} km/h`;
    document.getElementById('pressure').textContent = 
        `${main.pressure} hPa`;
    document.getElementById('visibility').textContent = 
        `${(visibility / 1000).toFixed(1)} km`;
    document.getElementById('uv-index').textContent = 
        uvData.value ? uvData.value.toFixed(1) : '--';
    
    // Update sunrise/sunset
    const sunrise = formatTime(new Date(sys.sunrise * 1000));
    const sunset = formatTime(new Date(sys.sunset * 1000));
    document.getElementById('sun-times').textContent = 
        `${sunrise} / ${sunset}`;
}

function displayForecast(data) {
    const forecastGrid = document.getElementById('forecast-grid');
    forecastGrid.innerHTML = '';
    
    // Agrupar dados por dia (5 dias)
    const dailyData = {};
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString('pt-BR');
        
        if (!dailyData[date]) {
            dailyData[date] = [];
        }
        dailyData[date].push(item);
    });
    
    // Criar cards para cada dia
    let dayCount = 0;
    for (const [date, items] of Object.entries(dailyData)) {
        if (dayCount >= 5) break;
        dayCount++;
        
        const temps = items.map(item => item.main.temp);
        const minTemp = Math.min(...temps);
        const maxTemp = Math.max(...temps);
        const description = items[0].weather[0].description;
        const icon = items[0].weather[0].icon;
        
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-date">${date}</div>
            <img src="https://openweathermap.org/img/wn/${icon}@2x.png" class="forecast-icon" alt="">
            <div class="forecast-temp">${Math.round(maxTemp)}°</div>
            <div class="forecast-temp-range">${Math.round(minTemp)}° - ${Math.round(maxTemp)}°</div>
            <div class="forecast-desc">${description}</div>
        `;
        forecastGrid.appendChild(card);
    }
}

function displayHourlyForecast(data) {
    const hourlyGrid = document.getElementById('hourly-grid');
    hourlyGrid.innerHTML = '';
    
    // Pegar as próximas 24 horas
    data.list.slice(0, 8).forEach(item => {
        const time = formatTime(new Date(item.dt * 1000));
        const temp = Math.round(item.main.temp);
        const icon = item.weather[0].icon;
        const rain = item.rain ? `${Math.round(item.rain['3h'])}mm` : '0mm';
        
        const card = document.createElement('div');
        card.className = 'hourly-card';
        card.innerHTML = `
            <div class="hourly-time">${time}</div>
            <img src="https://openweathermap.org/img/wn/${icon}@2x.png" class="hourly-icon" alt="">
            <div class="hourly-temp">${temp}°</div>
            <div class="hourly-rain">💧 ${rain}</div>
        `;
        hourlyGrid.appendChild(card);
    });
}

function displayAirQuality(data) {
    const { main, components } = data.list[0];
    
    // AQI values: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
    const aqiLabels = {
        1: 'Bom ✅',
        2: 'Aceitável ⚠️',
        3: 'Moderado ⚠️',
        4: 'Ruim ❌',
        5: 'Muito Ruim ❌'
    };
    
    document.getElementById('aqi-value').textContent = 
        aqiLabels[main.aqi] || '--';
    
    // Converter μg/m³ para µg/m³ (formato melhor)
    document.getElementById('pm25').textContent = 
        `PM2.5: ${components.pm2_5.toFixed(1)} μg/m³`;
    document.getElementById('pm10').textContent = 
        `PM10: ${components.pm10.toFixed(1)} μg/m³`;
    document.getElementById('o3').textContent = 
        `O₃: ${components.o3.toFixed(1)} μg/m³`;
    document.getElementById('no2').textContent = 
        `NO₂: ${components.no2.toFixed(1)} μg/m³`;
}

// ===== UTILITY FUNCTIONS =====

function formatDate(date) {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('pt-BR', options);
}

function formatTime(date) {
    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

function hideError() {
    errorMessage.classList.remove('show');
}

function showLoading(show) {
    if (show) {
        loading.classList.add('show');
    } else {
        loading.classList.remove('show');
    }
}

// ===== INITIAL LOAD =====
// Opcionalmente, carregue dados de uma cidade padrão
window.addEventListener('load', () => {
    // Descomente a linha abaixo para carregar automaticamente
    // getWeatherByCity('São Paulo');
});