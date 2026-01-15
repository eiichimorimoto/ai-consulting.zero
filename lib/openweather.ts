// OpenWeatherMap API ユーティリティ

export interface OpenWeatherResponse {
  coord: { lon: number; lat: number }
  weather: Array<{
    id: number
    main: string
    description: string
    icon: string
  }>
  main: {
    temp: number
    feels_like: number
    temp_min: number
    temp_max: number
    pressure: number
    humidity: number
  }
  wind: { speed: number; deg: number }
  clouds: { all: number }
  dt: number
  sys: {
    country: string
    sunrise: number
    sunset: number
  }
  name: string
}

export interface OpenWeatherForecastResponse {
  list: Array<{
    dt: number
    main: {
      temp: number
      temp_min: number
      temp_max: number
      humidity: number
    }
    weather: Array<{
      id: number
      main: string
      description: string
      icon: string
    }>
    pop: number // 降水確率 (0-1)
    dt_txt: string
  }>
}

/**
 * OpenWeatherMap APIから現在の天気を取得
 */
export async function getCurrentWeather(lat: number, lon: number): Promise<OpenWeatherResponse | null> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY?.trim()
  
  if (!apiKey) {
    console.error('❌ OPENWEATHERMAP_API_KEY が設定されていません')
    return null
  }
  
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&lang=ja&units=metric`
  
  try {
    console.log(`🌤️ OpenWeatherMap API: 現在の天気取得中... (lat=${lat}, lon=${lon})`)
    const response = await fetch(url, { cache: 'no-store' }) // キャッシュ無効化（リアルタイムデータ取得）
    
    if (!response.ok) {
      console.error(`❌ OpenWeatherMap API エラー: ${response.status} ${response.statusText}`)
      return null
    }
    
    const data: OpenWeatherResponse = await response.json()
    console.log(`✅ 現在の気温: ${data.main.temp}°C, 天気: ${data.weather[0].description}`)
    return data
  } catch (error) {
    console.error('❌ OpenWeatherMap API 通信エラー:', error)
    return null
  }
}

/**
 * OpenWeatherMap APIから5日間予報を取得
 */
export async function get5DayForecast(lat: number, lon: number): Promise<OpenWeatherForecastResponse | null> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY?.trim()
  
  if (!apiKey) {
    console.error('❌ OPENWEATHERMAP_API_KEY が設定されていません')
    return null
  }
  
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&lang=ja&units=metric`
  
  try {
    console.log(`🌤️ OpenWeatherMap API: 5日間予報取得中... (lat=${lat}, lon=${lon})`)
    const response = await fetch(url, { cache: 'no-store' }) // キャッシュ無効化（リアルタイムデータ取得）
    
    if (!response.ok) {
      console.error(`❌ OpenWeatherMap API エラー: ${response.status} ${response.statusText}`)
      return null
    }
    
    const data: OpenWeatherForecastResponse = await response.json()
    console.log(`✅ 5日間予報取得成功: ${data.list.length}件のデータ`)
    return data
  } catch (error) {
    console.error('❌ OpenWeatherMap API 通信エラー:', error)
    return null
  }
}

/**
 * OpenWeatherMapの天気アイコンIDから絵文字に変換
 */
export function weatherIconToEmoji(iconCode: string): string {
  const iconMap: Record<string, string> = {
    '01d': '☀️', // clear sky day
    '01n': '🌙', // clear sky night
    '02d': '🌤️', // few clouds day
    '02n': '☁️', // few clouds night
    '03d': '☁️', // scattered clouds
    '03n': '☁️',
    '04d': '☁️', // broken clouds
    '04n': '☁️',
    '09d': '🌧️', // shower rain
    '09n': '🌧️',
    '10d': '🌦️', // rain day
    '10n': '🌧️', // rain night
    '11d': '⛈️', // thunderstorm
    '11n': '⛈️',
    '13d': '❄️', // snow
    '13n': '❄️',
    '50d': '🌫️', // mist
    '50n': '🌫️',
  }
  
  return iconMap[iconCode] || '☀️'
}

/**
 * 天気の説明から配送への影響を判定
 */
export function getDeliveryImpact(weatherMain: string, pop: number): string {
  if (weatherMain === 'Thunderstorm') {
    return '⚠️ 雷雨 / 配送遅延の可能性'
  }
  if (weatherMain === 'Snow') {
    return '❄️ 降雪 / 配送遅延の可能性'
  }
  if (weatherMain === 'Rain' && pop >= 0.8) {
    return `🌧️ 大雨の可能性（降水確率${Math.round(pop * 100)}%）/ 配送遅延の可能性`
  }
  if (weatherMain === 'Rain' || pop >= 0.5) {
    return `曇りまたは雨（降水確率${Math.round(pop * 100)}%）/ 配送注意`
  }
  if (pop >= 0.3) {
    return `晴れ時々曇り（降水確率${Math.round(pop * 100)}%）/ 影響なし`
  }
  
  return '晴れ / 配送影響なし'
}
