"use client"

import { useEffect, useRef, useState } from "react"

interface RouteMapProps {
  currentStepIndex: number
  totalSteps: number
}

export function RouteMap({ currentStepIndex, totalSteps }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Load Leaflet CSS and JS dynamically
    const loadLeaflet = async () => {
      if (typeof window === "undefined") return

      // Load CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link")
        link.id = "leaflet-css"
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }

      // Load JS
      if (!(window as any).L) {
        const script = document.createElement("script")
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        script.onload = () => setIsLoaded(true)
        document.head.appendChild(script)
      } else {
        setIsLoaded(true)
      }
    }

    loadLeaflet()
  }, [])

  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return

    const L = (window as any).L
    if (!L) return

    // Initialize map centered on Singapore
    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView([1.3521, 103.8198], 15)

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    // Add zoom control to bottom right
    L.control
      .zoom({
        position: "bottomright",
      })
      .addTo(map)

    mapInstanceRef.current = map

    // Demo route waypoints in Singapore (adjust coordinates as needed)
    const waypoints = [
      [1.3521, 103.8198], // Start
      [1.3541, 103.8198], // North
      [1.3541, 103.8218], // East
      [1.3561, 103.8218], // North
      [1.3561, 103.8248], // East
      [1.3571, 103.8248], // Destination
    ]

    // Draw route line
    const completedPath = L.polyline(waypoints, {
      color: "#d1d5db",
      weight: 8,
      opacity: 0.8,
      smoothFactor: 1,
    }).addTo(map)

    // Fit map to show entire route
    map.fitBounds(completedPath.getBounds(), { padding: [80, 80] })

    // Add start marker
    const startIcon = L.divIcon({
      html: '<div style="background-color: #3b82f6; width: 32px; height: 32px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })
    const startMarker = L.marker(waypoints[0], { icon: startIcon }).addTo(map)
    markersRef.current.push(startMarker)

    // Add destination marker
    const destIcon = L.divIcon({
      html: '<div style="background-color: #ef4444; width: 40px; height: 40px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
      className: "",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    })
    const destMarker = L.marker(waypoints[waypoints.length - 1], { icon: destIcon }).addTo(map)
    markersRef.current.push(destMarker)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isLoaded])

  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return

    const L = (window as any).L
    if (!L) return

    // Demo route waypoints
    const waypoints = [
      [1.3521, 103.8198], // Start
      [1.3541, 103.8198], // North
      [1.3541, 103.8218], // East
      [1.3561, 103.8218], // North
      [1.3561, 103.8248], // East
      [1.3571, 103.8248], // Destination
    ]

    // Calculate current position
    const progressPercentage = currentStepIndex / (totalSteps - 1)
    const totalSegments = waypoints.length - 1
    const currentSegment = Math.min(Math.floor(progressPercentage * totalSegments), totalSegments - 1)
    const segmentProgress = (progressPercentage * totalSegments) % 1

    const start = waypoints[currentSegment]
    const end = waypoints[currentSegment + 1]
    const currentLat = start[0] + (end[0] - start[0]) * segmentProgress
    const currentLng = start[1] + (end[1] - start[1]) * segmentProgress

    // Remove old current position marker
    const oldMarker = markersRef.current.find((m) => m.options.title === "current")
    if (oldMarker) {
      mapInstanceRef.current.removeLayer(oldMarker)
      markersRef.current = markersRef.current.filter((m) => m.options.title !== "current")
    }

    // Remove old completed route
    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.Polyline && layer.options.color === "#22c55e") {
        mapInstanceRef.current.removeLayer(layer)
      }
    })

    // Draw completed portion of route
    const completedWaypoints = waypoints.slice(0, currentSegment + 1)
    completedWaypoints.push([currentLat, currentLng])
    if (completedWaypoints.length > 1) {
      L.polyline(completedWaypoints, {
        color: "#22c55e",
        weight: 8,
        opacity: 0.9,
        smoothFactor: 1,
      }).addTo(mapInstanceRef.current)
    }

    // Add current position marker with person icon
    const currentIcon = L.divIcon({
      html: `<div style="background-color: #f97316; width: 56px; height: 56px; border-radius: 50%; border: 6px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>`,
      className: "",
      iconSize: [56, 56],
      iconAnchor: [28, 28],
    })

    const currentMarker = L.marker([currentLat, currentLng], {
      icon: currentIcon,
      title: "current",
    }).addTo(mapInstanceRef.current)
    markersRef.current.push(currentMarker)
  }, [currentStepIndex, totalSteps, isLoaded])

  return (
    <div className="relative w-full h-full bg-muted rounded-3xl overflow-hidden shadow-2xl border-4 border-border">
      <div ref={mapRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-card/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg border-2 border-border z-[1000]">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white" />
            <span className="text-xl font-semibold">Start</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent border-2 border-white" />
            <span className="text-xl font-semibold">You</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500 border-2 border-white" />
            <span className="text-xl font-semibold">Destination</span>
          </div>
        </div>
      </div>

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-2xl font-semibold text-muted-foreground">Loading map...</div>
        </div>
      )}
    </div>
  )
}
