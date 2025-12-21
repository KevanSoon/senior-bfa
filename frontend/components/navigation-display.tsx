"use client"

import { useState, useEffect, useCallback } from "react"
import { DirectionIcon } from "@/components/direction-icon"
import { RouteMap } from "@/components/route-map"
import { Button } from "@/components/ui/button"
import { X, Volume2, VolumeX } from "lucide-react"

// Type definitions for navigation directions
type Direction = "straight" | "left" | "right" | "arrived"

// Step interface for navigation instructions
interface Step {
  direction: Direction
  instruction: string
  distance: string
}

// Props interface for NavigationDisplay component
interface NavigationDisplayProps {
  destination: string
  destinationCoords: { lat: number; lng: number } | null
  onStop: () => void
}

// Interface for OneMap route data structure
interface RouteData {
  legs: Array<{
    mode: string
    duration: number
    distance: number
    legGeometry: {
      points: string  // Encoded polyline string
    }
    from: { lat: number; lon: number }
    to: { lat: number; lon: number }
  }>
}

export function NavigationDisplay({ destination, destinationCoords, onStop }: NavigationDisplayProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(true)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null)
  
  // State to store the route data from OneMap API
  // This will be passed to RouteMap for rendering the route on the map
  const [routeData, setRouteData] = useState<RouteData | null>(null)

  // Demo navigation steps - in a real app, this would come from a navigation API
  const steps: Step[] = [
    { direction: "straight", instruction: "Walk straight ahead", distance: "50 meters" },
    { direction: "right", instruction: "Turn right at the junction", distance: "100 meters" },
    { direction: "straight", instruction: "Continue walking straight", distance: "200 meters" },
    { direction: "left", instruction: "Turn left at the traffic light", distance: "150 meters" },
    { direction: "straight", instruction: "Walk straight to your destination", distance: "80 meters" },
    { direction: "arrived", instruction: "You have arrived at your destination", distance: "0 meters" },
  ]

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setStartCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting location:", error)
          // Fallback to default location (Singapore)
          setStartCoords({ lat: 1.3580523, lng: 103.7370989 })
        }
      )
    } else {
      // Fallback to default location
      setStartCoords({ lat: 1.3580523, lng: 103.7370989 })
    }
  }, [])

  /**
   * Fetch route data from OneMap API when we have both start and destination coordinates
   * The API returns itineraries with legs, each containing:
   * - legGeometry.points: encoded polyline string for the route segment
   * - mode: transport mode (WALK, BUS, etc.)
   * - duration/distance: trip metrics
   * - from/to: start and end coordinates
   */
  useEffect(() => {
    if (!startCoords || !destinationCoords) return

    const params = new URLSearchParams({
      startLat: startCoords.lat.toString(),
      startLng: startCoords.lng.toString(),
      endLat: destinationCoords.lat.toString(),
      endLng: destinationCoords.lng.toString(),
    })

    fetch(`/api/onemap?${params}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`API responded with status: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        // Check if the response has the expected structure
        if (!data?.plan?.itineraries?.[0]) {
          console.error("Invalid API response structure:", data)
          return
        }
        
        // Extract the first itinerary and set it as route data
        // This will be passed to RouteMap to draw the route
        const itinerary = data.plan.itineraries[0]
        setRouteData(itinerary)
      })
      .catch((error) => {
        console.error("Error fetching OneMap data:", error)
      })
  }, [startCoords, destinationCoords])


  const currentStep = steps[currentStepIndex]

  // Check if speech synthesis is supported
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSpeechSupported(true)
    }
  }, [])

  // Text-to-speech function
  const speak = useCallback(
    (text: string) => {
      if (!speechSupported || !isSpeaking) return

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8 // Slower speech for seniors
      utterance.pitch = 1
      utterance.volume = 1
      utterance.lang = "en-SG" // Singapore English

      window.speechSynthesis.speak(utterance)
    },
    [speechSupported, isSpeaking],
  )

  // Announce instruction when step changes
  useEffect(() => {
    if (currentStep) {
      speak(`${currentStep.instruction}. ${currentStep.distance}`)
    }
  }, [currentStepIndex, currentStep, speak])

  // Auto-advance to next step (demo purpose)
  useEffect(() => {
    if (currentStepIndex < steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1)
      }, 6000) // 6 seconds per step

      return () => clearTimeout(timer)
    }
  }, [currentStepIndex, steps.length])

  const handleManualNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    }
  }

  const handleManualPrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }

  const toggleSpeech = () => {
    setIsSpeaking((prev) => !prev)
    if (isSpeaking) {
      window.speechSynthesis.cancel()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b-4 border-border p-6 shadow-lg">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <div className="flex-1">
            <p className="text-2xl md:text-3xl text-muted-foreground font-medium mb-2">Going to:</p>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground text-balance">{destination}</h1>
          </div>
          <div className="flex gap-4">
            {speechSupported && (
              <Button onClick={toggleSpeech} size="lg" variant="outline" className="h-20 w-20 bg-transparent">
                {isSpeaking ? <Volume2 className="h-10 w-10" /> : <VolumeX className="h-10 w-10" />}
              </Button>
            )}
            <Button onClick={onStop} size="lg" variant="destructive" className="h-20 w-20">
              <X className="h-10 w-10" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Direction Display */}
      <div className="flex-1 flex flex-col lg:flex-row gap-8 p-8 max-w-[1800px] mx-auto w-full">
        {/* Map Section - Left Side */}
        <div className="flex-1 min-h-[400px] lg:min-h-0">
          {/* 
            RouteMap receives the full route data from OneMap API
            It will decode the legGeometry points and draw the route on the map
            The map will automatically zoom to fit the entire route
          */}
          <RouteMap routeData={routeData} />
        </div>

        {/* Direction Display - Right Side */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-3xl space-y-8">
            {/* Direction Icon */}
            <div className="flex justify-center">
              <DirectionIcon direction={currentStep.direction} />
            </div>

            {/* Instruction Text */}
            <div className="text-center space-y-4">
              <p className="text-4xl md:text-6xl font-bold text-foreground text-balance leading-tight">
                {currentStep.instruction}
              </p>
              <p className="text-3xl md:text-4xl text-accent font-semibold">{currentStep.distance}</p>
            </div>

            {/* Progress Indicator */}
            <div className="space-y-4">
              <div className="flex justify-center gap-3">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-5 rounded-full transition-all ${
                      index === currentStepIndex
                        ? "w-16 bg-primary"
                        : index < currentStepIndex
                          ? "w-5 bg-primary/50"
                          : "w-5 bg-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-center text-2xl text-muted-foreground font-medium">
                Step {currentStepIndex + 1} of {steps.length}
              </p>
            </div>

            {/* Navigation Controls */}
            <div className="grid grid-cols-2 gap-6 pt-6">
              <Button
                onClick={handleManualPrevious}
                size="lg"
                variant="outline"
                disabled={currentStepIndex === 0}
                className="h-20 text-2xl font-bold bg-transparent"
              >
                Previous
              </Button>
              <Button
                onClick={handleManualNext}
                size="lg"
                disabled={currentStepIndex === steps.length - 1}
                className="h-20 text-2xl font-bold"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
