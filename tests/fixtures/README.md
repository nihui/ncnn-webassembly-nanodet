# Browser inference fixture

`astronaut.png` is the NASA photograph of astronaut Eileen Collins, obtained
unchanged from scikit-image v0.25.2:

- Image: https://github.com/scikit-image/scikit-image/blob/v0.25.2/skimage/data/astronaut.png
- Provenance and public-domain declaration: https://github.com/scikit-image/scikit-image/blob/v0.25.2/skimage/data/_fetchers.py (`astronaut`)
- Original NASA Great Images database entry: https://flic.kr/p/r9qvLn

The upstream dataset documents this image as having no known copyright
restrictions and released into the public domain. It is used only as a fixed
inference test input; this does not imply NASA or the subject endorses the project.

The browser test requires actual detection drawing to modify the image, compares
repeated calls and all four runtime variants, and checks automatic non-threaded
selection without cross-origin isolation. It does not use a webcam or user data.
