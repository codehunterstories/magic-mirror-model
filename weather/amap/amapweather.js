/* global WeatherProvider, WeatherObject */

/* MagicMirror
 * Module: Weather
 *
 * 高德地图-天气预报 API
 * By Aaron https://github.com/codehunterstories/magic-mirror-model/tree/main/weather/amap
 * MIT Licensed.
 *
 * This class is the blueprint for a weather provider.
 */
WeatherProvider.register("amapweather", {
	// Set the name of the provider.
	// This isn't strictly necessary, since it will fallback to the provider identifier
	// But for debugging (and future alerts) it would be nice to have the real name.
	providerName: "AMap Weather",

	// Set the default config properties that is specific to this provider
	// 
	// key, 请求服务权限标识, 用户在高德地图官网申请web服务API类型KEY, 必填
	// city, 城市编码, 输入城市的adcode，adcode信息可参考城市编码表(https://lbs.amap.com/api/webservice/download), 必填
	// extensions, 气象类型, 可选值：base/all， base:返回实况天气， all:返回预报天气， 可选
	// output, 返回格式, 可选值：JSON，XML, 可选
	// 
	// 返回结果参数说明
	// 实况天气每小时更新多次，预报天气每天更新3次，分别在8、11、18点左右更新。
	// 由于天气数据的特殊性以及数据更新的持续性，无法确定精确的更新时间，请以接口返回数据的reporttime字段为准。
	defaults: {
		api: "https://restapi.amap.com/v3/weather/weatherInfo",
		city: "440100", // 默认广州
		extensions: "base",
		output: "JSON",
		key: "",
		useCorsProxy: true
	},

	// Overwrite the fetchCurrentWeather method.
	fetchCurrentWeather() {
		this.fetchData(this.getUrl())
			.then((data) => {
				let currentWeather;
				let location;
				if (data && data.status === '1') {
					const live = data.lives[0];
					currentWeather = this.generateWeatherObjectFromCurrent(live);
					location = `${live.province}, ${live.city}`;
				}
				this.setCurrentWeather(currentWeather);
				this.setFetchedLocation(location);
			})
			.catch(function (request) {
				Log.error("Could not load data ... ", request);
			})
			.finally(() => this.updateAvailable());
	},

	// Overwrite the fetchWeatherForecast method.
	fetchWeatherForecast() {
		this.fetchData(this.getUrl())
			.then((data) => {
				let forecasts;
				let location;
				if (data && data.status === '1') {
					const forecast = data.forecasts[0]
					forecasts = this.generateWeatherObjectsFromForecast(forecast.casts);
					location = `(${forecast.reporttime}发布)`;
				}
				this.setWeatherForecast(forecasts);
				this.setFetchedLocation(location);
			})
			.catch(function (request) {
				Log.error("Could not load data ... ", request);
			})
			.finally(() => this.updateAvailable());
	},

	/*
	 * Generate a WeatherObject based on currentWeatherInformation
	 */
	generateWeatherObjectFromCurrent(live) {
		const weatherData = new WeatherObject();

		weatherData.humidity = live.humidity_float;
		weatherData.temperature = live.temperature_float;
		weatherData.windSpeed = this.convertWindSpeed(live.windpower);
		weatherData.windFromDirection = this.convertWindDirection(live.winddirection);
		weatherData.weatherType = this.convertWeatherType(live.weather);
		weatherData.sunrise = moment(live.reporttime);
		weatherData.sunset = moment(live.reporttime);

		return weatherData;
	},

	/*
	 * Generate WeatherObjects based on casts information
	 */
	generateWeatherObjectsFromForecast(casts) {
		// initial variable declaration
		const days = [];
		let date = new Date();

		for (const cast of casts) {
			const weather = new WeatherObject();

			weather.date = moment(cast.date, "YYYY-MM-DD");
			weather.minTemperature = cast.nighttemp_float;
			weather.maxTemperature = cast.daytemp_float;
			if (date.getHours() >= 6 && date.getHours() <= 18) {
				weather.weatherType = this.convertWeatherType(cast.dayweather);
				weather.windSpeed = this.convertWindSpeed(cast.daypower);
				weather.windFromDirection = this.convertWindDirection(cast.daywind);
			} else {
				weather.weatherType = this.convertWeatherType(cast.nightweather);
				weather.windSpeed = this.convertWindSpeed(cast.nightpower);
				weather.windFromDirection = this.convertWindDirection(cast.nightwind);
			}

			days.push(weather);
		}

		return days;
	},

	/** Amap Weather Specific Methods - These are not part of the default provider methods */

	// 转换风速
	convertWindSpeed(windpower) {
		if (windpower === "≤3" || windpower === "1-3") {
			return "3"
		}
		return windpower;
	},

	// 转换风向，参考 WeatherUtils
	convertWindDirection(direction) {
		const windCardinals = {
			"北": 0,
			"东北": 45,
			"东": 90,
			"东南": 135,
			"南": 180,
			"西南": 225,
			"西": 270,
			"西北": 315
		};

		return windCardinals.hasOwnProperty(direction) ? windCardinals[direction] : null;
	},

	// 转换天气图标
	convertWeatherType(weatherType) {
		const weatherTypes = {
			"晴": "day-sunny",
			"少云": "cloudy-windy",
			"晴间多云": "cloudy-gusts",
			"多云": "cloudy",
			"阴": "day-sunny-overcast",
			"有风": "windy",
			"平静": "windy",
			"微风": "day-light-wind",
			"和风": "day-light-wind",
			"清风": "day-light-wind",
			"强风/劲风": "strong-wind",
			"疾风": "strong-wind",
			"大风": "strong-wind",
			"烈风": "strong-wind",
			"风暴": "strong-wind",
			"狂爆风": "strong-wind",
			"飓风": "hurricane",
			"热带风暴": "hurricane",
			"霾": "day-haze",
			"中度霾": "day-haze",
			"重度霾": "day-haze",
			"严重霾": "day-haze",
			"阵雨": "showers",
			"雷阵雨": "thunderstorm",
			"雷阵雨并伴有冰雹": "hail",
			"小雨": "sprinkle",
			"中雨": "rain",
			"大雨": "rain",
			"暴雨": "rain",
			"大暴雨": "storm-showers",
			"特大暴雨": "storm-showers",
			"强阵雨": "storm-showers",
			"强雷阵雨": "day-thunderstorm",
			"极端降雨": "day-thunderstorm",
			"毛毛雨/细雨": "raindrops",
			"雨": "rain",
			"小雨-中雨": "rain",
			"中雨-大雨": "rain",
			"大雨-暴雨": "storm-showers",
			"暴雨-大暴雨": "storm-showers",
			"大暴雨-特大暴雨": "storm-showers",
			"雨雪天气": "sleet",
			"雨夹雪": "sleet",
			"阵雨夹雪": "sleet",
			"冻雨": "sleet",
			"雪": "snow",
			"阵雪": "snow",
			"小雪": "snow",
			"中雪": "snow",
			"大雪": "snow",
			"暴雪": "snow",
			"小雪-中雪": "snow",
			"中雪-大雪": "snow",
			"大雪-暴雪": "snow",
			"浮尘": "dust",
			"扬沙": "dust",
			"沙尘暴": "sandstorm",
			"强沙尘暴": "sandstorm",
			"龙卷风": "tornado",
			"雾": "fog",
			"浓雾": "smoke",
			"强浓雾": "smoke",
			"轻雾": "fog",
			"大雾": "smoke",
			"特强浓雾": "smoke",
			"热": "hot",
			"冷": "snowflake-cold",
			"未知": "alien"
		};

		return weatherTypes.hasOwnProperty(weatherType) ? weatherTypes[weatherType] : null;
	},

	/*
	 * Gets the complete url for the request
	 */
	getUrl() {
		return this.config.api + this.getParams();
	},

	/* getParams(compliments)
	 * Generates an url with api parameters based on the config.
	 *
	 * return String - URL params.
	 */
	getParams() {
		let params = "?";

		params += `key=${this.config.key}`;
		params += `&city=${this.config.city}`;
		params += `&extensions=${this.config.extensions}`;
		params += `&output=${this.config.output}`;

		return params;
	}
});
