# ncnn-webassembly-nanodet

open https://nihui.github.io/ncnn-webassembly-nanodet and enjoy


# build and deploy

1. Install emscripten
```shell
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install 2.0.8
./emsdk activate 2.0.8

source emsdk/emsdk_env.sh
```

2. Download and extract opencv-mobile and ncnn webassembly package
```shell
wget https://github.com/nihui/opencv-mobile/releases/download/v11/opencv-mobile-2.4.13.7-webassembly.zip
wget https://github.com/Tencent/ncnn/releases/download/20210507/ncnn-20210507-webassembly.zip
unzip opencv-mobile-2.4.13.7-webassembly.zip
unzip ncnn-20210507-webassembly.zip
```

3. Build four WASM feature variants
```shell
mkdir build
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

4. Deploy the *.data *.js *.wasm and *.html files to your web server
