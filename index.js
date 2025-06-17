const express = require("express");
require("dotenv").config();
const fetch = require("node-fetch"); // Use v2 for CommonJS

const PORT = 3000;
const app = express();
const API_KEY = process.env.OPENWEATHER_API_KEY;

app.set("view engine", "ejs");
app.use(express.static("public"));

// Home page with input form
app.get("/", (req, res) => {
	const error = req.query.error;
	const previousInput = req.query.city || "";
	res.render("index", { error, previousInput });
});

// Main weather-checking route
app.get("/check-weather", async (req, res) => {
	const city = req.query.city;

	if (!city) {
		return res.status(400).send("City name is required");
	}

	try {
		// Step 1: Geocode city to lat/lon
		const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
			city
		)}&limit=1&appid=${API_KEY}`;
		const geoRes = await fetch(geoUrl);
		const geoData = await geoRes.json();

		if (
			!geoData.length ||
			geoData[0].name.toLowerCase() !== city.trim().toLowerCase()
		) {
			return res.redirect(
				`/?error=City not found. Please try again.&city=${encodeURIComponent(
					city
				)}`
			);
		}

		const { lat, lon } = geoData[0];

		// Step 2: Get 5-day 3-hour forecast
		const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
		const forecastRes = await fetch(forecastUrl);
		const forecastData = await forecastRes.json();

		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setDate(now.getDate() + 1);
		const tomorrowDateString = tomorrow.toISOString().split("T")[0]; // e.g. "2025-06-18"

		// Step 3: Filter forecasts for tomorrow and check for rain
		const forecastsForTomorrow = forecastData.list.filter((entry) =>
			entry.dt_txt.startsWith(tomorrowDateString)
		);

		const willRain = forecastsForTomorrow.some(
			(entry) => entry.rain && entry.rain["3h"] > 0
		);

		// Step 4: Render result
		res.render("weather", { city, willRain });
	} catch (err) {
		console.error("Error checking weather:", err);
		res.status(500).send("Server error");
	}
});

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
