"""
Voice Recording and Speech-to-Text using Whisper Large V3 Singlish Model
This script records audio from the microphone and transcribes it in real-time.
"""

import torch
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
import numpy as np
import wave
import io
import argparse
import sys

# Try to import pyaudio for microphone recording
try:
    import pyaudio
    PYAUDIO_AVAILABLE = True
except ImportError:
    PYAUDIO_AVAILABLE = False
    print("Warning: PyAudio not installed. Install it with: pip install pyaudio")

# Try to import sounddevice as alternative
try:
    import sounddevice as sd
    SOUNDDEVICE_AVAILABLE = True
except ImportError:
    SOUNDDEVICE_AVAILABLE = False


class VoiceRecorder:
    """Records audio from microphone and transcribes using Whisper."""
    
    SAMPLE_RATE = 16000  # Whisper expects 16kHz audio
    CHANNELS = 1
    CHUNK_SIZE = 1024
    
    def __init__(self, device: str = None):
        """
        Initialize the voice recorder with Whisper model.
        
        Args:
            device: Device to load model on ('cuda', 'cpu', or None for auto-detect)
        """
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        
        self.device = device
        self.processor = None
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load the Whisper Singlish model and processor."""
        print(f"Loading Whisper model on {self.device}...")
        
        self.processor = AutoProcessor.from_pretrained("mjwong/whisper-large-v3-singlish")
        self.model = AutoModelForSpeechSeq2Seq.from_pretrained(
            "mjwong/whisper-large-v3-singlish",
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            low_cpu_mem_usage=True,
        )
        self.model.to(self.device)
        print("Model loaded successfully!")
    
    def record_audio_pyaudio(self, duration: float = 5.0) -> np.ndarray:
        """
        Record audio from microphone using PyAudio.
        
        Args:
            duration: Recording duration in seconds
            
        Returns:
            numpy array of audio samples
        """
        if not PYAUDIO_AVAILABLE:
            raise ImportError("PyAudio is not installed. Run: pip install pyaudio")
        
        p = pyaudio.PyAudio()
        
        print(f"\n🎤 Recording for {duration} seconds... Speak now!")
        
        stream = p.open(
            format=pyaudio.paFloat32,
            channels=self.CHANNELS,
            rate=self.SAMPLE_RATE,
            input=True,
            frames_per_buffer=self.CHUNK_SIZE
        )
        
        frames = []
        num_chunks = int(self.SAMPLE_RATE / self.CHUNK_SIZE * duration)
        
        for _ in range(num_chunks):
            data = stream.read(self.CHUNK_SIZE)
            frames.append(np.frombuffer(data, dtype=np.float32))
        
        stream.stop_stream()
        stream.close()
        p.terminate()
        
        print("✅ Recording complete!")
        
        audio_data = np.concatenate(frames)
        return audio_data
    
    def record_audio_sounddevice(self, duration: float = 5.0) -> np.ndarray:
        """
        Record audio from microphone using sounddevice.
        
        Args:
            duration: Recording duration in seconds
            
        Returns:
            numpy array of audio samples
        """
        if not SOUNDDEVICE_AVAILABLE:
            raise ImportError("sounddevice is not installed. Run: pip install sounddevice")
        
        print(f"\n🎤 Recording for {duration} seconds... Speak now!")
        
        audio_data = sd.rec(
            int(duration * self.SAMPLE_RATE),
            samplerate=self.SAMPLE_RATE,
            channels=self.CHANNELS,
            dtype=np.float32
        )
        sd.wait()  # Wait until recording is finished
        
        print("✅ Recording complete!")
        
        return audio_data.flatten()
    
    def record_audio(self, duration: float = 5.0) -> np.ndarray:
        """
        Record audio using available library.
        
        Args:
            duration: Recording duration in seconds
            
        Returns:
            numpy array of audio samples
        """
        if SOUNDDEVICE_AVAILABLE:
            return self.record_audio_sounddevice(duration)
        elif PYAUDIO_AVAILABLE:
            return self.record_audio_pyaudio(duration)
        else:
            raise ImportError(
                "No audio recording library available. "
                "Install one of: pip install sounddevice OR pip install pyaudio"
            )
    
    def transcribe(self, audio: np.ndarray) -> str:
        """
        Transcribe audio to text.
        
        Args:
            audio: numpy array of audio samples (16kHz, mono)
            
        Returns:
            Transcribed text
        """
        print("🔄 Transcribing...")
        
        # Process the audio
        inputs = self.processor(
            audio,
            sampling_rate=self.SAMPLE_RATE,
            return_tensors="pt"
        )
        
        # Move inputs to the same device as the model
        input_features = inputs.input_features.to(self.device)
        if self.device == "cuda":
            input_features = input_features.half()
        
        # Generate transcription
        with torch.no_grad():
            generated_ids = self.model.generate(
                input_features,
                max_new_tokens=444,
                language="en",
                task="transcribe",
            )
        
        # Decode the generated tokens
        transcription = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        return transcription
    
    def record_and_transcribe(self, duration: float = 5.0) -> str:
        """
        Record audio from microphone and transcribe it.
        
        Args:
            duration: Recording duration in seconds
            
        Returns:
            Transcribed text
        """
        audio = self.record_audio(duration)
        return self.transcribe(audio)
    
    def continuous_listen(self, duration: float = 5.0, silence_threshold: float = 0.01):
        """
        Continuously listen and transcribe in a loop.
        Press Ctrl+C to stop.
        
        Args:
            duration: Recording duration per segment in seconds
            silence_threshold: Threshold below which audio is considered silence
        """
        print("\n" + "="*50)
        print("🎙️  Continuous Listening Mode")
        print("Press Ctrl+C to stop")
        print("="*50)
        
        try:
            while True:
                audio = self.record_audio(duration)
                
                # Check if audio has speech (not just silence)
                if np.abs(audio).mean() > silence_threshold:
                    text = self.transcribe(audio)
                    if text.strip():
                        print(f"\n📝 You said: {text}")
                else:
                    print("(silence detected, skipping transcription)")
                    
        except KeyboardInterrupt:
            print("\n\n👋 Stopped listening.")


def main():
    parser = argparse.ArgumentParser(
        description="Record voice and transcribe using Whisper Singlish model"
    )
    parser.add_argument(
        "--duration", "-d",
        type=float,
        default=5.0,
        help="Recording duration in seconds (default: 5)"
    )
    parser.add_argument(
        "--continuous", "-c",
        action="store_true",
        help="Enable continuous listening mode"
    )
    parser.add_argument(
        "--device",
        type=str,
        choices=["cuda", "cpu"],
        default=None,
        help="Device to run model on (default: auto-detect)"
    )
    
    args = parser.parse_args()
    
    # Check for audio libraries
    if not SOUNDDEVICE_AVAILABLE and not PYAUDIO_AVAILABLE:
        print("❌ Error: No audio recording library found!")
        print("Please install one of the following:")
        print("  pip install sounddevice")
        print("  pip install pyaudio")
        sys.exit(1)
    
    # Initialize recorder
    recorder = VoiceRecorder(device=args.device)
    
    if args.continuous:
        recorder.continuous_listen(duration=args.duration)
    else:
        text = recorder.record_and_transcribe(duration=args.duration)
        print(f"\n📝 Transcription: {text}")


if __name__ == "__main__":
    main()
