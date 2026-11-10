// IT4200 Pokémon Counter Finder. Runs directly on GitHub Pages; no local Python proxy.
'use strict';

const API_BASE = 'https://two026-it4200-fall.onrender.com';
const ART_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';
const $ = (id) => document.getElementById(id);
const PAGE_SIZE = 24;

let allPokemon = [];
let visiblePokemon = [];
let shownCount = PAGE_SIZE;
let selectedPokemon = null;
let latestRequest = 0;

function makeElement(tag, className = '', text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = String(text);
  return node;
}

function setNotice(message, kind = '') {
  const notice = $('poke-notice');
  notice.textContent = message;
  notice.className = `poke-notice ${kind}`.trim();
}

function setConnection(online) {
  $('pokemon-api-state').textContent = online ? 'API Connected' : 'API Unavailable';
  $('pokemon-sidebar-status').textContent = online ? 'Pokédex connected' : 'Connection failed';
  for (const id of ['pokemon-top-dot', 'pokemon-status-dot']) {
    const dot = $(id);
    dot.classList.toggle('online', online);
    dot.classList.toggle('offline', !online);
  }
}

async function api(path, params = {}) {
  const url = new URL(path, API_BASE);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  let response;
  try {
    response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  } catch {
    throw new Error('The browser could not reach the Render API. Check your connection and confirm the backend allows your GitHub Pages origin (CORS).');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(response.ok ? 'The API returned an unexpected response.' : `HTTP ${response.status}: Endpoint unavailable or not yet deployed to Render.`);
  }
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}: The request failed.`);
  return data;
}

function formatNumber(id) {
  return `#${String(id).padStart(3, '0')}`;
}

