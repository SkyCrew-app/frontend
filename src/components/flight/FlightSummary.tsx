import { Plane, Clock, Calendar } from 'lucide-react'

interface FlightSummaryProps {
  departure: string;
  arrival: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  flightNumber: string;
  departureWeather?: { temperature: number; conditions: string };
  arrivalWeather?: { temperature: number; conditions: string };
}

export function FlightSummary({
  departure,
  arrival,
  date,
  departureTime,
  arrivalTime,
  duration,
  flightNumber,
  departureWeather,
  arrivalWeather
}: FlightSummaryProps) {
  return (
    <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{flightNumber}</h2>
        <Plane className="h-8 w-8" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm opacity-75">Départ</p>
          <p className="font-semibold">{departure}</p>
          <p className="text-sm">{departureTime}</p>
          {departureWeather && (
            <p className="text-sm">{departureWeather.temperature}°C, {departureWeather.conditions}</p>
          )}
        </div>
        <div>
          <p className="text-sm opacity-75">Arrivée</p>
          <p className="font-semibold">{arrival}</p>
          <p className="text-sm">{arrivalTime}</p>
          {arrivalWeather && (
            <p className="text-sm">{arrivalWeather.temperature}°C, {arrivalWeather.conditions}</p>
          )}
        </div>
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          <p>{date}</p>
        </div>
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          <p>{duration}</p>
        </div>
      </div>
    </div>
  )
}

