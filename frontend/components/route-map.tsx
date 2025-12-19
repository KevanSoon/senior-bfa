"use client"

import { useEffect, useRef, useState } from "react"
import polyline from "@mapbox/polyline"

/**
 * Interface for route leg structure from OneMap API
 * Each leg represents a segment of the journey (walking, bus, etc.)
 */
interface RouteLeg {
  mode: string                    // Transport mode: "WALK", "BUS", etc.
  duration: number                // Duration in seconds
  distance: number                // Distance in meters
  legGeometry: {
    points: string                // Encoded polyline string (Google format)
  }
  from: { lat: number; lon: number }  // Start coordinate of this leg
  to: { lat: number; lon: number }    // End coordinate of this leg
}

/**
 * Interface for the complete route data
 * Contains all legs of the journey
 */
interface RouteData {
  legs: RouteLeg[]
}

/**
 * Props for RouteMap component
 * routeData can be null while loading from API
 */
interface RouteMapProps {
  routeData: RouteData | null
}

/**
 * RouteMap Component
 * 
 * Displays an interactive map with the route drawn as thick, solid lines.
 * Designed for senior-friendly visibility with:
 * - Bold, easy-to-see route lines (10px thick)
 * - Clear color coding: Green for walking, Blue for transit
 * - Large, distinct markers for Start (green) and Destination (red)
 * - Auto-zooms to fit the entire route
 */
export function RouteMap({ routeData }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  /* --------------------------------------------------
     Load Leaflet library via CDN
     This runs once on component mount
  -------------------------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return

    // Inject Leaflet CSS if not already present
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }

    // Load Leaflet JS if not already loaded
    if (!(window as any).L) {
      const script = document.createElement("script")
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      script.onload = () => setIsLoaded(true)
      document.head.appendChild(script)
    } else {
      setIsLoaded(true)
    }
  }, [])

  /* --------------------------------------------------
     Initialize Map and Draw Route
     Runs when Leaflet is loaded AND routeData is available
  -------------------------------------------------- */
  useEffect(() => {
    // Wait for Leaflet to load and routeData to be available
    if (!isLoaded || !mapRef.current || !routeData) return

    const L = (window as any).L
    if (!L) return

    // Clean up existing map instance before creating new one
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    // Initialize map centered on Singapore (will be adjusted by fitBounds later)
    const map = L.map(mapRef.current, { zoomControl: false }).setView(
      [1.3521, 103.8198],
      14
    )

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map)

    // Add zoom controls to bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map)

    mapInstanceRef.current = map

    /* -------------------------------
       Draw route as thick, solid lines
       Senior-friendly: Bold lines that are easy to see and follow
    ------------------------------- */
    const allCoordinates: [number, number][] = []

    routeData.legs.forEach((leg) => {
      // Skip legs without geometry data
      if (!leg.legGeometry?.points) return

      // Decode the encoded polyline string using @mapbox/polyline
      // Returns [[lat, lng], ...] array format
      const decodedCoordinates = polyline.decode(leg.legGeometry.points)
      
      // Collect all coordinates for bounds calculation
      allCoordinates.push(...decodedCoordinates)

      // Style based on transport mode - THICK lines for senior visibility
      const isWalking = leg.mode === "WALK"
      
      // Draw a thick, solid polyline (not polygon)
      // Senior-friendly: 10px wide line that's easy to see
      const routeLine = L.polyline(decodedCoordinates, {
        color: isWalking ? "#16a34a" : "#2563eb",  // Green for walk, Blue for transit
        weight: 10,           // Thick line for visibility
        opacity: 0.9,         // Nearly solid
        lineCap: "round",     // Rounded ends look friendlier
        lineJoin: "round",    // Smooth corners
      }).addTo(map)

      // Add popup with leg details (tap/click to see info)
      routeLine.bindPopup(`
        <div style="font-size: 16px; padding: 8px;">
          <strong>${isWalking ? "🚶 Walking" : "🚌 " + leg.mode}</strong><br/>
          <span style="font-size: 18px; font-weight: bold;">
            ${Math.round(leg.distance)} meters
          </span><br/>
          About ${Math.round(leg.duration / 60)} minutes
        </div>
      `)
    })

    /* -------------------------------
       Add Start and Destination Markers
       Using custom circle markers that always display correctly
    ------------------------------- */
    const firstLeg = routeData.legs[0]
    const lastLeg = routeData.legs[routeData.legs.length - 1]

    // START marker - Large green circle with white border
    // Easy to spot and understand "this is where I begin"
    L.circleMarker([firstLeg.from.lat, firstLeg.from.lon], {
      radius: 18,              // Large size for seniors
      fillColor: "#16a34a",    // Green = Start/Go
      color: "#ffffff",        // White border
      weight: 4,               // Thick border
      opacity: 1,
      fillOpacity: 1,
    })
      .addTo(map)
      .bindPopup(`
        <div style="font-size: 18px; padding: 10px; text-align: center;">
          <strong>🟢 START HERE</strong>
        </div>
      `)

    // DESTINATION marker - Large red circle with white border
    // Easy to spot and understand "this is where I'm going"
    L.circleMarker([lastLeg.to.lat, lastLeg.to.lon], {
      radius: 18,              // Large size for seniors
      fillColor: "#dc2626",    // Red = Destination/Stop
      color: "#ffffff",        // White border
      weight: 4,               // Thick border
      opacity: 1,
      fillOpacity: 1,
    })
      .addTo(map)
      .bindPopup(`
        <div style="font-size: 18px; padding: 10px; text-align: center;">
          <strong>🔴 DESTINATION</strong>
        </div>
      `)

    /* -------------------------------
       Auto-zoom to fit the entire route
       Uses fitBounds with padding for better UX
    ------------------------------- */
    if (allCoordinates.length > 0) {
      const bounds = L.latLngBounds(allCoordinates)
      map.fitBounds(bounds, {
        padding: [60, 60],  // Add padding around the route
      })
    }

    // Cleanup function: remove map when component unmounts
    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [isLoaded, routeData])

  /* --------------------------------------------------
     Render Component
  -------------------------------------------------- */
  return (
    <div className="relative w-full h-[600px] rounded-3xl overflow-hidden border-4 border-border shadow-2xl">
      {/* Map container - Leaflet will render into this div */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Loading state - shown while Leaflet loads or route data is being fetched */}
      {(!isLoaded || !routeData) && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-xl font-semibold">
            {!isLoaded ? "Loading map…" : "Loading route…"}
          </div>
        </div>
      )}
    </div>
  )
}
