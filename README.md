# WEAQUA 🌊☀️

WEAQUA is a lightweight, responsive Weather and Air Quality web application built strictly with vanilla **HTML5**, **CSS3**, and **JavaScript**. It has zero server-side dependencies, no backend, no database, and requires no API keys.

Weather and atmospheric data are powered by the free, open **[Open-Meteo](https://open-meteo.com/)** APIs:
- **Forecast API**: Current temperature, humidity, wind speed, weather condition, and 5-day daily forecast.
- **Air Quality API**: US AQI & European AQI levels with color-coded safety badges.
- **Geocoding API**: Instant search and autocomplete for worldwide cities.

---

## ✨ Features

- 📍 **Auto-Location on Launch**: Automatically detects current location to display immediate weather. If location permission is blocked, it displays a friendly prompt to search manually.
- 🌡️ **Current Weather & Metrics**: Temperature, condition description, weather icon, "feels like" temperature, humidity percentage, and wind speed.
- 📅 **5-Day Forecast**: High and low temperatures for each of the upcoming 5 days with condition icons and weekday names.
- 🍃 **Air Quality Levels (AQI)**: Clear status indicators (**Good**, **Moderate**, **Unhealthy**) with matching color-coded badges and advice.
- 💡 **Smart Weather Tips**: Contextual recommendations (e.g., *"Carry an umbrella"*, *"Stay hydrated, it's hot today"*, *"Bundle up warmly in thick layers"*, *"Air quality is unhealthy today"*).
- 🔍 **City Search & Autocomplete**: Search for any city by name with real-time dropdown suggestions.
- 💾 **Saved Cities (`localStorage`)**:
  - Save any city with **City Name**, **Country**, and **Date Saved**.
  - Total saved count displayed at the top (`Saved Cities (N)`).
  - One-tap quick access to switch between favorite cities.
  - Safe removal with a delete confirmation modal.
  - Friendly empty state when no cities are saved.
- 📴 **Offline Support & Cache**: Saved cities and last fetched weather results persist in `localStorage`. If offline or when internet drops, WEAQUA displays the cached weather along with a note showing when it was last updated.
- 📱 **Mobile-First & Clean Design**: Fluid responsive design that works seamlessly on phone screens, tablets, and desktops.

---

## 🚀 Getting Started

No build tools, bundlers, or servers are needed.

1. Clone or download this repository.
2. Open `index.html` in your web browser:
   ```bash
   # Or simply double-click index.html in your file explorer
   ```

---

## 📁 Project Structure

```text
weaqua/
├── index.html     # Semantic structure & accessible layout
├── style.css      # Mobile-first styles, themes, and animations
├── script.js      # Open-Meteo API integrations, UI state, and localStorage
└── README.md      # Project overview and documentation
```

---

## 📜 License

MIT License. Free to use, modify, and distribute.
