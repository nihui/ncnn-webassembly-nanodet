cmake_minimum_required(VERSION 3.13)
project(ncnn-webassembly-nanodet)

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

set(WASM_FEATURE "" CACHE STRING "WebAssembly feature variant")
set_property(CACHE WASM_FEATURE PROPERTY STRINGS basic simd threads simd-threads)
if(NOT WASM_FEATURE MATCHES "^(basic|simd|threads|simd-threads)$")
    message(FATAL_ERROR "Pass -DWASM_FEATURE=basic, simd, threads or simd-threads")
endif()

set(ncnn_DIR "${CMAKE_CURRENT_SOURCE_DIR}/ncnn-20261020-webassembly/${WASM_FEATURE}/lib/cmake/ncnn" CACHE PATH "ncnn package directory")
find_package(ncnn REQUIRED)

set(target nanodet-${WASM_FEATURE})
add_executable(${target} nanodet.cpp nanodetncnn.cpp)
target_link_libraries(${target} PRIVATE ncnn)
target_link_options(${target} PRIVATE
    "-sFORCE_FILESYSTEM=1"
    "-sINITIAL_MEMORY=256MB"
    "-sEXPORTED_FUNCTIONS=['_nanodet_ncnn','_malloc','_free']"
    "-sEXPORTED_RUNTIME_METHODS=['HEAPU8']"
    "SHELL:--preload-file ${CMAKE_CURRENT_SOURCE_DIR}/assets@.")

if(WASM_FEATURE MATCHES "simd")
    target_compile_options(${target} PRIVATE -msimd128)
    target_link_options(${target} PRIVATE -msimd128)
endif()
if(WASM_FEATURE MATCHES "threads")
    # One inference worker plus up to three OpenMP workers (see NanoDet::load).
    target_compile_options(${target} PRIVATE -pthread)
    target_link_options(${target} PRIVATE -pthread "-sPTHREAD_POOL_SIZE=4")
endif()
