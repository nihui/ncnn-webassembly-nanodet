# ncnn-webassembly-nanodet

# 更新 nanodet-plus 版本

站在巨人的肩膀上，感谢 nihui 大佬

参考 https://github.com/Tencent/ncnn/blob/master/examples/nanodetplus_pnnx.cpp 修改了 nanodet-plus 版本的 Web 版

open https://nihui.github.io/ncnn-webassembly-nanodet and enjoy

# build and deploy

Uses the ncnn **20261020** official WebAssembly prebuilt SDK and **Emscripten 6.0.12**.
Both wasm32 and wasm64 basic, SIMD, threads and SIMD+threads variants are built;
ncnn itself does not need to be built from source.

1. Install and activate the matching Emscripten toolchain:

```shell
git clone https://github.com/emscripten-core/emsdk.git
./emsdk/emsdk install 6.0.12
./emsdk/emsdk activate 6.0.12
source emsdk/emsdk_env.sh
```

2. Clone this repository and extract the ncnn SDK inside it:

```shell
git clone https://github.com/nihui/ncnn-webassembly-nanodet.git
cd ncnn-webassembly-nanodet
curl -fL -o ncnn.zip https://github.com/Tencent/ncnn/releases/download/20261020/ncnn-20261020-webassembly.zip
unzip -q ncnn.zip
curl -fL -o ncnn64.zip https://github.com/Tencent/ncnn/releases/download/20261020/ncnn-20261020-webassembly64.zip
unzip -q ncnn64.zip
```

3. Build with CMake 3.13 or newer. Use a separate build directory for each
variant so cached package paths and compiler flags cannot leak between variants:

```shell
for feature in basic simd threads simd-threads; do
    emcmake cmake -S . -B "build/$feature" -DWASM_FEATURE="$feature"
    cmake --build "build/$feature" --parallel 4
    emcmake cmake -S . -B "build/wasm64-$feature" -DWASM_FEATURE="$feature" -DWASM64=ON
    cmake --build "build/wasm64-$feature" --parallel 4
done
```

4. Collect the generated files and serve the demo:

```shell
mkdir -p deploy
cp build/*/*.data build/*/*.js build/*/*.wasm deploy/
cp index.html wasmFeatureDetect.js deploy/
python3 -m http.server --directory deploy
```

Open http://localhost:8000 and allow camera access. Camera access requires
localhost or HTTPS; use HTTPS when serving from another computer rather than
disabling browser security. Emscripten 6 embeds pthread worker startup in the
main generated JavaScript, so separate `*.worker.js` files are not required.

The page selects the supported SIMD/thread variant automatically and prefers
wasm64 when the browser supports Memory64 (including shared Memory64 for
threaded variants). It validates the actual binary before loading JavaScript;
unsupported wasm64 binaries fall back to the corresponding wasm32 variant.
Network or runtime errors are reported rather than silently treated as missing
Memory64 support. Existing wasm32 bundle filenames remain unchanged; wasm64
bundles use the `nanodet-wasm64-` prefix.

Threads
require cross-origin isolation: configure the web server to send
`Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp`. The simple Python server above
does not set these headers, so the page uses a non-threaded variant. The
threaded build uses at most four prestarted pthreads (one inference worker
and up to three OpenMP workers).

The pull-request workflow builds all eight variants. Only pushes to `master`
deploy to `gh-pages`; pull requests do not deploy.
