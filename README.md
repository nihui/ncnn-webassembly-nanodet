# ncnn-webassembly-nanodet

# 更新 nanodet-plus 版本

站在巨人的肩膀上，感谢 nihui 大佬

参考 https://github.com/Tencent/ncnn/blob/master/examples/nanodetplus_pnnx.cpp 修改了 nanodet-plus 版本的 Web 版

open https://nihui.github.io/ncnn-webassembly-nanodet and enjoy

# build and deploy

1. Install emscripten

```shell
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install 3.1.28
./emsdk activate 3.1.28

source emsdk/emsdk_env.sh
```

2. clone this repo
   
```shell
git clone https://github.com/nihui/ncnn-webassembly-nanodet.git
```

3. Enter the repo direcroty and Download and extract ncnn webassembly package

```shell
wget https://github.com/Tencent/ncnn/releases/download/20230223/ncnn-20230223-webassembly.zip
unzip ncnn-20230223-webassembly.zip
```

4. Build four WASM feature variants

```shell
mkdir build # in ncnn-webassembly-nanodet directory
cd build
cmake -DCMAKE_TOOLCHAIN_FILE=$EMSDK/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake -DWASM_FEATURE=basic ..
make -j4
cmake -DCMAKE_TOOLCHAIN_FILE=$EMSDK/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake -DWASM_FEATURE=simd ..
make -j4
cmake -DCMAKE_TOOLCHAIN_FILE=$EMSDK/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake -DWASM_FEATURE=threads ..
make -j4
cmake -DCMAKE_TOOLCHAIN_FILE=$EMSDK/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake -DWASM_FEATURE=simd-threads ..
make -j4
```

5. Deploy the _.data _.js _.wasm and _.html files to your web server(you can find them in /build directory and this repo)

```
# deploy files
deploy/
├── index.html
├── nanodet-basic.data
├── nanodet-basic.js
├── nanodet-basic.wasm
├── nanodet-simd.data
├── nanodet-simd.js
├── nanodet-simd-threads.data
├── nanodet-simd-threads.js
├── nanodet-simd-threads.wasm
├── nanodet-simd-threads.worker.js
├── nanodet-simd.wasm
├── nanodet-threads.data
├── nanodet-threads.js
├── nanodet-threads.wasm
├── nanodet-threads.worker.js
└── wasmFeatureDetect.js
```

6. Deploy local server(python3 as a example)

```
python3 -m http.server --directory deploy
```

7. Access local server(chrome as a example)

```
# launch chrome browser, enter following command to address bar and press ENTER:
chrome://flags/#unsafely-treat-insecure-origin-as-secure

# enter following keyword to "Search flags" and press ENTER:
"insecure origins"
you will find "Insecure origins treated as secure" key

#enter local server url and click right side dropdown list, select "Enabled"
url example: http://192.168.1.100:8000

#relaunch chrome browser and access http://192.168.1.100:8000 (replace 192.168.1.100 with your local ip)
```
