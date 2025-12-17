"use client"

import { useState, useEffect } from "react"
import { NavigationDisplay } from "@/components/navigation-display"
import { DestinationInput } from "@/components/destination-input"

export default function Home() {
  const [destination, setDestination] = useState("")
  const [isNavigating, setIsNavigating] = useState(false)

  const handleStartNavigation = (dest: string) => {
    setDestination(dest)
    setIsNavigating(true)
  }

  const handleStopNavigation = () => {
    setIsNavigating(false)
    setDestination("")
  }


  useEffect(() => {
    fetch("/api/onemap/")
      .then((res) => res.json())
      .then((data) => console.log(data))
      .catch(console.error);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {!isNavigating ? (
        <DestinationInput onStart={handleStartNavigation} />
      ) : (
        <NavigationDisplay destination={destination} onStop={handleStopNavigation} />
      )}
    </main>
  )
}
