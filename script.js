/**
 * WEAQUA — Weather & Air Quality Application
 * Built with HTML5, CSS3, and Vanilla JavaScript
 * Data sources: Open-Meteo Forecast, Air Quality, and Geocoding APIs
 */

(() => {
  'use strict';

  // --- Constants & Storage Keys ---
  const STORAGE_KEYS = {
    SAVED_CITIES: 'weaqua_saved_cities',
    LAST_WEATHER: 'weaqua_last_weather'
  };

  const WMO_CODE_MAP = {
    0: { label: 'Clear sky', icon: '☀️' },
    1: { label: 'Mainly clear', icon: '🌤️' },
    2: { label: 'Partly cloudy', icon: '⛅' },
    3: { label: 'Overcast', icon: '☁️' },
    45: { label: 'Foggy', icon: '🌫️' },
    48: { label: 'Depositing rime fog', icon: '🌫️' },
    51: { label: 'Light drizzle', icon: '🌦️' },
    53: { label: 'Moderate drizzle', icon: '🌦️' },
    55: { label: 'Dense drizzle', icon: '🌧️' },
    56: { label: 'Light freezing drizzle', icon: '🌨️' },
    57: { label: 'Dense freezing drizzle', icon: '🌨️' },
    61: { label: 'Slight rain', icon: '🌧️' },
    63: { label: 'Moderate rain', icon: '🌧️' },
    65: { label: 'Heavy rain', icon: '🌧️' },
    66: { label: 'Light freezing rain', icon: '🌨️' },
    67: { label: 'Heavy freezing rain', icon: '🌨️' },
    71: { label: 'Slight snowfall', icon: '🌨️' },
    73: { label: 'Moderate snowfall', icon: '❄️' },
    75: { label: 'Heavy snowfall', icon: '❄️' },
    77: { label: 'Snow grains', icon: '❄️' },
    80: { label: 'Slight rain showers', icon: '🌦️' },
    81: { label: 'Moderate rain showers', icon: '🌧️' },
    82: { label: 'Violent rain showers', icon: '⛈️' },
    85: { label: 'Slight snow showers', icon: '🌨️' },
    86: { label: 'Heavy snow showers', icon: '❄️' },
    95: { label: 'Thunderstorm', icon: '⛈️' },
    96: { label: 'Thunderstorm with hail', icon: '⛈️' },
    99: { label: 'Thunderstorm with heavy hail', icon: '⛈️' }
  };

  // --- Application State ---
  let currentCity = null; // { name, country, lat, lon }
  let savedCities = [];
  let pendingDeleteIndex = null;
  let searchDebounceTimer = null;

  // --- DOM Element References ---
  const elements = {
    offlineBadge: document.getElementById('offline-badge'),
    btnMyLocation: document.getElementById('btn-my-location'),
    searchForm: document.getElementById('search-form'),
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    searchSuggestions: document.getElementById('search-suggestions'),

    // Notices
    locationNotice: document.getElementById('location-notice'),
    locationNoticeText: document.getElementById('location-notice-text'),
    closeLocationNotice: document.getElementById('close-location-notice'),
    cachedNotice: document.getElementById('cached-notice'),
    cachedNoticeText: document.getElementById('cached-notice-text'),
    errorNotice: document.getElementById('error-notice'),
    errorNoticeText: document.getElementById('error-notice-text'),
    closeErrorNotice: document.getElementById('close-error-notice'),

    // Loading & Content
    loadingSpinner: document.getElementById('loading-spinner'),
    loadingText: document.getElementById('loading-text'),
    weatherContent: document.getElementById('weather-content'),

    // Current Weather Elements
    currentCityName: document.getElementById('current-city-name'),
    currentCountryName: document.getElementById('current-country-name'),
    btnSaveCurrent: document.getElementById('btn-save-current'),
    saveBtnLabel: document.getElementById('save-btn-label'),
    currentTemp: document.getElementById('current-temp'),
    currentWeatherIcon: document.getElementById('current-weather-icon'),
    currentCondition: document.getElementById('current-condition'),
    currentFeelsLike: document.getElementById('current-feels-like'),
    currentHumidity: document.getElementById('current-humidity'),
    currentWind: document.getElementById('current-wind'),

    // Air Quality
    aqiCard: document.getElementById('aqi-card'),
    aqiBadge: document.getElementById('aqi-badge'),
    aqiValueText: document.getElementById('aqi-value-text'),
    aqiDescription: document.getElementById('aqi-description'),

    // Weather Tip
    tipText: document.getElementById('weather-tip-text'),

    // Forecast
    forecastList: document.getElementById('forecast-list'),

    // Saved Cities
    savedCitiesCount: document.getElementById('saved-cities-count'),
    savedEmptyState: document.getElementById('saved-empty-state'),
    savedCitiesList: document.getElementById('saved-cities-list'),

    // Modal
    deleteModal: document.getElementById('delete-modal'),
    modalMessage: document.getElementById('modal-message'),
    btnCancelDelete: document.getElementById('btn-cancel-delete'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete')
  };

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  function init() {
    loadSavedCities();
    renderSavedCities();
    setupEventListeners();
    updateNetworkStatus();

    // Check if offline on launch
    if (!navigator.onLine) {
      const cached = getLastWeather();
      if (cached) {
        renderCachedWeather(cached, 'Offline: Loaded saved weather data.');
      } else {
        showError('You are currently offline and have no saved weather data.');
      }
      return;
    }

    // Try current location on app launch
    requestCurrentLocation();
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  function setupEventListeners() {
    // Network connectivity
    window.addEventListener('online', () => {
      updateNetworkStatus();
      hideError();
    });
    window.addEventListener('offline', () => {
      updateNetworkStatus();
      const cached = getLastWeather();
      if (cached && currentCity) {
        showCachedNotice(`Offline: Showing weather cached on ${formatTimestamp(cached.timestamp)}.`);
      }
    });

    // Location button
    elements.btnMyLocation.addEventListener('click', () => {
      hideNotice(elements.locationNotice);
      hideNotice(elements.errorNotice);
      requestCurrentLocation();
    });

    // Notice close buttons
    elements.closeLocationNotice.addEventListener('click', () => {
      hideNotice(elements.locationNotice);
    });
    elements.closeErrorNotice.addEventListener('click', () => {
      hideNotice(elements.errorNotice);
    });

    // Search Input & Suggestions
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.searchInput.addEventListener('keydown', handleSearchKeydown);
    elements.searchClearBtn.addEventListener('click', clearSearchInput);

    // Form submission
    elements.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = elements.searchInput.value.trim();
      if (query) {
        searchCity(query);
      }
    });

    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!elements.searchForm.contains(e.target) && !elements.searchSuggestions.contains(e.target)) {
        hideSuggestions();
      }
    });

    // Save current city button
    elements.btnSaveCurrent.addEventListener('click', toggleSaveCurrentCity);

    // Delete modal controls
    elements.btnCancelDelete.addEventListener('click', closeDeleteModal);
    elements.btnConfirmDelete.addEventListener('click', confirmDeleteCity);
    elements.deleteModal.addEventListener('click', (e) => {
      if (e.target === elements.deleteModal) {
        closeDeleteModal();
      }
    });

    // Global keyboard listener (Escape key closes modal and suggestions)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!elements.deleteModal.classList.contains('hidden')) {
          closeDeleteModal();
        }
        hideSuggestions();
      }
    });
  }

  // ==========================================================================
  // GEOLOCATION & REVERSE GEOCODING
  // ==========================================================================

  function requestCurrentLocation() {
    if (!navigator.geolocation) {
      showLocationNotice('Geolocation is not supported by your browser. Please search for a city above.');
      loadFallbackWeather();
      return;
    }

    showLoading('Locating your position...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          elements.loadingText.textContent = 'Getting local weather...';
          const geoData = await reverseGeocode(latitude, longitude);
          await fetchAndDisplayWeather({
            name: geoData.name,
            country: geoData.country,
            lat: latitude,
            lon: longitude
          });
        } catch (err) {
          console.error('Error fetching location weather:', err);
          showError('Unable to load weather for your location. Please search for a city.');
          loadFallbackWeather();
        } finally {
          hideLoading();
        }
      },
      (error) => {
        hideLoading();
        let message = 'Location access was blocked or unavailable. Please search for a city above.';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Location permission was denied. You can search for any city above.';
        }
        showLocationNotice(message);
        loadFallbackWeather();
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }

  async function reverseGeocode(lat, lon) {
    // 1. Try BigDataCloud free client-side reverse geocoding
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
      if (res.ok) {
        const data = await res.json();
        const city = data.city || data.locality || data.principalSubdivision || 'Your Location';
        const country = data.countryName || data.countryCode || '';
        return { name: city, country };
      }
    } catch {
      // Ignore and fallback
    }

    // 2. Fallback to OpenStreetMap Nominatim
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.village || addr.municipality || 'Your Location';
        const country = addr.country || '';
        return { name: city, country };
      }
    } catch {
      // Ignore and fallback
    }

    // 3. Coordinate fallback
    return {
      name: 'Current Location',
      country: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
    };
  }

  function loadFallbackWeather() {
    const cached = getLastWeather();
    if (cached) {
      renderCachedWeather(cached, `Showing last viewed city (${cached.city.name}), updated on ${formatTimestamp(cached.timestamp)}.`);
    }
  }

  // ==========================================================================
  // SEARCH & AUTOCOMPLETE (Open-Meteo Geocoding API)
  // ==========================================================================

  function handleSearchInput(e) {
    const query = e.target.value.trim();

    // Toggle clear button
    if (query.length > 0) {
      elements.searchClearBtn.classList.remove('hidden');
    } else {
      elements.searchClearBtn.classList.add('hidden');
      hideSuggestions();
      return;
    }

    clearTimeout(searchDebounceTimer);
    if (query.length < 2) {
      hideSuggestions();
      return;
    }

    // Debounce geocoding search for 300ms
    searchDebounceTimer = setTimeout(() => {
      fetchCitySuggestions(query);
    }, 300);
  }

  async function fetchCitySuggestions(query) {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();
      if (data.results && data.results.length > 0) {
        renderSuggestions(data.results);
      } else {
        renderNoSuggestions();
      }
    } catch (err) {
      console.warn('Geocoding suggestions error:', err);
    }
  }

  function renderSuggestions(cities) {
    elements.searchSuggestions.innerHTML = '';
    cities.forEach((city) => {
      const li = document.createElement('li');
      li.className = 'suggestion-item';
      li.setAttribute('role', 'option');

      const admin = city.admin1 ? `${city.admin1}, ` : '';
      const country = city.country || '';

      li.innerHTML = `
        <span class="suggestion-name">${escapeHtml(city.name)}</span>
        <span class="suggestion-country">${escapeHtml(admin + country)}</span>
      `;

      li.addEventListener('click', () => {
        selectCity({
          name: city.name,
          country: country,
          lat: city.latitude,
          lon: city.longitude
        });
      });

      elements.searchSuggestions.appendChild(li);
    });

    elements.searchSuggestions.classList.remove('hidden');
  }

  function renderNoSuggestions() {
    elements.searchSuggestions.innerHTML = `
      <li class="suggestion-item" style="cursor: default; color: #94a3b8;">
        <span>No matching cities found</span>
      </li>
    `;
    elements.searchSuggestions.classList.remove('hidden');
  }

  function hideSuggestions() {
    elements.searchSuggestions.classList.add('hidden');
    elements.searchSuggestions.innerHTML = '';
  }

  function clearSearchInput() {
    elements.searchInput.value = '';
    elements.searchClearBtn.classList.add('hidden');
    hideSuggestions();
    elements.searchInput.focus();
  }

  function handleSearchKeydown(e) {
    if (e.key === 'Escape') {
      hideSuggestions();
    }
  }

  async function searchCity(query) {
    hideSuggestions();
    showLoading(`Searching for "${query}"...`);
    hideNotice(elements.errorNotice);

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to search city');

      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        throw new Error(`No city found matching "${query}". Check spelling and try again.`);
      }

      const topResult = data.results[0];
      await selectCity({
        name: topResult.name,
        country: topResult.country || '',
        lat: topResult.latitude,
        lon: topResult.longitude
      });
    } catch (err) {
      console.error(err);
      showError(err.message || 'Error finding city');
    } finally {
      hideLoading();
    }
  }

  async function selectCity(city) {
    hideSuggestions();
    elements.searchInput.value = '';
    elements.searchClearBtn.classList.add('hidden');
    showLoading(`Loading weather for ${city.name}...`);
    hideNotice(elements.errorNotice);

    try {
      await fetchAndDisplayWeather(city);
    } catch (err) {
      console.error('Failed to load city weather:', err);
      showError(`Could not fetch weather for ${city.name}. Please try again.`);
    } finally {
      hideLoading();
    }
  }

  // ==========================================================================
  // WEATHER & AIR QUALITY API FETCHING
  // ==========================================================================

  async function fetchAndDisplayWeather(city) {
    const { lat, lon } = city;

    // 1. Forecast API URL (current temp, humidity, wind, code + 5-day daily max/min/code)
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

    // 2. Air Quality API URL (US AQI & European AQI)
    const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,european_aqi,pm2_5,pm10`;

    // Fetch both in parallel
    const [forecastRes, aqiRes] = await Promise.allSettled([
      fetch(forecastUrl),
      fetch(airQualityUrl)
    ]);

    if (forecastRes.status !== 'fulfilled' || !forecastRes.value.ok) {
      // If network or request failed, fallback to cached weather with last updated note
      const cached = getLastWeather();
      if (cached) {
        renderCachedWeather(
          cached,
          `Network issue. Showing last saved weather from ${formatTimestamp(cached.timestamp)}.`
        );
        return;
      }
      throw new Error('Weather forecast service is temporarily unavailable.');
    }

    const forecastData = await forecastRes.value.json();

    let aqiData = null;
    if (aqiRes.status === 'fulfilled' && aqiRes.value.ok) {
      try {
        aqiData = await aqiRes.value.json();
      } catch {
        aqiData = null;
      }
    }

    // Save to state
    currentCity = city;

    // Save to localStorage for persistence across reloads & offline use
    const weatherRecord = {
      city,
      forecast: forecastData,
      airQuality: aqiData,
      timestamp: Date.now()
    };
    saveLastWeather(weatherRecord);

    // Render live results
    hideNotice(elements.cachedNotice);
    renderWeatherData(weatherRecord, false);
  }

  // ==========================================================================
  // RENDERING WEATHER & AIR QUALITY
  // ==========================================================================

  function renderWeatherData(record, isCached = false) {
    const { city, forecast, airQuality } = record;
    const current = forecast.current;
    const daily = forecast.daily;

    // Header info
    elements.currentCityName.textContent = city.name || 'Unknown City';
    elements.currentCountryName.textContent = city.country || '';

    // Save City button state
    updateSaveButtonState();

    // Current temperature & condition
    const tempRounded = Math.round(current.temperature_2m);
    elements.currentTemp.textContent = `${tempRounded}°`;

    const weatherInfo = WMO_CODE_MAP[current.weather_code] || { label: 'Unknown', icon: '🌡️' };
    elements.currentWeatherIcon.textContent = weatherInfo.icon;
    elements.currentCondition.textContent = weatherInfo.label;

    const feelsLikeRounded = Math.round(current.apparent_temperature != null ? current.apparent_temperature : current.temperature_2m);
    elements.currentFeelsLike.textContent = `Feels like ${feelsLikeRounded}°C`;

    // Metrics: Humidity & Wind Speed
    elements.currentHumidity.textContent = `${Math.round(current.relative_humidity_2m)}%`;
    elements.currentWind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;

    // Air Quality Section
    const aqiDetails = calculateAirQuality(airQuality);
    elements.aqiBadge.textContent = aqiDetails.level;
    elements.aqiBadge.className = `aqi-badge ${aqiDetails.cssClass}`;
    elements.aqiValueText.textContent = aqiDetails.value;
    elements.aqiDescription.textContent = aqiDetails.desc;

    // Weather Tip
    const tipData = generateWeatherTip(
      current.temperature_2m,
      current.weather_code,
      current.wind_speed_10m,
      aqiDetails.level
    );
    elements.tipText.textContent = tipData.tip;

    // 5-Day Forecast
    renderForecast(daily);

    // Show weather content container
    elements.weatherContent.classList.remove('hidden');
  }

  function renderForecast(daily) {
    elements.forecastList.innerHTML = '';
    if (!daily || !daily.time) return;

    // Show 5 days (from index 0 to 4)
    const count = Math.min(5, daily.time.length);

    for (let i = 0; i < count; i++) {
      const dateStr = daily.time[i];
      const code = daily.weather_code[i];
      const maxTemp = Math.round(daily.temperature_2m_max[i]);
      const minTemp = Math.round(daily.temperature_2m_min[i]);
      const condition = WMO_CODE_MAP[code] || { label: 'Fair', icon: '🌤️' };

      const dateObj = new Date(dateStr + 'T00:00:00');
      let dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString(undefined, { weekday: 'short' });
      let formattedDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      const item = document.createElement('div');
      item.className = 'forecast-item';
      item.innerHTML = `
        <div class="forecast-date-col">
          <span class="forecast-day">${escapeHtml(dayName)}</span>
          <span class="forecast-date">${escapeHtml(formattedDate)}</span>
        </div>
        <div class="forecast-condition-col">
          <span class="forecast-icon" aria-hidden="true">${condition.icon}</span>
          <span class="forecast-condition-label">${escapeHtml(condition.label)}</span>
        </div>
        <div class="forecast-temp-col">
          <span class="temp-max" title="High Temperature"><span class="temp-tag">H</span> ${maxTemp}°</span>
          <span class="temp-min" title="Low Temperature"><span class="temp-tag">L</span> ${minTemp}°</span>
        </div>
      `;
      elements.forecastList.appendChild(item);
    }
  }

  function renderCachedWeather(cached, message) {
    currentCity = cached.city;
    renderWeatherData(cached, true);
    showCachedNotice(message);
  }

  // ==========================================================================
  // AIR QUALITY & WEATHER TIPS
  // ==========================================================================

  function calculateAirQuality(aqiData) {
    if (!aqiData || !aqiData.current) {
      return {
        level: 'Moderate',
        cssClass: 'aqi-moderate',
        value: 'AQI --',
        desc: 'Air quality data is currently unavailable for this region.'
      };
    }

    const { us_aqi, european_aqi } = aqiData.current;

    // Prefer US AQI if available (Standard 0-500 scale)
    if (us_aqi != null && !isNaN(us_aqi)) {
      const val = Math.round(us_aqi);
      if (val <= 50) {
        return {
          level: 'Good',
          cssClass: 'aqi-good',
          value: `AQI ${val}`,
          desc: 'Air quality is ideal. Enjoy outdoor activities.'
        };
      } else if (val <= 100) {
        return {
          level: 'Moderate',
          cssClass: 'aqi-moderate',
          value: `AQI ${val}`,
          desc: 'Air quality is acceptable; unusually sensitive individuals should take care.'
        };
      } else {
        return {
          level: 'Unhealthy',
          cssClass: 'aqi-unhealthy',
          value: `AQI ${val}`,
          desc: 'Air quality is poor. Sensitive groups and active adults should limit outdoor exertion.'
        };
      }
    }

    // Fallback to European AQI (0-100 scale)
    if (european_aqi != null && !isNaN(european_aqi)) {
      const val = Math.round(european_aqi);
      if (val <= 20) {
        return {
          level: 'Good',
          cssClass: 'aqi-good',
          value: `EAQI ${val}`,
          desc: 'Air quality is satisfactory and clean.'
        };
      } else if (val <= 50) {
        return {
          level: 'Moderate',
          cssClass: 'aqi-moderate',
          value: `EAQI ${val}`,
          desc: 'Moderate air pollution level.'
        };
      } else {
        return {
          level: 'Unhealthy',
          cssClass: 'aqi-unhealthy',
          value: `EAQI ${val}`,
          desc: 'Unhealthy air pollution level. Limit prolonged outdoor exposure.'
        };
      }
    }

    return {
      level: 'Good',
      cssClass: 'aqi-good',
      value: 'AQI --',
      desc: 'Air quality is within normal parameters.'
    };
  }

  function generateWeatherTip(temp, code, windSpeed, aqiLevel) {
    const rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
    const snowCodes = [71, 73, 75, 77, 85, 86];

    if (rainCodes.includes(code)) {
      return {
        icon: '☂️',
        tip: 'Carry an umbrella — rain or showers expected today.'
      };
    }

    if (snowCodes.includes(code)) {
      return {
        icon: '❄️',
        tip: 'Bundle up warmly and watch your step on slippery walkways.'
      };
    }

    if (aqiLevel === 'Unhealthy') {
      return {
        icon: '😷',
        tip: 'Air quality is unhealthy today — limit intense outdoor exercise.'
      };
    }

    if (temp >= 28) {
      return {
        icon: '🥤',
        tip: "Stay hydrated, it's hot today! Don't forget sunscreen and water."
      };
    }

    if (temp <= 4) {
      return {
        icon: '🧣',
        tip: "Bundle up warmly in thick layers — it's freezing outside!"
      };
    }

    if (windSpeed >= 32) {
      return {
        icon: '💨',
        tip: 'Hold on to your hat! Strong and gusty winds out there today.'
      };
    }

    if (temp >= 18 && temp < 28 && (code === 0 || code === 1 || code === 2)) {
      return {
        icon: '☀️',
        tip: 'Great weather today! Perfect day for a walk or outdoor activity.'
      };
    }

    if (temp < 15) {
      return {
        icon: '🧥',
        tip: 'A jacket or light coat is recommended for the cool air.'
      };
    }

    return {
      icon: '🌤️',
      tip: 'Mild conditions today — enjoy your day!'
    };
  }

  // ==========================================================================
  // SAVED CITIES MANAGEMENT (localStorage)
  // ==========================================================================

  function loadSavedCities() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SAVED_CITIES);
      savedCities = data ? JSON.parse(data) : [];
      if (!Array.isArray(savedCities)) savedCities = [];
    } catch (err) {
      console.error('Error reading saved cities from localStorage:', err);
      savedCities = [];
    }
  }

  function persistSavedCities() {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_CITIES, JSON.stringify(savedCities));
    } catch (err) {
      console.error('Error writing saved cities to localStorage:', err);
    }
  }

  function isCitySaved(city) {
    if (!city) return false;
    return savedCities.some(
      (c) =>
        c.name.toLowerCase() === city.name.toLowerCase() &&
        (c.country || '').toLowerCase() === (city.country || '').toLowerCase()
    );
  }

  function updateSaveButtonState() {
    if (!currentCity) {
      elements.btnSaveCurrent.classList.remove('is-saved');
      elements.saveBtnLabel.textContent = 'Save City';
      return;
    }

    const saved = isCitySaved(currentCity);
    if (saved) {
      elements.btnSaveCurrent.classList.add('is-saved');
      elements.saveBtnLabel.textContent = 'Saved';
      elements.btnSaveCurrent.setAttribute('title', 'City is saved in your list');
    } else {
      elements.btnSaveCurrent.classList.remove('is-saved');
      elements.saveBtnLabel.textContent = 'Save City';
      elements.btnSaveCurrent.setAttribute('title', 'Save this city to your list');
    }
  }

  function toggleSaveCurrentCity() {
    if (!currentCity) return;

    const existingIndex = savedCities.findIndex(
      (c) =>
        c.name.toLowerCase() === currentCity.name.toLowerCase() &&
        (c.country || '').toLowerCase() === (currentCity.country || '').toLowerCase()
    );

    if (existingIndex >= 0) {
      // Prompt confirmation before removing if clicked again
      openDeleteModal(existingIndex);
    } else {
      // Save new city with fields: City Name, Country, Date Saved
      const now = new Date();
      const formattedDate = now.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const newCity = {
        name: currentCity.name,
        country: currentCity.country || '',
        lat: currentCity.lat,
        lon: currentCity.lon,
        dateSaved: formattedDate
      };

      savedCities.unshift(newCity);
      persistSavedCities();
      renderSavedCities();
      updateSaveButtonState();
    }
  }

  function renderSavedCities() {
    // Update count at the top of the list
    elements.savedCitiesCount.textContent = savedCities.length;

    if (savedCities.length === 0) {
      elements.savedEmptyState.classList.remove('hidden');
      elements.savedCitiesList.classList.add('hidden');
      elements.savedCitiesList.innerHTML = '';
      return;
    }

    elements.savedEmptyState.classList.add('hidden');
    elements.savedCitiesList.classList.remove('hidden');
    elements.savedCitiesList.innerHTML = '';

    savedCities.forEach((city, index) => {
      const item = document.createElement('div');
      item.className = 'saved-city-item';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `View weather for ${city.name}, ${city.country}`);

      item.innerHTML = `
        <div class="saved-city-info">
          <span class="saved-city-name">${escapeHtml(city.name)}</span>
          <div class="saved-city-meta">
            <span class="saved-city-country">${escapeHtml(city.country || 'Unknown')}</span>
            <span>•</span>
            <span class="saved-city-date">Saved on ${escapeHtml(city.dateSaved || 'Recently')}</span>
          </div>
        </div>
        <button type="button" class="btn-delete-city" title="Delete ${escapeHtml(city.name)}" aria-label="Delete ${escapeHtml(city.name)}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;

      // Tap saved city to view weather
      item.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-city')) return;
        selectCity({
          name: city.name,
          country: city.country,
          lat: city.lat,
          lon: city.lon
        });
      });

      // Keyboard accessibility
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (!e.target.closest('.btn-delete-city')) {
            e.preventDefault();
            selectCity({
              name: city.name,
              country: city.country,
              lat: city.lat,
              lon: city.lon
            });
          }
        }
      });

      // Delete button triggers confirmation modal
      const deleteBtn = item.querySelector('.btn-delete-city');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteModal(index);
      });

      elements.savedCitiesList.appendChild(item);
    });
  }

  // ==========================================================================
  // CONFIRMATION MODAL FOR DELETION
  // ==========================================================================

  function openDeleteModal(index) {
    if (index == null || !savedCities[index]) return;
    pendingDeleteIndex = index;
    const city = savedCities[index];
    const locationStr = city.country ? `${city.name}, ${city.country}` : city.name;
    elements.modalMessage.textContent = `Are you sure you want to remove "${locationStr}" from your saved cities?`;
    elements.deleteModal.classList.remove('hidden');
    elements.btnCancelDelete.focus();
  }

  function closeDeleteModal() {
    pendingDeleteIndex = null;
    elements.deleteModal.classList.add('hidden');
  }

  function confirmDeleteCity() {
    if (pendingDeleteIndex != null && savedCities[pendingDeleteIndex]) {
      savedCities.splice(pendingDeleteIndex, 1);
      persistSavedCities();
      renderSavedCities();
      updateSaveButtonState();
    }
    closeDeleteModal();
  }

  // ==========================================================================
  // CACHING WEATHER DATA IN LOCALSTORAGE
  // ==========================================================================

  function saveLastWeather(data) {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_WEATHER, JSON.stringify(data));
    } catch (err) {
      console.warn('Could not save last weather to localStorage:', err);
    }
  }

  function getLastWeather() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAST_WEATHER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // UI STATUS & NOTICES HELPERS
  // ==========================================================================

  function updateNetworkStatus() {
    if (navigator.onLine) {
      elements.offlineBadge.classList.add('hidden');
    } else {
      elements.offlineBadge.classList.remove('hidden');
    }
  }

  function showLoading(text) {
    elements.loadingText.textContent = text || 'Loading...';
    elements.loadingSpinner.classList.remove('hidden');
  }

  function hideLoading() {
    elements.loadingSpinner.classList.add('hidden');
  }

  function showLocationNotice(message) {
    elements.locationNoticeText.textContent = message;
    elements.locationNotice.classList.remove('hidden');
  }

  function showCachedNotice(message) {
    elements.cachedNoticeText.textContent = message;
    elements.cachedNotice.classList.remove('hidden');
  }

  function showError(message) {
    elements.errorNoticeText.textContent = message;
    elements.errorNotice.classList.remove('hidden');
  }

  function hideError() {
    elements.errorNotice.classList.add('hidden');
  }

  function hideNotice(el) {
    if (el) el.classList.add('hidden');
  }

  function formatTimestamp(ts) {
    if (!ts) return 'recently';
    const date = new Date(ts);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

