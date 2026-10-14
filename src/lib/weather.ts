import { currentLanguage } from "@/lib/i18n";

const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY;

// The description ("ciel couvert") comes in the language of the interface.
export async function getWeather(lat: number, lon: number) {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=${currentLanguage()}&appid=${API_KEY}`,
  );
  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }
  return response.json();
}

