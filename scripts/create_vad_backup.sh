#!/bin/bash

# Create backup directories
mkdir -p backup/vad-files/wasm
mkdir -p backup/vad-files/models

# Copy WASM files
cp public/ort-wasm-simd-threaded.wasm backup/vad-files/wasm/
cp public/ort-wasm-simd-threaded.jsep.wasm backup/vad-files/wasm/
cp public/vad.worklet.bundle.min.js backup/vad-files/wasm/

# Copy model files
cp public/silero_vad_legacy.onnx backup/vad-files/models/
cp public/silero_vad_v5.onnx backup/vad-files/models/

# Create version info file
echo "Working versions of dependencies:" > backup/vad-files/versions.txt
echo "Date created: $(date)" >> backup/vad-files/versions.txt
echo "" >> backup/vad-files/versions.txt
npm list @ricky0123/vad-react @ricky0123/vad-web onnxruntime-web >> backup/vad-files/versions.txt
