#!/bin/bash

# Create public directory if it doesn't exist
mkdir -p public

# Download the VAD model
curl -o public/silero_vad.onnx https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.20/dist/silero_vad_legacy.onnx

# Copy ONNX runtime WASM files
cp node_modules/onnxruntime-web/dist/*.wasm public/

# Copy VAD worklet if it exists in node_modules
cp node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js public/

# Verify files
echo "Checking for required files..."
ls -l public/silero_vad.onnx
ls -l public/*.wasm
ls -l public/vad.worklet.bundle.min.js
