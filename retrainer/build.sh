#!/usr/bin/env bash
# Build all ReverseLab Windows targets (+ native tools).
# Requires: mingw-w64 (x86_64-w64-mingw32-g++) for the .exe files,
#           and a native g++ for the logic test / keygen.
set -e
cd "$(dirname "$0")"
mkdir -p dist

# -static makes the .exe self-contained (no mingw runtime DLLs needed on Windows)
MINGW="x86_64-w64-mingw32-g++ -std=c++17 -O2 -mwindows -I src -static -static-libgcc -static-libstdc++"
LIBS="-lgdiplus -lgdi32 -luser32 -ldwmapi -lshell32"

echo "[*] Building challenge targets..."
for f in ch1_quickreels ch2_photoglow ch3_vaultdrive ch4_sentinelvpn ch5_phantomcheat; do
    $MINGW "src/$f.cpp" -o "dist/$f.exe" $LIBS
    echo "    dist/$f.exe"
done

echo "[*] Building launcher..."
$MINGW src/launcher.cpp -o dist/launcher.exe $LIBS
echo "    dist/launcher.exe"

echo "[*] Copying guide..."
cp -f GUIDE.html dist/GUIDE.html 2>/dev/null || true

echo "[*] Building Windows console tools (keygen.exe + logic_test.exe)..."
x86_64-w64-mingw32-g++ -std=c++17 -O2 -I src tools/keygen.cpp -o dist/keygen.exe -static
x86_64-w64-mingw32-g++ -std=c++17 -O2 -I src tools/gen.cpp    -o dist/logic_test.exe -static

echo "[*] Building native self-test + running it..."
g++ -std=c++17 -I src tools/gen.cpp -o /tmp/rl_logic_test
/tmp/rl_logic_test | sed -n '/SELF-TEST/,$p'

echo "[*] Done. Output in ./dist"
