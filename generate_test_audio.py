import os
import wave
import lameenc
import subprocess

out_dir = r"c:\Users\Tanishq\Downloads\TrueTone"

# Test audio scenarios
AUDIO_SCENARIOS = [
    {
        "filename": "test_audio_pass.mp3",
        "description": "Clean, compliant corporate audio adhering to all brand voice, probabilistic metrics, and acoustic standards.",
        "text": (
            "Welcome to TrueTone enterprise governance. "
            "Our platform is engineered to deliver 99.9% consistency across corporate communications "
            "with measured probabilistic guardrails and structured review workflows. "
            "Thank you for listening to our corporate briefing."
        ),
        "voice": "Microsoft David Desktop"
    },
    {
        "filename": "test_audio_fail_claims.mp3",
        "description": "Violates AUD-02 (Absolute Claims): Contains infallible guarantees ('never makes a single mistake', '100% infallible', '100% guaranteed').",
        "text": (
            "Welcome to TrueTone. "
            "Our miracle platform never makes a single mistake. "
            "Our tone governance is 100% infallible and 100% guaranteed to eliminate all errors with zero margin of error."
        ),
        "voice": "Microsoft David Desktop"
    },
    {
        "filename": "test_audio_fail_urgency.mp3",
        "description": "Violates AUD-01 (Tone & Urgency): Contains high-pressure retail clickbait ('Act now', 'Crazy deals', 'Limited time only').",
        "text": (
            "Hurry, hurry! Act now and do not miss out on our crazy lifetime deals! "
            "This unbelievable sale is available for a limited time only! "
            "Buy now immediately before prices skyrocket!"
        ),
        "voice": "Microsoft Zira Desktop"
    },
    {
        "filename": "test_audio_fail_safe_harbor.mp3",
        "description": "Violates AUD-04 (Safe Harbor Compliance): Forward-looking financial projection without required statutory disclaimer.",
        "text": (
            "Looking forward to the upcoming fiscal year, our enterprise revenue will surge by 300 percent, "
            "and TrueTone will capture 50 million active subscribers by the end of the fourth quarter."
        ),
        "voice": "Microsoft David Desktop"
    }
]

def synthesize_wav(text, voice_name, wav_path):
    ps_script = f'''
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('{voice_name}')
$synth.SetOutputToWaveFile('{wav_path}')
$synth.Speak('{text}')
$synth.Dispose()
'''
    res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"PowerShell speech synthesis failed: {res.stderr}")

def wav_to_mp3(wav_path, mp3_path):
    with wave.open(wav_path, 'rb') as w:
        params = w.getparams()
        frames = w.readframes(params.nframes)

    encoder = lameenc.Encoder()
    encoder.set_bit_rate(128)
    encoder.set_in_sample_rate(params.framerate)
    encoder.set_channels(params.nchannels)
    encoder.set_quality(2)

    mp3_data = encoder.encode(frames) + encoder.flush()

    with open(mp3_path, 'wb') as f:
        f.write(mp3_data)

def main():
    print("==============================================================")
    print("  Generating TrueTone Test MP3 Audio Files")
    print("==============================================================")
    
    for item in AUDIO_SCENARIOS:
        mp3_name = item["filename"]
        mp3_path = os.path.join(out_dir, mp3_name)
        temp_wav = os.path.join(out_dir, f"temp_{mp3_name}.wav")
        
        print(f"\nGenerating: {mp3_name}...")
        print(f"  Voice: {item['voice']}")
        print(f"  Script: \"{item['text']}\"")
        
        try:
            synthesize_wav(item["text"], item["voice"], temp_wav)
            wav_to_mp3(temp_wav, mp3_path)
            
            size = os.path.getsize(mp3_path)
            print(f"  ✓ Created MP3: {mp3_path} ({size} bytes)")
        finally:
            if os.path.exists(temp_wav):
                os.remove(temp_wav)

    print("\n==============================================================")
    print("  All Test Audio Files Generated Successfully!")
    print("==============================================================")

if __name__ == "__main__":
    main()