function formatMultiplier(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric}×` : '—';
}

function nameKey(text) {
  return String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function imageFor(pokemon, className) {
  const id = Number(pokemon.id);
  if (!Number.isInteger(id) || id < 1 || id > 721) return makeElement('span', 'poke-image-fallback', '⚡');
  const img = makeElement('img', className);
  img.src = `${ART_BASE}/${id}.png`;
  img.alt = `Artwork of ${pokemon.name}`;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.addEventListener('error', () => img.replaceWith(makeElement('span', 'poke-image-fallback', '◉')));
  return img;
}

function typePills(types) {
  const wrapper = makeElement('div', 'poke-types');
  for (const type of Array.isArray(types) ? types : []) {
    const pill = makeElement('span', 'poke-type', type);
    pill.dataset.type = type;
    wrapper.append(pill);
  }
  return wrapper;
}

function filterAndRender() {
  const query = nameKey($('pokemon-search').value.trim()).replace(/^#/, '');
  const generation = $('pokemon-generation').value;
  const type = $('pokemon-type').value;
  visiblePokemon = allPokemon.filter((pokemon) => {
    if (generation && Number(pokemon.generation) !== Number(generation)) return false;
    if (type && !pokemon.types.some((t) => t === type)) return false;
    if (!query) return true;
    return nameKey(pokemon.name).includes(query) || String(pokemon.id) === String(Number(query));
  });
  shownCount = PAGE_SIZE;
  renderDirectory();
}

function renderDirectory() {
  const list = $('pokemon-list');
  list.replaceChildren();
  const slice = visiblePokemon.slice(0, shownCount);
  for (const pokemon of slice) {
    const card = makeElement('button', 'poke-card');
    card.type = 'button';
    card.setAttribute('aria-label', `Find counters for ${pokemon.name}, number ${pokemon.id}`);
    card.classList.toggle('selected', Boolean(selectedPokemon && selectedPokemon.id === pokemon.id));
    card.append(
      makeElement('span', 'poke-card-number', formatNumber(pokemon.id)),
      imageFor(pokemon, ''),
      makeElement('strong', '', pokemon.name),
      makeElement('span', 'poke-card-gen', `GEN ${pokemon.generation}`)
    );
    card.addEventListener('click', () => selectPokemon(pokemon));
    list.append(card);
  }
  if (!slice.length) list.append(makeElement('div', 'poke-list-placeholder', allPokemon.length ? 'No Pokémon match these filters. Try another name, type, or generation.' : 'No Pokémon loaded yet.'));

  $('visible-count').textContent = allPokemon.length ? `${visiblePokemon.length} found` : '—';
  $('directory-summary').textContent = allPokemon.length
    ? `Showing ${slice.length} of ${visiblePokemon.length} matches`
    : 'Waiting for Pokédex…';
  $('pokemon-more').hidden = shownCount >= visiblePokemon.length;
}

function renderOpponent(pokemon) {
  const target = $('pokemon-selection');
  target.className = 'poke-opponent';
  const details = makeElement('div');
  details.append(
    makeElement('span', 'poke-eyebrow', `${formatNumber(pokemon.id)}  ·  GENERATION ${pokemon.generation}`),
    makeElement('h3', '', pokemon.name),
    typePills(pokemon.types)
  );
  target.replaceChildren(imageFor(pokemon, 'poke-opponent-image'), details);
}

function metric(label, value, defensive = false) {
  const node = makeElement('div', 'poke-metric');
  const numeric = Number(value);
  const quality = defensive ? numeric <= 0.5 ? 'good' : numeric <= 1 ? 'neutral' : 'bad' : 'good';
  let subtitle = defensive ? 'max incoming STAB damage' : 'best outgoing STAB damage';
  if (defensive) {
    if (numeric === 0) subtitle = 'immune to target STAB';
    else if (numeric < 1) subtitle = 'resists target STAB';
    else if (numeric > 1) subtitle = 'weak to target STAB';
  }
  node.append(
    makeElement('span', '', label),
    makeElement('strong', quality, formatMultiplier(value)),
    makeElement('small', '', subtitle)
  );
  return node;
}

function renderAnalysis(data) {
  const target = $('pokemon-analysis');
  target.replaceChildren();
  if (!data.counter) {
    target.append(makeElement('div', 'poke-analysis-error', 'No super-effective type-based counters were found for this Pokémon.'));
    return;
  }
  target.append(makeElement('div', 'poke-subtitle', '✦  TOP RECOMMENDATION'));
  const best = makeElement('div', 'poke-best');
  const bestTop = makeElement('div', 'poke-best-top');
  const details = makeElement('div');
  details.append(
    makeElement('span', 'poke-eyebrow', `${formatNumber(data.counter.id)} · GEN ${data.counter.generation}`),
    makeElement('h3', '', data.counter.name),
    typePills(data.counter.types)
  );
  bestTop.append(imageFor(data.counter, ''), details);
  const stats = makeElement('div', 'poke-multipliers');
  stats.append(
    metric('Attack effectiveness', data.counter.attack_multiplier),
    metric('Damage received', data.counter.incoming_multiplier, true)
  );
  best.append(bestTop, stats, makeElement('p', 'poke-best-reason', data.counter.reason));
  target.append(best);

  const alternatives = Array.isArray(data.alternatives) ? data.alternatives : [];
  if (alternatives.length) {
    const heading = makeElement('div', 'poke-subtitle');
    heading.append(makeElement('span', '', 'OTHER STRONG MATCHUPS'), makeElement('b', '', `${alternatives.length} alternatives`));
    const grid = makeElement('div', 'poke-alt-list');
    for (const pokemon of alternatives) {
      const card = makeElement('div', 'poke-alt');
      const top = makeElement('div', 'poke-alt-top');
      const info = makeElement('div');
      info.append(makeElement('strong', '', pokemon.name), makeElement('small', '', `${formatNumber(pokemon.id)} · Gen ${pokemon.generation}`));
      top.append(imageFor(pokemon, ''), info);
      const bottom = makeElement('div', 'poke-alt-bottom');
      bottom.append(makeElement('span', '', `Attack ${formatMultiplier(pokemon.attack_multiplier)}`), makeElement('b', '', `Taken ${formatMultiplier(pokemon.incoming_multiplier)}`));
      card.append(top, typePills(pokemon.types), bottom);
      card.title = pokemon.reason || '';
      grid.append(card);
    }
    target.append(heading, grid);
  }
}

async function selectPokemon(pokemon) {
  selectedPokemon = pokemon;
  const requestId = ++latestRequest;
  renderDirectory();
  renderOpponent(pokemon);
  $('pokemon-analysis').replaceChildren(makeElement('div', 'poke-analysis-busy', `Finding the strongest counters for ${pokemon.name}…`));
  try {
    // Use the Pokédex ID to handle punctuation, symbols, and accented names reliably.
    const data = await api('/api/pokemon/counter', { pokemon: pokemon.id });
    if (requestId !== latestRequest) return; // Discard stale responses after a new selection.
    renderOpponent(data.selected || pokemon);
    renderAnalysis(data);
  } catch (error) {
    if (requestId !== latestRequest) return;
    $('pokemon-analysis').replaceChildren(makeElement('div', 'poke-analysis-error', error.message));
  }
}

async function loadPokemon() {
  setNotice('Loading Generation 1–6 Pokémon from the hosted Flask API…');
  try {
    const data = await api('/api/pokemon');
    if (!Array.isArray(data.pokemon)) throw new Error('The API response did not contain a Pokémon list.');
    allPokemon = data.pokemon.filter((p) => p && Number.isInteger(p.id) && typeof p.name === 'string' && Array.isArray(p.types) && Number.isInteger(p.generation)).sort((a, b) => a.id - b.id);
    if (!allPokemon.length) throw new Error('The API returned an empty Pokémon list.');
    setConnection(true);
    setNotice(`Pokédex connected. ${allPokemon.length} Pokémon available across Generations 1–6. Select one to discover its counters.`, 'ok');
    filterAndRender();
  } catch (error) {
    setConnection(false);
    setNotice(`${error.message} If the endpoints were just added, make sure the shared API was merged and redeployed on Render.`, 'error');
    renderDirectory();
  }
}

$('pokemon-search').addEventListener('input', filterAndRender);
$('pokemon-generation').addEventListener('change', filterAndRender);
$('pokemon-type').addEventListener('change', filterAndRender);
$('pokemon-more').addEventListener('click', () => { shownCount += PAGE_SIZE; renderDirectory(); });
loadPokemon();
