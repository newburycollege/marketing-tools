# Newbury College Marketing Tools

A static, browser-based marketing toolkit with a shared GDS-inspired interface. All media processing is local; no back-end service or paid API is required.

## Tools

| Tool | Page |
| --- | --- |
| QR Code Generator | `qr.html` |
| Image Resizer | `resize.html` |
| Media Stripper | `media-stripper.html` |
| UTM Link Builder | `utm-builder.html` |
| Apprenticeship Vacancy Builder | `vacancy-post-builder.html` |
| HR Vacancy Builder | `hr-vacancy-builder.html` |
| AI Prompt Builder | `prompt-builder.html` |
| Room Hire Email Generator | `room-hire-generator.html` |

`video-stripper.html` redirects to Media Stripper, preserving bookmarks and SharePoint links.

## Deployment

Both GitHub Pages and Azure Static Web Apps build the same `_site` directory. The source checkout is not the finished website. The build script copies the HTML, CSS, JavaScript, images and favicon files, then installs browser assets from the pinned npm dependencies in `node_modules` into `_site/vendor`. FFmpeg, QR generation, JSZip and Font Awesome are served from the same site; no CDN is needed. The GitHub Actions workflows automatically install dependencies, run metadata tests, build and validate the site. The separate Validate Marketing Tools workflow also runs Chromium/Playwright tests and a runtime dependency audit.

For developers with Node.js (24 recommended):

```sh
npm install --no-audit --no-fund
npm run test:metadata
npm run build:pages
npm run validate
npx playwright install chromium
npm test
npm audit --omit=dev --audit-level=high
```

The source archive was prepared in an environment without registry access, so it does not contain a generated `package-lock.json`. The first GitHub validation run uploads its generated lockfile as an Actions artifact. Commit that lockfile and switch the install commands in all three workflows to `npm ci --no-audit --no-fund` for reproducible future builds. Do not commit `node_modules` or `_site`.

### Upload using GitHub's website (no Git installed)

1. Extract the updated repository ZIP. Open your existing repository on GitHub.
2. Ideally create a branch using the branch selector, then choose **Add file > Upload files**. Upload the extracted files and folders at the repository root, preserving their paths. Do not upload the ZIP itself or the outer folder. Include `.github/workflows` and `.gitignore` (check those paths after upload; hidden folders may be omitted by file pickers). If necessary, upload workflow files individually inside `.github/workflows`.
3. Remove the obsolete root `gds-shell.js` and `js/video-stripper.js` from the repository using GitHub's file deletion controls. Do **not** delete `js/gds-shell.js`, `css/video-stripper.css` or `video-stripper.html`.
4. Open a pull request from the new branch to main. Check **Actions > Validate Marketing Tools** and the Azure preview, if available. Merge only after validation passes. If uploading directly to main instead, the deployment workflows run automatically; check their status before using the site.
5. From the latest successful validation run, download the `npm-lockfile` artifact and upload the extracted `package-lock.json` to the repository root. Subsequent installs can use `npm ci`.

## Media Stripper

Select or drop one or more MP4, MOV, M4V, MP3, JPG/JPEG and PNG files. The app processes the batch sequentially, reports detected supported metadata and retained information, and provides individual downloads or a ZIP. FFmpeg is loaded only for video files; JSZip is loaded for ZIP exports. Originals are untouched. Video is remuxed with stream copy, removing inherited global metadata and chapters; M4V becomes MP4. Other formats are edited at the binary level without re-encoding. JPEG orientation and colour profiles, PNG rendering information/animation and MP3 playback headers are retained to preserve appearance or playback. Unsupported or damaged files are reported individually. Unknown PNG ancillary chunks are retained and reported. Some JPEG structures (e.g. MPO and trailing embedded data) and unusual MP3 structures are rejected rather than risk corruption. The batch can be cancelled between files and during video processing; synchronous image/audio processing cannot be interrupted mid-file. Large files or batches may exhaust browser memory. The tool does not guarantee removal of all metadata or Content Credentials; verify deliverables separately, keep originals and preserve required attribution/provenance.

## Shared code and design

- `js/gds-shell.js`: navigation, header, breadcrumbs, footer and mobile menu. Register new tools here and on `index.html`.
- `js/shared-utils.js`: clipboard operations, safe names, local image loading, download utilities and bounded crop positioning.
- `css/gds-theme.css`: common theme and accessibility rules. `css/video-stripper.css` is retained for the Media Stripper layout.
- `app-template.html`: starting point for new tools. Use an `app-page-content` template, unique `data-app-key`, external JavaScript and shared utilities. Initialise after `app-shell-ready` or after the shell has rendered.
- Root favicon files and `site.webmanifest`: generated from the supplied rocket SVG.
- `scripts/build-pages.mjs`: static site build and local dependency copying. `scripts/validate-build.mjs`: checks page links, scripts, favicon and FFmpeg assets.
- `tests/metadata.test.cjs`: dependency-free tests using synthetic fixtures. `tests/toolkit.spec.js`: browser regression tests including a real FFmpeg remux.

## Data protection and security

QR contents, image files, media files and form inputs are processed in the browser. External platform links still navigate to their respective services. The HTML pages include a restrictive Content Security Policy; allow WebAssembly only where needed. Access to the hosted site is not restricted merely because it is embedded in SharePoint. Staff-only authentication and hosting visibility require separate decisions; no authentication settings have been changed. Use College-approved AI tools, preferably Copilot signed in with a College account. Do not send College personal data to unapproved services. The room hire RSForm! Pro endpoint must independently validate booking references and rates; URL parameters are editable and cannot be authoritative. The receiving form was not included in this repository.

## Troubleshooting

- FFmpeg unavailable: check both Actions deployment runs, confirm the deployed `vendor/ffmpeg/api/ffmpeg.js`, its worker and `vendor/ffmpeg/core/ffmpeg-core.wasm` exist, and refresh the page.
- Missing QR, ZIP or icon assets: check that the build installed the npm dependencies and published `_site` rather than the source root.
- A media file fails: inspect the per-file message, try a smaller or supported file, and retain the original.
- No application content: confirm JavaScript is enabled and `js/gds-shell.js` loads. Each page displays a loading/failure hint rather than a blank screen.
