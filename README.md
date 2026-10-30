# Smart Finance

A responsive personal-finance dashboard for tracking spending, budgets, transactions, and recurring bills.

## Run locally

This is a static web project with no package installation required. From this folder, start a local web server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in a browser. Serving it locally lets the service worker and installable-app features work in supported browsers.

The `index.html`, `manifest.webmanifest`, `sw.js`, and `icon.svg` files are the app source. The `dist/` folder contains the deployable static copy. The `tests/` folder contains the project's existing test file; it has not been run as part of packaging.

## Data note

This project is a browser-based demo. Review the app's privacy and data behavior before entering sensitive financial information.
