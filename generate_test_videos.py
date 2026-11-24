import cv2
import numpy as np
import os

width = 640
height = 360
fps = 24
total_frames = 48  # exactly 2.0 seconds

# Directory to save the test videos
out_dir = r"c:\Users\Tanishq\Downloads\TrueTone"

pass_path = os.path.join(out_dir, "test_video_pass.mp4")
fail_path = os.path.join(out_dir, "test_video_fail.mp4")

# FourCC codec for mp4
fourcc = cv2.VideoWriter_fourcc(*'mp4v')

# ==============================================================================
# 1. GENERATE PASSING VIDEO (Clean TrueTone Brand - No white frame anywhere)
# ==============================================================================
pass_writer = cv2.VideoWriter(pass_path, fourcc, fps, (width, height))

for i in range(total_frames):
    # Deep Navy background: BGR = (29, 15, 10)
    frame = np.full((height, width, 3), (29, 15, 10), dtype=np.uint8)
    
    # Cyan accent lines
    cv2.rectangle(frame, (30, 30), (width - 30, height - 30), (212, 182, 6), 2)
    
    # Text
    cv2.putText(frame, "TRUETONE BRAND COMPLIANT", (70, 160), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, (212, 182, 6), 2, cv2.LINE_AA)
    cv2.putText(frame, f"Frame {i+1}/48 - Compliant Dark Palette", (70, 210), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 180, 180), 1, cv2.LINE_AA)
    
    pass_writer.write(frame)

pass_writer.release()
print(f"Generated PASS video: {pass_path} ({os.path.getsize(pass_path)} bytes)")

# ==============================================================================
# 2. GENERATE FAILING VIDEO (Contains complete white frames at 00:01)
# ==============================================================================
fail_writer = cv2.VideoWriter(fail_path, fourcc, fps, (width, height))

for i in range(total_frames):
    if 20 <= i <= 32:
        # COMPLETE WHITE FRAME (BGR = 255, 255, 255 across 100% of pixels)
        frame = np.full((height, width, 3), (255, 255, 255), dtype=np.uint8)
    else:
        # Normal compliant frame
        frame = np.full((height, width, 3), (29, 15, 10), dtype=np.uint8)
        cv2.rectangle(frame, (30, 30), (width - 30, height - 30), (212, 182, 6), 2)
        cv2.putText(frame, "TRUETONE VIDEO TEST", (140, 160), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (212, 182, 6), 2, cv2.LINE_AA)
        cv2.putText(frame, f"Frame {i+1}/48 - Flashing to white at 00:01", (100, 210), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 180, 180), 1, cv2.LINE_AA)
        
    fail_writer.write(frame)

fail_writer.release()
print(f"Generated FAIL video: {fail_path} ({os.path.getsize(fail_path)} bytes)")
