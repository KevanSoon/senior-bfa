"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin } from "lucide-react"

interface DestinationInputProps {
  onStart: (destination: string) => void
}

export function DestinationInput({ onStart }: DestinationInputProps) {
  const [destination, setDestination] = useState("")

  // Common Singapore destinations for seniors
  const commonDestinations = [
    "Neighbourhood Clinic",
    "Hawker Centre",
    "Community Centre",
    "Market",
    "Bus Stop",
    "MRT Station",
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (destination.trim()) {
      onStart(destination)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center">
              <MapPin className="w-16 h-16 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground text-balance">Where do you want to go?</h1>
          <p className="text-2xl md:text-3xl text-muted-foreground">Enter your destination below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Type destination here..."
            className="h-20 text-3xl px-6 text-center"
          />
          <Button type="submit" size="lg" className="w-full h-24 text-4xl font-bold" disabled={!destination.trim()}>
            Start Navigation
          </Button>
        </form>

        <div className="space-y-4">
          <p className="text-2xl text-center text-muted-foreground font-medium">Quick Select:</p>
          <div className="grid grid-cols-2 gap-4">
            {commonDestinations.map((dest) => (
              <Button
                key={dest}
                variant="outline"
                size="lg"
                onClick={() => onStart(dest)}
                className="h-20 text-2xl font-medium"
              >
                {dest}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
