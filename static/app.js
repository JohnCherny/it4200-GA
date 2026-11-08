const $ = (id) => document.getElementById(id);
const pages = {overview:'Overview',arcade:'Arcade',tools:'Developer tools',explore:'Explore API'};
let coinChoice = 'heads';
let latestSlug = '';
let toastTimer;

function showPage(page) {
  if (!pages[page]) return;
  document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === page));
  document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  $('page-name').textContent = pages[page];
  history.replaceState(null, '', `/#${page}`);
  window.scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('[data-page]').forEach(el => el.addEventListener('click', () => showPage(el.dataset.page)));
document.querySelectorAll('[data-jump]').forEach(el => el.addEventListener('click', () => showPage(el.dataset.jump)));

function notify(message, error = false) {
  clearTimeout(toastTimer);
  const el = $('toast');
  el.textContent = message;
  el.classList.toggle('error', error);
  el.classList.add('show');
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

async function api(path, params = {}) {
  const url = new URL(`/backend${path}`, location.origin);
  for (const [key, val] of Object.entries(params)) url.searchParams.set(key, val);
  let response;
  try { response = await fetch(url, {headers:{Accept:'application/json'}}); }
  catch { throw new Error('Cannot reach the API proxy. Start server.py and verify the hosted API is available.'); }
  let data;
  try { data = await response.json(); }
  catch { throw new Error('Unexpected response from the API.'); }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

function connect(buttonId, callback) {
  const button = $(buttonId);
  button.addEventListener('click', async () => {
    button.disabled = true;
    try { await callback(); }
    catch (err) { notify(err.message || 'Something went wrong.', true); }
    finally { button.disabled = false; }
  });
}

connect('refresh-api-btn', async () => {
  const output = $('api-json-output');
  const timestamp = $('api-refresh-time');

  output.textContent = 'Loading API response...';

  try {
    const data = await api('/status');
    output.textContent = JSON.stringify(data, null, 2);
    timestamp.textContent = `Last refreshed: ${new Date().toLocaleString()}`;
    notify('API response loaded successfully.');
  } catch (error) {
    output.textContent = `Unable to load API response: ${error.message}`;
    timestamp.textContent = 'Request failed.';
    throw error;
  }
});

async function healthCheck() {
  try {
    const d = await api('/status');
    $('stat-status').textContent = d.status === 'success' ? 'Online' : d.status;
    $('stat-endpoints').textContent = d.endpoints_count;
    $('api-state').textContent = 'API Online';
    $('sidebar-status').textContent = 'API connected';
    $('sidebar-dot').classList.add('online');
    $('top-dot').classList.add('online');
  } catch {
    $('stat-status').textContent = 'Offline';
    $('stat-endpoints').textContent = '—';
    $('api-state').textContent = 'API Offline';
    $('sidebar-status').textContent = 'API disconnected';
    $('sidebar-dot').classList.add('offline');
    $('top-dot').classList.add('offline');
  }
}

const symbolEmoji = {CHERRY:'🍒',LEMON:'🍋',BELL:'🔔',DIAMOND:'💎',SEVEN:'7️⃣'};
connect('spin-btn', async () => {
  const d = await api('/api/lucky-slot-machine');
  const reels = $('slot-reels');
  reels.replaceChildren(...d.spin.map(value => {
    const span = document.createElement('span');
    span.textContent = symbolEmoji[value] || value;
    span.title = value;
    return span;
  }));
  $('slot-result').textContent = d.message;
});

document.querySelectorAll('[data-coin]').forEach(button => button.addEventListener('click', () => {
  coinChoice = button.dataset.coin;
  document.querySelectorAll('[data-coin]').forEach(b => b.classList.toggle('selected', b.dataset.coin === coinChoice));
}));
connect('flip-btn', async () => {
  const d = await api('/coinflip/' + coinChoice);
  $('coin-visual').textContent = d.result === 'heads' ? 'H' : 'T';
  $('coin-result').textContent = `${d.won ? 'You win!' : 'You lose!'} It landed on ${d.result}.`;
});
connect('dice-btn', async () => {
  const count = Number($('dice-count').value);
  const sides = Number($('dice-sides').value);
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('Dice count must be between 1 and 10.');
  if (!Number.isInteger(sides) || sides < 2 || sides > 100) throw new Error('Sides must be between 2 and 100.');
  const d = await api('/dice-roll', {count,sides});
  $('dice-display').textContent = d.dice.join(' · ');
  $('dice-result').textContent = `Total: ${d.total} across ${d.count} dice`;
});
connect('eight-btn', async () => {
  const question = $('eight-question').value.trim();
  if (!question) throw new Error('Enter a question first.');
  const d = await api('/8Ball');
  $('eight-answer').textContent = '✦';
  $('eight-result').textContent = d.answer;
});
connect('slug-btn', async () => {
  const d = await api('/api/slugify', {text:$('slug-input').value,separator:$('slug-separator').value});
  latestSlug = d.slug;
  $('slug-output').textContent = d.slug || '(empty slug)';
});
$('copy-slug').addEventListener('click', async () => {
  if (!latestSlug) return notify('Generate a slug first.');
  try { await navigator.clipboard.writeText(latestSlug); notify('Slug copied to clipboard.'); }
  catch { notify('Clipboard access blocked. Select the displayed slug to copy it.', true); }
});
connect('word-btn', async () => {
  const text = $('word-input').value;
  if (!text.trim()) throw new Error('Enter some text to analyze.');
  const d = await api('/word-count', {text});
  $('word-words').textContent = d.words;
  $('word-characters').textContent = d.characters;
  $('word-reading').textContent = d.reading_time_minutes;
  $('word-result').textContent = 'Analysis complete.';
});
connect('oracle-btn', async () => {
  const d = await api('/oracle', {category:$('oracle-category').value});
  $('oracle-output').textContent = `“${d.prophecy}”`;
});
connect('cat-btn', async () => {
  const number = Number($('cat-number').value);
  if (!Number.isInteger(number) || number < 0 || number > 10000) throw new Error('Your number must be an integer from 0 to 10000.');
  const d = await api('/catbox', {number});
  const target = $('cat-output');
  target.replaceChildren();
  const avatar = document.createElement('span'); avatar.className='cat-avatar'; avatar.textContent='🐱';
  const name = document.createElement('strong'); name.textContent=`${d.name} · ${d.breed}`;
  const info = document.createElement('small'); info.textContent=`${d.sex} · ${d.quirk} · ID ${d.id}`;
  const match = document.createElement('small'); match.textContent=d.matches_cat_id ? '🎉 Your number matched the cat ID!' : 'No ID match this time.';
  target.append(avatar,name,info,match);
});
connect('fact-btn', async () => {
  const d = await api('/random-fact');
  $('fact-output').textContent=`“${d.fact}”`;
});
connect('compliment-btn', async () => {
  const d = await api('/compliment', {name:$('compliment-name').value.trim() || 'Developer'});
  $('compliment-output').textContent=`${d.name}: “${d.compliment}”`;
});
showPage(location.hash.slice(1) in pages ? location.hash.slice(1) : 'overview');
healthCheck();
connect('even-btn', async () => {
    const raw = $('even-number').value.trim();

    // Make sure the user entered something.
    if (!raw) {
        throw new Error('Please enter a number.');
    }

    const number = Number(raw);

    // Validate the input.
    if (!Number.isSafeInteger(number) || number < 0) {
        throw new Error('Please enter a valid non-negative whole number.');
    }

    // Call the class API.
    const data = await api(`/even-or-odd/${number}`);

    // Display the API response.
    $('even-result').textContent =
        `${data.input_number} is ${data.analysis.parity}.`;
});