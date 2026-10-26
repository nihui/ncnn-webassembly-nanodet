// Run against a staging directory containing index.html, wasmFeatureDetect.js,
// and all four generated nanodet bundles. No camera or user images are used.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(process.argv[2] || 'deploy');
async function withTimeout(promise, milliseconds) {
    let timer;
    try {
        return await Promise.race([promise, new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('Inference timed out')), milliseconds);
        })]);
    } finally {
        clearTimeout(timer);
    }
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' };
const server = http.createServer(async (req, res) => {
    if (!req.url.includes('isolated=0')) {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    }
    try {
        const pathname = new URL(req.url, 'http://localhost').pathname;
        const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
        if (!file.startsWith(root + path.sep)) throw new Error('Invalid path');
        res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
        res.end(await fs.readFile(file));
    } catch {
        res.writeHead(404).end();
    }
});

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({
        headless: true,
        ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
    });
    try {
        let reference;
        const sample = 'data:image/png;base64,' + (await fs.readFile(path.join(__dirname, 'fixtures/astronaut.png'))).toString('base64');
        for (const variant of ['basic', 'simd', 'threads', 'simd-threads', 'automatic-no-isolation']) {
            const context = await browser.newContext();
            try {
                // Exercise the real page's feature selection and module loading path.
                if (variant !== 'automatic-no-isolation') await context.route('**/wasmFeatureDetect.js', route => route.fulfill({
                    contentType: 'text/javascript',
                    body: `var wasmFeatureDetect = {
                        simd: async () => ${variant.includes('simd')},
                        threads: async () => ${variant.includes('threads')}
                    };`
                }));
                await context.addInitScript(() => {
                    // Exercise the fixed pthread pool even on low-core CI runners.
                    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
                    window.cameraRequests = 0;
                    navigator.mediaDevices.getUserMedia = async () => {
                        window.cameraRequests++;
                        throw new Error('Camera intentionally disabled by smoke test');
                    };
                });
                const page = await context.newPage();
                const errors = [];
                let dataLoaded = false;
                page.on('pageerror', error => errors.push(error.message));
                page.on('console', message => {
                    if (message.type() === 'error') errors.push(message.text());
                });
                page.on('response', response => {
                    if (response.url().endsWith('.data') && response.ok()) dataLoaded = true;
                });
                // Avoid an unrelated missing favicon message in the error assertions.
                await context.route('**/favicon.ico', route => route.fulfill({ status: 204 }));
                await page.goto(`http://127.0.0.1:${server.address().port}/${variant === 'automatic-no-isolation' ? '?isolated=0' : ''}`);
                await page.waitForFunction(() => window.wasmModuleLoaded, null, { timeout: 120000 });
                const result = await withTimeout(page.evaluate(async ({ sample, isolated }) => {
                    if (crossOriginIsolated !== isolated) throw new Error('Unexpected cross-origin isolation');
                    const image = new Image();
                    image.src = sample;
                    await image.decode();
                    const canvas = document.getElementById('canvas');
                    canvas.width = image.width;
                    canvas.height = image.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(image, 0, 0);
                    const input = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    dst = Module._malloc(input.data.length);
                    if (!dst) throw new Error('Frame allocation failed');
                    const outputs = [];
                    try {
                        // Reset the input before each inference. Fewer than ten calls
                        // avoid the timing-dependent FPS overlay in the demo.
                        for (let run = 0; run < 2; ++run) {
                            ctx.putImageData(input, 0, 0);
                            ncnn_nanodet();
                            const output = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                            let hash = 2166136261;
                            let changedBytes = 0;
                            for (let i = 0; i < output.length; ++i) {
                                hash = Math.imul(hash ^ output[i], 16777619);
                                if (output[i] !== input.data[i]) ++changedBytes;
                            }
                            if (changedBytes === 0) throw new Error('No detection was drawn on the known-person sample');
                            outputs.push(hash >>> 0);
                        }
                    } finally {
                        Module._free(dst);
                        dst = null;
                    }
                    return { outputs, module: nanodet_module_name, cameraRequests };
                }, { sample, isolated: variant !== 'automatic-no-isolation' }), 120000);
                if (variant === 'automatic-no-isolation') {
                    assert.ok(['nanodet-basic', 'nanodet-simd'].includes(result.module), 'Non-isolated page must avoid pthreads');
                } else {
                    assert.equal(result.module, `nanodet-${variant}`);
                }
                assert.equal(result.cameraRequests, 1);
                assert.ok(dataLoaded, 'Preloaded model data was not fetched');
                assert.deepEqual(errors, [], 'Browser/runtime errors');
                assert.equal(result.outputs[0], result.outputs[1], 'Repeated inference differs');
                reference ??= result.outputs[0];
                assert.equal(result.outputs[0], reference, 'Variant output differs');
                console.log(`${variant}: model loaded; two real inferences; RGBA hash ${reference}`);
            } finally {
                await context.close();
            }
        }
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
}).finally(() => server.close());
