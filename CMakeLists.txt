cmake_minimum_required(VERSION 3.13)
option(WASM64 "Build the memory64 variant" OFF)
# The toolchain needs -m64 before project() to select 64-bit package metadata.
if(WASM64)
    foreach(lang C CXX)
        if(NOT "${CMAKE_${lang}_FLAGS}" MATCHES "(^| )-m64( |$)")
            set(CMAKE_${lang}_FLAGS "${CMAKE_${lang}_FLAGS} -m64")
        endif()
    endforeach()
endif()
project(ncnn-webassembly-nanodet)

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

set(WASM_FEATURE "" CACHE STRING "WebAssembly feature variant")
set_property(CACHE WASM_FEATURE PROPERTY STRINGS basic simd threads simd-threads)
if(NOT WASM_FEATURE MATCHES "^(basic|simd|threads|simd-threads)$")
    message(FATAL_ERROR "Pass -DWASM_FEATURE=basic, simd, threads or simd-threads")
endif()

if(WASM64)
    set(ncnn_package ncnn-20261020-webassembly64)
    set(target nanodet-wasm64-${WASM_FEATURE})
else()
    set(ncnn_package ncnn-20261020-webassembly)
    set(target nanodet-${WASM_FEATURE})
endif()
set(ncnn_DIR "${CMAKE_CURRENT_SOURCE_DIR}/${ncnn_package}/${WASM_FEATURE}/lib/cmake/ncnn" CACHE PATH "ncnn package directory")
find_package(ncnn REQUIRED)

add_executable(${target} nanodet.cpp nanodetncnn.cpp)
target_link_libraries(${target} PRIVATE ncnn)
target_link_options(${target} PRIVATE
    "-sFORCE_FILESYSTEM=1"
    "-sINITIAL_MEMORY=256MB"
    "-sEXPORTED_FUNCTIONS=['_nanodet_ncnn','_malloc','_free']"
    "-sEXPORTED_RUNTIME_METHODS=['HEAPU8']"
    "SHELL:--preload-file ${CMAKE_CURRENT_SOURCE_DIR}/assets@.")

if(WASM64)
    target_compile_options(${target} PRIVATE -m64)
    # malloc/free already receive Emscripten's wasm64 pointer wrappers.
    # Keep our custom export Number-based too; its pointer is converted to BigInt.
    target_link_options(${target} PRIVATE -m64 "-sSIGNATURE_CONVERSIONS=nanodet_ncnn:_p__")
endif()

if(WASM_FEATURE MATCHES "simd")
    target_compile_options(${target} PRIVATE -msimd128)
    target_link_options(${target} PRIVATE -msimd128)
endif()
if(WASM_FEATURE MATCHES "threads")
    # One inference worker plus up to three OpenMP workers (see NanoDet::load).
    target_compile_options(${target} PRIVATE -pthread)
    target_link_options(${target} PRIVATE -pthread "-sPTHREAD_POOL_SIZE=4")
endif()
