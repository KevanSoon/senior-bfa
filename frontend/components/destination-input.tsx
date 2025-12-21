"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Loader2 } from "lucide-react"

interface Coordinates {
  lat: number
  lng: number
}

interface DestinationInputProps {
  onStart: (destination: string, coordinates: Coordinates) => void
}

type RecordingState = "idle" | "recording" | "processing"

export function DestinationInput({ onStart }: DestinationInputProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [transcribedText, setTranscribedText] = useState("")
  const [error, setError] = useState("")
  const [searchResults, setSearchResults] = useState<Array<{
    name: string
    lat: number
    lng: number
  }>>([])
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      setError("")
      setTranscribedText("")
      setSearchResults([])
      
      // Request high-quality audio optimized for speech recognition
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,  // Match Whisper's expected sample rate
          channelCount: 1,    // Mono audio
        } 
      })
      
      // Try to use audio/webm with opus codec for better quality
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000  // Higher bitrate for better quality
      })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        
        // Process the recording
        await processRecording()
      }
      
      mediaRecorder.start()
      setRecordingState("recording")
      
    } catch (err) {
      console.error("Error accessing microphone:", err)
      setError("Could not access microphone. Please allow microphone access.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop()
      setRecordingState("processing")
    }
  }

  const processRecording = async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      })
      
      // Send to FastAPI backend for transcription
      const formData = new FormData()
      formData.append("audio_file", audioBlob, "recording.webm")
      
      const transcribeResponse = await fetch("http://localhost:8000/transcribe", {
        method: "POST",
        body: formData,
      })
      
      if (!transcribeResponse.ok) {
        throw new Error("Transcription failed")
      }
      
      const transcribeData = await transcribeResponse.json()
      const transcribedDestination = transcribeData.text
      
      setTranscribedText(transcribedDestination)
      
      if (transcribedDestination.trim()) {
        // Search OneMap for the destination
        await searchDestination(transcribedDestination)
      } else {
        setError("Could not understand the audio. Please try again.")
        setRecordingState("idle")
      }
      
    } catch (err) {
      console.error("Error processing recording:", err)
      setError("Failed to process recording. Please try again.")
      setRecordingState("idle")
    }
  }

  const searchDestination = async (searchText: string) => {
    try {
      const response = await fetch(`/api/onemap/search?q=${encodeURIComponent(searchText)}`)
      
      if (!response.ok) {
        throw new Error("Search failed")
      }
      
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        // Map results to simpler format
        const mappedResults = data.results.slice(0, 5).map((result: any) => ({
          name: result.SEARCHVAL || result.ADDRESS,
          lat: parseFloat(result.LATITUDE),
          lng: parseFloat(result.LONGITUDE),
        }))
        
        setSearchResults(mappedResults)
        setRecordingState("idle")
      } else {
        setError("No locations found. Please try again with a different destination.")
        setRecordingState("idle")
      }
      
    } catch (err) {
      console.error("Error searching destination:", err)
      setError("Failed to search for destination. Please try again.")
      setRecordingState("idle")
    }
  }

  const handleSelectDestination = (result: { name: string; lat: number; lng: number }) => {
    onStart(result.name, { lat: result.lat, lng: result.lng })
  }

  const resetState = () => {
    setTranscribedText("")
    setSearchResults([])
    setError("")
    setRecordingState("idle")
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="w-full max-w-2xl space-y-8">
        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 text-center">
          Where do you want to go?
        </h1>

        {/* Main Mic Button */}
        <div className="flex justify-center">
          <button
            onClick={recordingState === "recording" ? stopRecording : startRecording}
            disabled={recordingState === "processing"}
            className={`
              w-56 h-56 md:w-64 md:h-64 rounded-full flex flex-col items-center justify-center
              transition-all duration-300 shadow-lg
              ${recordingState === "recording" 
                ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                : recordingState === "processing"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 hover:scale-105"
              }
            `}
          >
            {recordingState === "processing" ? (
              <>
                <Loader2 className="w-20 h-20 md:w-24 md:h-24 text-white animate-spin" />
                <span className="text-white text-xl md:text-2xl font-semibold mt-4">
                  Processing...
                </span>
              </>
            ) : recordingState === "recording" ? (
              <>
                <Square className="w-20 h-20 md:w-24 md:h-24 text-white" />
                <span className="text-white text-xl md:text-2xl font-semibold mt-4">
                  Tap to Stop
                </span>
              </>
            ) : (
              <>
                <Mic className="w-20 h-20 md:w-24 md:h-24 text-white" />
                <span className="text-white text-xl md:text-2xl font-semibold mt-4">
                  Tap to Speak
                </span>
              </>
            )}
          </button>
        </div>

        {/* Instructions */}
        <p className="text-xl md:text-2xl text-gray-600 text-center px-4">
          Tap the button and say where you want to go. You can speak in English, Mandarin, Malay, or Tamil.
        </p>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-xl text-center text-xl">
            {error}
            <Button 
              variant="outline" 
              className="mt-4 w-full text-lg h-14"
              onClick={resetState}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Transcribed Text Display */}
        {transcribedText && !error && (
          <div className="bg-blue-50 border border-blue-200 px-6 py-4 rounded-xl text-center">
            <p className="text-lg text-blue-600 font-medium">You said:</p>
            <p className="text-2xl text-blue-800 font-bold mt-2">"{transcribedText}"</p>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-4">
            <p className="text-2xl text-center text-gray-700 font-semibold">
              Select your destination:
            </p>
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => handleSelectDestination(result)}
                  className="w-full h-auto min-h-20 text-xl md:text-2xl font-medium p-4 whitespace-normal text-left justify-start"
                >
                  {result.name}
                </Button>
              ))}
            </div>
            <Button 
              variant="ghost" 
              className="w-full text-lg h-14 text-gray-500"
              onClick={resetState}
            >
              Search for a different destination
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
