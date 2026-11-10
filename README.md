# IT4200 API Arcade — standalone frontend

Hosted webpage: https://johncherny.github.io/#overview

This frontend connects to the **existing class API hosted on Render** at https://two026-it4200-fall.onrender.com. It does not include, clone, or modify the original `app.py`.

## Run

From this directory:

```bash
python3 server.py
```

Visit **http://localhost:5500**.

Python 3 is the only dependency; no packages need installing, and there is no Node.js build step.

## How it works

- `index.html` + `static/` provide the frontend.
- `server.py` serves frontend files and forwards `/backend/...` requests to the live Render API (e.g. `/backend/status` becomes `https://two026-it4200-fall.onrender.com/status`).
- All game and utility results come from the hosted API. The proxy uses Python's standard library and avoids cross-origin (CORS) browser restrictions.
- The hosted API must remain accessible. Render deployments may take some time to respond after inactivity.

## Deploying your frontend

The included server can be started as a Render Python web service with command `python3 server.py`. It uses the environment variable `PORT` provided by Render, or port 5500 locally. No extra Python dependencies are required. For a publicly exposed deployment, consider adding rate limiting to the proxy and an explicit upstream endpoint allowlist.

To change the upstream API, set `API_BASE_URL` as an environment variable.
