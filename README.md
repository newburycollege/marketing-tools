# Marketing Tools Suite

A small static HTML toolkit for internal marketing apps, built with a shared GDS-style shell and shared styling so every app looks and behaves consistently.

The suite is designed so you can add new tools without rebuilding the header, navigation or overall page layout each time.

---

## Contents

- [Overview](#overview)
- [How this works](#how-this-works)
- [File structure](#file-structure)
- [How to run the suite](#how-to-run-the-suite)
- [How to add another app](#how-to-add-another-app)
- [How to edit navigation](#how-to-edit-navigation)
- [How to update branding](#how-to-update-branding)
- [How to maintain existing apps](#how-to-maintain-existing-apps)
- [Deployment notes](#deployment-notes)
- [Troubleshooting](#troubleshooting)
- [Future improvements](#future-improvements)

---

## Overview

This suite uses a **static HTML + shared shell JavaScript** pattern.

That means:

- each page contains only its **page-specific content**
- the shared **header**, **sidebar navigation**, **breadcrumbs** and **page frame** are generated automatically by `js/gds-shell.js`
- the shared visual styling lives in `css/gds-theme.css`
- all pages inherit the same look and layout

This makes the suite easier to expand and maintain than repeating the same header and layout markup in every HTML file.

---

## How this works

### Shared shell

The file `js/gds-shell.js` is responsible for building the repeated page structure.

It generates:

- the top header
- the logo + **Marketing Tools** branding
- the left-hand navigation
- breadcrumbs on inner pages
- the main content frame
- the shared footer

Every page includes:

```html
<div id="app-shell"></div>
<template id="app-page-content">
  <!-- page-specific content goes here -->
</template>
<script src="js/gds-shell.js"></script>
```

When the page loads, `js/gds-shell.js` reads the content inside `#app-page-content` and injects it into the shared shell.

### Shared styling

The file `css/gds-theme.css` contains all shared styling, including:

- layout
- typography
- colours
- buttons
- forms
- tables
- cards and panels
- responsive behaviour
- logo sizing
- breadcrumb styling

The primary accent colour is:

```css
#EE3A4E
```

### Page metadata

Each page defines its identity using `data-` attributes on the `<body>` element:

```html
<body
  data-app-key="qr"
  data-app-title="QR code generator"
  data-app-intro="Enter text or a URL to generate a QR code you can scan or download."
>
```

These values are used by the shared shell to:

- highlight the current navigation item
- display the page title
- display the page intro text
- generate breadcrumbs where appropriate

---

## File structure

```text
.
├── index.html
├── qr.html
├── resize.html
├── app-template.html
├── README.md
├── css/
│   └── gds-theme.css
├── js/
│   └── gds-shell.js
└── img/
    └── logo_dual.png
```

### File purposes

#### `index.html`
The home page for the suite.

#### `qr.html`
A QR code generator that creates QR codes from text or URLs and allows PNG download.

#### `resize.html`
An image resizer that creates multiple pre-defined marketing image sizes and allows ZIP download.

#### `app-template.html`
A starter template for creating future tools.

#### `js/gds-shell.js`
The shared app shell. This is where the navigation, branding, breadcrumbs and repeated page layout are managed.

#### `css/gds-theme.css`
The shared stylesheet used by all apps.

#### `img/logo_dual.png`
The logo shown in the header. The shell expects the logo at `img/logo_dual.png`.

---

## How to run the suite

### Option 1. Open directly in a browser
Open `index.html` in your browser.

### Option 2. Use a lightweight local web server
If you have Python installed, run this in the project folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

### Option 3. Host on static web hosting
You can upload these files to GitHub Pages, an internal web server, or any other static hosting platform.

---

## How to add another app

Use `app-template.html` as the starting point.

### Step 1. Copy the template
Duplicate `app-template.html` and rename it, for example:

```text
event-builder.html
```

### Step 2. Update the page metadata
Change the `<body>` attributes so the shell knows what this page is.

```html
<body
  data-app-key="event-builder"
  data-app-title="Event builder"
  data-app-intro="Create standard event content and links for marketing use."
>
```

### Step 3. Add the page-specific content
Put your tool's unique HTML inside the template block.

### Step 4. Add any page-specific JavaScript
Add the JavaScript for your tool underneath the shared shell script include.

```html
<script src="js/gds-shell.js"></script>
<script>
  // Tool-specific JavaScript here
</script>
```

### Step 5. Add the new tool to navigation
Open `js/gds-shell.js` and update the `navItems` array.

### Step 6. Test the page
Check the page loads, the nav item appears, the correct item is highlighted, the breadcrumb appears, and the layout works on desktop and mobile.

---

## How to edit navigation

Navigation is controlled centrally in `js/gds-shell.js`.

Look for:

```javascript
const navItems = [ ... ]
```

Each item has:

- `key` — must match `data-app-key` on the page
- `title` — the text shown in navigation and breadcrumbs
- `href` — the link to the page
- `description` — optional supporting metadata for future use

### Rules to follow

- the `key` must be unique
- the `key` must exactly match the page's `data-app-key`
- the `href` must match the file name exactly
- if the `key` does not match, the page will not highlight correctly in the sidebar

---

## How to update branding

### Header logo
The header logo is controlled in `js/gds-shell.js`:

```html
<img class="app-header__logo" src="img/logo_dual.png" alt="Newbury College logo">
```

### Header text
The text alongside the logo is also set in `js/gds-shell.js`:

```html
<span class="app-header__brand-text">Marketing Tools</span>
```

### Styling and size
Logo size and spacing are controlled in `css/gds-theme.css` using:

- `.app-header__brand`
- `.app-header__logo`
- `.app-header__brand-text`

### Primary colour
The main accent colour is set at the top of `css/gds-theme.css`:

```css
--gds-primary: #EE3A4E;
```

---

## How to maintain existing apps

### QR Code Generator
File: `qr.html`

Update the page-specific form, validation, QR generation logic and download logic here.

### Image Resizer
File: `resize.html`

Update the page-specific form, output sizes, client-side image processing and ZIP generation logic here.

### Home page
File: `index.html`

Update the landing page content and guidance here when you add tools.

---

## Deployment notes

Keep this structure in place unless you intentionally reorganise paths:

- `index.html`
- `qr.html`
- `resize.html`
- `app-template.html`
- `js/gds-shell.js`
- `css/gds-theme.css`
- `img/logo_dual.png`

If you move files again, update the relative paths accordingly.

The image resizer uses external CDNs for JSZip and FileSaver.js. If your hosting environment blocks CDN access, download those libraries locally and update the script paths in `resize.html`.

---

## Troubleshooting

### The header appears but the page content does not
Check that the page contains:

- `<div id="app-shell"></div>`
- `<template id="app-page-content">...</template>`
- `<script src="js/gds-shell.js"></script>`

### The current page is not highlighted in the sidebar
Check that the page `data-app-key` matches the `key` in `navItems`.

### The logo does not appear
Check that `img/logo_dual.png` is in the correct folder and the file name matches exactly.

### Breadcrumbs do not appear
Breadcrumbs are not shown on the home page by design. On other pages, check that `data-app-key` is set correctly and the page has a matching entry in `navItems`.

### Styles are not loading
Check that `css/gds-theme.css` is in the correct location and the path is correct.

### The Image Resizer does not work
Check that the browser can access the JSZip and FileSaver CDN URLs, JavaScript is enabled, and a valid image file is selected.

---

## Future improvements

Potential next steps:

- move navigation into a separate config file such as `nav-items.js`
- add a collapsible mobile menu
- add a version number in the footer
- add a changelog
- add additional internal tools using the same shell
- replace CDN dependencies with local copies if needed

---

## Summary

This toolkit is intentionally simple:

- **static HTML** for easy hosting
- **shared shell JS** for reusable structure
- **shared CSS** for consistency
- **page-level content** for flexibility

To maintain it successfully, remember this rule:

> update shared layout and branding in `js/gds-shell.js` and `css/gds-theme.css`  
> update individual tool logic inside the relevant page file  
> add future apps by copying `app-template.html` and adding one new nav item
