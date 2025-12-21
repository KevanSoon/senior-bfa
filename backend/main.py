"""
FastAPI Backend for Voice Transcription using Whisper Large V3 Singlish Model
"""

import torch
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import io
import soundfile as sf
from contextlib import asynccontextmanager
import tempfile
import os

# Global variables for model and processor
processor = None
model = None
device = None


def load_model():
    """Load the Whisper Singlish model and processor."""
    global processor, model, device
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading Whisper model on {device}...")
    
    processor = AutoProcessor.from_pretrained("mjwong/whisper-large-v3-singlish")
    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        "mjwong/whisper-large-v3-singlish",
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        low_cpu_mem_usage=True,
    )
    model.to(device)
    print("Model loaded successfully!")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup."""
    load_model()
    yield
    # Cleanup on shutdown (if needed)
    print("Shutting down...")


app = FastAPI(
    title="Voice Transcription API",
    description="API for transcribing Singlish audio using Whisper Large V3",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TranscriptionResponse(BaseModel):
    """Response model for transcription."""
    text: str
    success: bool


class HealthResponse(BaseModel):
    """Response model for health check."""
    status: str
    model_loaded: bool
    device: str


def transcribe_audio(audio: np.ndarray, sample_rate: int = 16000) -> str:
    """
    Transcribe audio to text using the Whisper model.
    
    Args:
        audio: numpy array of audio samples
        sample_rate: sample rate of the audio (will be resampled to 16kHz if different)
        
    Returns:
        Transcribed text
    """
    global processor, model, device
    
    # Resample to 16kHz if necessary
    if sample_rate != 16000:
        import librosa
        audio = librosa.resample(audio, orig_sr=sample_rate, target_sr=16000)
    
    # Ensure audio is mono
    if len(audio.shape) > 1:
        audio = audio.mean(axis=1)
    
    # Process the audio
    inputs = processor(
        audio,
        sampling_rate=16000,
        return_tensors="pt"
    )
    
    # Move inputs to the same device as the model
    input_features = inputs.input_features.to(device)
    if device == "cuda":
        input_features = input_features.half()
    
    # Generate transcription
    with torch.no_grad():
        generated_ids = model.generate(
            input_features,
            max_new_tokens=444,
            language="en",
            task="transcribe",
        )
    
    # Decode the generated tokens
    transcription = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    
    return transcription


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check if the API and model are ready."""
    return HealthResponse(
        status="healthy",
        model_loaded=model is not None,
        device=device or "not initialized"
    )


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_voice(audio_file: UploadFile = File(...)):
    """
    Transcribe uploaded audio file to text.
    
    Accepts audio files in various formats (wav, mp3, webm, ogg, etc.)
    Returns the transcribed text.
    """
    if model is None or processor is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    
    try:
        from pydub import AudioSegment
        import librosa
        
        # Read the uploaded file
        contents = await audio_file.read()
        filename = audio_file.filename or "audio.webm"
        
        # Get file extension
        ext = os.path.splitext(filename)[1].lower() or ".webm"
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        
        try:
            # Load with pydub (uses ffmpeg)
            audio_segment = AudioSegment.from_file(tmp_path)
            
            # Convert to mono first
            audio_segment = audio_segment.set_channels(1)
            
            # Convert to 16-bit sample width for consistent normalization
            audio_segment = audio_segment.set_sample_width(2)  # 2 bytes = 16-bit
            
            # Get the original sample rate
            original_sample_rate = audio_segment.frame_rate
            
            # Get raw samples as numpy array
            samples = np.array(audio_segment.get_array_of_samples())
            
            # Normalize to float32 [-1, 1] (16-bit range is -32768 to 32767)
            audio_array = samples.astype(np.float32) / 32768.0
            
            # Use librosa for high-quality resampling to 16kHz (same as voice_recorder.py)
            if original_sample_rate != 16000:
                audio_array = librosa.resample(
                    audio_array, 
                    orig_sr=original_sample_rate, 
                    target_sr=16000,
                    res_type='kaiser_best'  # High quality resampling
                )
            
            sample_rate = 16000
            
            print(f"Audio duration: {len(audio_array) / sample_rate:.2f}s, max amplitude: {np.abs(audio_array).max():.4f}")
            
        finally:
            # Clean up temp file
            os.unlink(tmp_path)
        
        # Transcribe
        text = transcribe_audio(audio_array, sample_rate)
        
        print(f"\n📝 Transcribed: {text.strip()}\n")
        
        return TranscriptionResponse(
            text=text.strip(),
            success=True
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/transcribe/raw", response_model=TranscriptionResponse)
async def transcribe_raw_audio(audio_file: UploadFile = File(...)):
    """
    Transcribe raw PCM audio data (16-bit, 16kHz, mono).
    
    This endpoint is optimized for raw audio data from the browser's
    MediaRecorder API or Web Audio API.
    """
    if model is None or processor is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    
    try:
        # Read the uploaded file
        contents = await audio_file.read()
        
        # Try to read with soundfile first (handles webm, ogg, wav, etc.)
        try:
            audio_data, sample_rate = sf.read(io.BytesIO(contents))
            audio_array = audio_data.astype(np.float32)
        except Exception:
            # Fallback: assume raw 16-bit PCM at 16kHz
            audio_array = np.frombuffer(contents, dtype=np.int16).astype(np.float32) / 32768.0
            sample_rate = 16000
        
        # Transcribe
        text = transcribe_audio(audio_array, sample_rate)
        
        return TranscriptionResponse(
            text=text.strip(),
            success=True
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
