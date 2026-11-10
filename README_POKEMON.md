# IT4200 Pokémon Counter Finder — GitHub Pages

This package adds a new page to your existing IT4200 GitHub Pages frontend. It does **not** include `app.py`, `pokemon.json`, or a second backend. Those remain in the shared Flask API repository.

## Add to the frontend repository

Copy into your frontend repository:

- `pokemon.html` → repository root
- `static/pokemon.css` → `static/`
- `static/pokemon.js` → `static/`

The included `index.html` is based on the latest index you provided, with a **Pokémon Finder** sidebar link and home-page shortcut plus GitHub Pages–friendly relative asset paths. You can replace your existing `index.html` with it **only if you have not made other changes since sharing that file**. Otherwise, add the changes manually:

1. In `<nav>`, add `<a class="nav-link" href="./pokemon.html"><span>⚡</span> Pokémon Finder</a>`.
2. Optionally add a quick-start card that links to `./pokemon.html`.
3. Ensure the CSS and JavaScript links in `index.html` use `./static/styles.css` and `./static/app.js`.

**Do not overwrite your existing `static/styles.css` or `static/app.js`.** This package doesn't replace them.

**Recommended one-line GitHub Pages navigation fix in your existing `static/app.js`:** if it still contains `history.replaceState(null, '', `/#${page}`);`, change that line to `history.replaceState(null, '', `#${page}`);`. The leading `/` otherwise changes a project Pages URL to the domain root when navigating between dashboard tabs.

## Expected project layout

```
it4200-GA/
├── index.html           # existing frontend, with Pokémon Finder link
├── pokemon.html         # new static page
├── static/
│   ├── app.js           # keep your existing version
│   ├── styles.css       # keep your existing version
│   ├── pokemon.css      # new styles
│   └── pokemon.js       # new endpoint integration
└── README.md
```

## Deploy to GitHub Pages

From your frontend repository:

```bash
git add index.html pokemon.html static/pokemon.css static/pokemon.js
git commit -m "Add Pokémon Counter Finder page"
git push origin main
```

When GitHub Pages deploys, browse to:

https://johncherny.github.io/it4200-GA/pokemon.html

No frontend `requirements.txt` or `server.py` is needed. This is plain HTML, CSS, and JavaScript.

## API endpoints (shared Flask API on Render)

- `GET https://two026-it4200-fall.onrender.com/api/pokemon`: returns `{ "pokemon": [...], "count": 721 }`. The page loads this list once and filters it locally by name, Pokédex number, type, and generation.
- `GET https://two026-it4200-fall.onrender.com/api/pokemon/counter?pokemon=25`: returns `{ "selected": {...}, "counter": {...}, "alternatives": [...], "note": "..." }`. Each chosen Pokémon calls this endpoint by Pokédex ID.

The older backend route `/pokemon` is **not used**; that's a server-hosted page, not necessary for GitHub Pages.

### Required backend setup

The new endpoints and `pokemon.json` must be committed to the **backend** repository and deployed to Render. The deployed server must allow browser requests from the GitHub Pages origin. In the Flask backend, if CORS isn't configured already:

```python
from flask_cors import CORS
# after app = Flask(__name__)
CORS(app, origins=["https://johncherny.github.io"])
```

Also add `flask-cors` to the **backend** `requirements.txt`. The origin is the domain, without `/it4200-GA`.

## Images

Art is loaded by Pokédex ID from the [PokéAPI sprites repository](https://github.com/PokeAPI/sprites) using the public official-artwork files. This means the artwork requires access to `raw.githubusercontent.com`. If an image fails, the page shows a neutral icon and the API features still work.

## Troubleshooting

- **Pokédex endpoint returns 404:** ensure the Pokémon feature is merged and redeployed to Render.
- **Network request fails / CORS error:** allow `https://johncherny.github.io` in the backend's CORS configuration.
- **Page unstyled:** confirm `static/styles.css` and `static/pokemon.css` are both present and their relative paths are correct.
- **No artwork:** check access to the GitHub-hosted PokéAPI sprites URLs.
- **Unexpected API structure:** the page expects each entry to contain numeric `id`, string `name`, string array `types`, and numeric `generation`.

The counter logic considers **type effectiveness only**. It doesn't account for abilities, movesets, stats, held items, or alternate forms.
