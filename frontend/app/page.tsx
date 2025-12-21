"use client"

import { useState } from "react"
import { NavigationDisplay } from "@/components/navigation-display"
import { DestinationInput } from "@/components/destination-input"

interface Coordinates {
  lat: number
  lng: number
}

export default function Home() {
  const [destination, setDestination] = useState("")
  const [destinationCoords, setDestinationCoords] = useState<Coordinates | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  const handleStartNavigation = (dest: string, coordinates: Coordinates) => {
    setDestination(dest)
    setDestinationCoords(coordinates)
    setIsNavigating(true)
  }

  const handleStopNavigation = () => {
    setIsNavigating(false)
    setDestination("")
    setDestinationCoords(null)
  }

  return (
    <main className="min-h-screen bg-background">
      {!isNavigating ? (
        <DestinationInput onStart={handleStartNavigation} />
      ) : (
        <NavigationDisplay 
          destination={destination} 
          destinationCoords={destinationCoords}
          onStop={handleStopNavigation} 
        />
      )}
    </main>
  )
}
