function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.textContent = theme === 'light' ? '🌙 Dark' : '☀️ Light';
}

function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
  const next = document.getElementById(tab);
  if (next) next.classList.add('active');

  document.querySelectorAll('.nav-links a').forEach((a) => {
    const isActive = a.textContent.trim() === (tab === 'portfolio' ? 'My Portfolio' : 'Blog');
    a.classList.toggle('active', isActive);
  });

  if (tab === 'blog-tab' && !blogBootstrapped) {
    initBlogApp();
  }

  closeNavMenu();
  closeQuickActions();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}




function popResumeGraffiti() {
  const layer = document.createElement('div');
  layer.className = 'resume-confetti-layer';

  const burstCount = 160;
  const colors = ['#ff5a3d', '#ffd84d', '#7fffcf', '#5b8fff', '#b845ff', '#8df95f', '#ff7db8'];

  for (let i = 0; i < burstCount; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.setProperty('--x', `${Math.random() * 100}%`);
    piece.style.setProperty('--delay', `${Math.random() * 240}ms`);
    piece.style.setProperty('--duration', `${2.4 + Math.random() * 1.6}s`);
    piece.style.setProperty('--drift', `${-90 + Math.random() * 180}px`);
    piece.style.setProperty('--rot', `${Math.random() * 720}deg`);
    piece.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
    piece.classList.toggle('confetti-ribbon', Math.random() > 0.35);
    layer.appendChild(piece);
  }

  document.body.appendChild(layer);
  setTimeout(() => layer.classList.add('fade-out'), 2200);
  setTimeout(() => layer.remove(), 2900);
}

const certPreviewCache = new Map();
const CERT_IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp'];
const CERT_IMAGE_BASES = [
  'certificate',
  'https://raw.githubusercontent.com/Anubhav-soam/Anubhavsoam/main/certificate'
];

function normalizeCertName(value) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function candidateCertNames(certItem) {
  const key = certItem.dataset.certKey || '';
  const fileHint = certItem.dataset.certFile || '';
  const label = certItem.textContent.trim();
  const slug = normalizeCertName(label);
  const underscored = slug.replace(/-/g, '_');
  const spaced = label
    .replace(/–/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  return Array.from(new Set([fileHint, key, slug, underscored, spaced])).filter(Boolean);
}

function probeImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function resolveCertImage(certItem) {
  const cacheKey = certItem.dataset.certKey || certItem.textContent.trim();
  if (certPreviewCache.has(cacheKey)) {
    return certPreviewCache.get(cacheKey);
  }

  const names = candidateCertNames(certItem);
  for (const base of CERT_IMAGE_BASES) {
    for (const name of names) {
      for (const ext of CERT_IMAGE_EXTS) {
        const encodedName = encodeURIComponent(name).replace(/%2F/g, '/');
        const src = `${base}/${encodedName}.${ext}`;
        const found = await probeImage(src);
        if (found) {
          certPreviewCache.set(cacheKey, found);
          return found;
        }
      }
    }
  }

  certPreviewCache.set(cacheKey, null);
  return null;
}


function toRawGithubUrl(url) {
  if (!url) return '';
  if (url.includes('raw.githubusercontent.com')) return url;
  const blobMarker = 'github.com/';
  if (!url.includes(blobMarker) || !url.includes('/blob/')) return url;
  const parts = url.split('github.com/')[1].split('/');
  if (parts.length < 5) return url;
  const owner = parts[0];
  const repo = parts[1];
  const branch = parts[3];
  const path = parts.slice(4).join('/');
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

function toPdfPreviewUrl(url) {
  const rawUrl = toRawGithubUrl(url);
  return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(rawUrl)}`;
}

function ensureCertPopup() {
  let popup = document.getElementById('certHoverPopup');
  if (popup) return popup;

  popup = document.createElement('div');
  popup.id = 'certHoverPopup';
  popup.className = 'cert-hover-popup';
  popup.innerHTML = `
    <div class="cert-hover-title"></div>
    <img class="cert-hover-image" alt="Certificate preview" loading="lazy" />
    <iframe class="cert-hover-pdf" title="Certificate PDF preview"></iframe>
    <div class="cert-hover-msg"></div>
  `;
  document.body.appendChild(popup);
  return popup;
}

function initCertificatePreview() {
  const certGrid = document.getElementById('certGrid');
  if (!certGrid) return;

  const popup = ensureCertPopup();
  const title = popup.querySelector('.cert-hover-title');
  const image = popup.querySelector('.cert-hover-image');
  const pdf = popup.querySelector('.cert-hover-pdf');
  const msg = popup.querySelector('.cert-hover-msg');

  certGrid.querySelectorAll('.cert-item[data-cert-key]').forEach((certItem) => {
    certItem.addEventListener('mouseenter', async () => {
      const certName = certItem.textContent.trim();
      popup.classList.remove('missing');
      popup.classList.add('visible');
      title.textContent = certName;
      msg.textContent = 'Loading certificate...';
      image.removeAttribute('src');
      pdf.removeAttribute('src');
      pdf.style.display = 'none';
      image.style.display = 'block';

      const directUrl = certItem.dataset.certUrl || '';
      if (directUrl) {
        const previewUrl = toRawGithubUrl(directUrl);
        if (/\.pdf($|\?)/i.test(previewUrl)) {
          pdf.src = toPdfPreviewUrl(previewUrl);
          pdf.style.display = 'block';
          image.style.display = 'none';
          msg.textContent = '';
          return;
        }
        image.src = previewUrl;
        msg.textContent = '';
        return;
      }

      const src = await resolveCertImage(certItem);
      if (!src) {
        popup.classList.add('missing');
        msg.textContent = 'Preview configured only for Alteryx and Derivatives for now.';
        return;
      }

      image.src = src;
      msg.textContent = '';
    });
  });

  certGrid.addEventListener('mouseleave', () => {
    popup.classList.remove('visible');
    popup.classList.remove('missing');
    image.removeAttribute('src');
    pdf.removeAttribute('src');
    pdf.style.display = 'none';
    image.style.display = 'block';
  });
}

function initResumeGraffiti() {
  const resumeBtn = document.getElementById('resumeBtn');
  if (!resumeBtn) return;

  resumeBtn.addEventListener('click', () => {
    popResumeGraffiti();
    closeQuickActions();
    closeNavMenu();
  });
}

function toggleNavMenu() {
  const nav = document.querySelector('.main-nav');
  const btn = document.getElementById('nav-toggle');
  if (!nav || !btn) return;
  const open = nav.classList.toggle('nav-open');
  btn.setAttribute('aria-expanded', String(open));
  btn.textContent = open ? '✕' : '☰';
}

function closeNavMenu() {
  const nav = document.querySelector('.main-nav');
  const btn = document.getElementById('nav-toggle');
  if (!nav || !btn) return;
  nav.classList.remove('nav-open');
  btn.setAttribute('aria-expanded', 'false');
  btn.textContent = '☰';
}


function toggleQuickActions() {
  const wrap = document.querySelector('.nav-actions-wrap');
  const btn = document.getElementById('nav-actions-toggle');
  if (!wrap || !btn) return;
  const open = wrap.classList.toggle('open');
  btn.setAttribute('aria-expanded', String(open));
}

function closeQuickActions() {
  const wrap = document.querySelector('.nav-actions-wrap');
  const btn = document.getElementById('nav-actions-toggle');
  if (!wrap || !btn) return;
  wrap.classList.remove('open');
  btn.setAttribute('aria-expanded', 'false');
}

function initQuickActions() {
  const btn = document.getElementById('nav-actions-toggle');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleQuickActions();
  });

  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('.nav-actions-wrap');
    if (!wrap || !wrap.classList.contains('open')) return;
    if (!wrap.contains(e.target)) closeQuickActions();
  });
}
function initNavMenu() {
  const btn = document.getElementById('nav-toggle');
  if (!btn) return;

  btn.addEventListener('click', toggleNavMenu);

  document.addEventListener('click', (e) => {
    const nav = document.querySelector('.main-nav');
    if (!nav || !nav.classList.contains('nav-open')) return;
    if (!nav.contains(e.target)) closeNavMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeNavMenu();
  });
}

const ADMIN_PASSWORD = 'admin123';
const DB_KEY = 'glass_blog_v1';
const CLOUD_CONFIG = {
  provider: 'supabase',
  url: window.BLOG_CLOUD_CONFIG?.url || '',
  anonKey: window.BLOG_CLOUD_CONFIG?.anonKey || '',
  table: window.BLOG_CLOUD_CONFIG?.table || 'blog_state',
  stateId: window.BLOG_CLOUD_CONFIG?.stateId || 'main'
};

const DEFAULT_DB = {
  topics: [
    { id: 't1', name: 'Excel Terms & Concepts', emoji: '', desc: 'Master the building blocks of Excel from lookups to pivots.', cover: '' },
    { id: 't2', name: 'Equity Research', emoji: '', desc: 'Break down financial statements and valuation frameworks.', cover: '' }
  ],
  posts: [
    {
      id: 'p1', topicId: 't1', title: 'VLOOKUP vs XLOOKUP: Which Should You Use?', cover: '',
      content: '# VLOOKUP vs XLOOKUP\n\nFor decades, **VLOOKUP** was the go-to lookup function in Excel. But Microsoft introduced **XLOOKUP** in 2019 and it solves almost every limitation.\n\n## Key Differences\n\n- VLOOKUP can only look right. XLOOKUP looks in any direction.\n- XLOOKUP returns a range, not just one cell.\n- `=XLOOKUP(lookup, range, return_range)` is cleaner syntax.\n\n> If you\'re on Microsoft 365, switch to XLOOKUP. It\'s strictly better.\n\nThat said, VLOOKUP is still worth knowing for legacy spreadsheets.',
      date: '2025-11-10', likes: 12
    },
    {
      id: 'p2', topicId: 't1', title: 'INDEX-MATCH: The Power Combo Explained', cover: '',
      content: '# INDEX-MATCH\n\nBefore XLOOKUP, **INDEX-MATCH** was the expert\'s alternative to VLOOKUP.\n\n## Why It\'s Powerful\n\n- Works left, right, up, down.\n- More efficient on large datasets.\n- `=INDEX(return_col, MATCH(value, lookup_col, 0))`\n\n> Once you learn INDEX-MATCH, you\'ll use it everywhere.',
      date: '2025-11-18', likes: 7
    },
    {
      id: 'p3', topicId: 't2', title: 'How to Read a Balance Sheet in 10 Minutes', cover: '',
      content: '# Reading a Balance Sheet\n\nA balance sheet has three sections: **Assets**, **Liabilities**, and **Equity**.\n\n## The Golden Equation\n\n> Assets = Liabilities + Equity\n\n## What to Look For\n\n- Current ratio: Current Assets / Current Liabilities\n- Debt-to-equity: Total Debt / Shareholders Equity\n- Working capital signals short-term health.\n\nAlways read the balance sheet alongside the income statement and cash flow.',
      date: '2025-12-01', likes: 21
    }
  ],
  comments: {
    p1: [{ author: 'Rahul M.', text: 'Super helpful, switched to XLOOKUP immediately!', ts: '2025-11-12T09:14:00Z' }],
    p3: [{ author: 'Priya S.', text: 'Clear and concise, great for beginners.', ts: '2025-12-03T14:22:00Z' }]
  }
};

let DB = {};
let blogState = {
  isAdmin: false,
  view: 'topics',
  activeTopic: null,
  activePost: null,
  editingTopic: null,
  editingPost: null
};
let blogBootstrapped = false;
let cloudStatusState = { mode: 'local', message: 'Local only' };
let cloudSaveQueue = Promise.resolve();

function setCloudStatus(mode, message) {
  cloudStatusState = { mode, message };
  const badge = document.getElementById('cloudStatus');
  if (badge) badge.textContent = message;
}

function updateCloudControls() {
  const btn = document.getElementById('syncNowBtn');
  if (btn) btn.style.display = isCloudConfigured() ? 'inline-flex' : 'none';
  const badge = document.getElementById('cloudStatus');
  if (badge) badge.textContent = cloudStatusState.message;
}

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

function normalizeDB(candidate) {
  return {
    topics: Array.isArray(candidate?.topics) ? candidate.topics : deepClone(DEFAULT_DB.topics),
    posts: Array.isArray(candidate?.posts) ? candidate.posts : deepClone(DEFAULT_DB.posts),
    comments: candidate?.comments && typeof candidate.comments === 'object' ? candidate.comments : deepClone(DEFAULT_DB.comments)
  };
}

function isCloudConfigured() {
  return Boolean(CLOUD_CONFIG.url && CLOUD_CONFIG.anonKey);
}

async function cloudLoadDB() {
  if (!isCloudConfigured()) return null;
  const url = `${CLOUD_CONFIG.url}/rest/v1/${CLOUD_CONFIG.table}?id=eq.${encodeURIComponent(CLOUD_CONFIG.stateId)}&select=data`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: CLOUD_CONFIG.anonKey,
      Authorization: `Bearer ${CLOUD_CONFIG.anonKey}`
    }
  });
  if (!res.ok) throw new Error(`Cloud load failed (${res.status})`);
  const rows = await res.json();
  return rows?.[0]?.data ? normalizeDB(rows[0].data) : null;
}

async function cloudSaveDB(data) {
  if (!isCloudConfigured()) return;
  const url = `${CLOUD_CONFIG.url}/rest/v1/${CLOUD_CONFIG.table}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: CLOUD_CONFIG.anonKey,
      Authorization: `Bearer ${CLOUD_CONFIG.anonKey}`,
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify([{ id: CLOUD_CONFIG.stateId, data }])
  });
  if (!res.ok) throw new Error(`Cloud save failed (${res.status})`);
}

async function loadDB() {
  const localFallback = () => {
    try {
      const raw = localStorage.getItem(DB_KEY);
      return raw ? normalizeDB(JSON.parse(raw)) : deepClone(DEFAULT_DB);
    } catch {
      return deepClone(DEFAULT_DB);
    }
  };

  try {
    if (!isCloudConfigured()) {
      DB = localFallback();
      setCloudStatus('local', 'Local only (not configured)');
    } else {
      const remote = await cloudLoadDB();
      if (remote) {
        DB = remote;
        setCloudStatus('cloud', 'Connected');
      } else {
        DB = localFallback();
        await cloudSaveDB(DB);
        setCloudStatus('cloud', 'Connected (initialized)');
      }
    }
  } catch (err) {
    DB = localFallback();
    setCloudStatus('local', 'Cloud error, using local');
    console.warn('Cloud load failed:', err.message);
  }

  try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch {}
}

function saveDB() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch {}
  if (isCloudConfigured()) {
    cloudSaveQueue = cloudSaveQueue
      .then(() => cloudSaveDB(DB))
      .then(() => setCloudStatus('cloud', 'Connected'))
      .catch((err) => {
        setCloudStatus('local', 'Cloud sync failed');
        console.warn('Cloud sync failed:', err.message);
      });
  }
}

async function syncCloudNow() {
  if (!isCloudConfigured()) {
    toast('Cloud DB not configured. Add BLOG_CLOUD_CONFIG first.');
    setCloudStatus('local', 'Local only (not configured)');
    return;
  }
  try {
    setCloudStatus('cloud', 'Syncing…');
    await cloudSaveDB(DB);
    setCloudStatus('cloud', 'Connected');
    toast('Synced to cloud');
  } catch (err) {
    setCloudStatus('local', 'Cloud sync failed');
    toast('Cloud sync failed');
    console.warn('Cloud sync failed:', err.message);
  }
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtDate(d) { return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); }
function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function md2html(md) {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(?!<[h|u|b|l])/, '<p>')
    .replace(/$(?<![>])/, '</p>');
}

function toggleAdmin() {
  if (!blogState.isAdmin) {
    const pw = prompt('Enter admin password:');
    if (pw !== ADMIN_PASSWORD) {
      toast('Wrong password');
      return;
    }
  }
  blogState.isAdmin = !blogState.isAdmin;
  const adminBtn = document.getElementById('adminBtn');
  if (adminBtn) {
    adminBtn.classList.toggle('active', blogState.isAdmin);
    adminBtn.textContent = blogState.isAdmin ? 'Admin ON' : 'Admin';
  }
  renderBlog();
  toast(blogState.isAdmin ? 'Admin mode enabled' : 'Admin mode disabled');
}

function showView(v, id) {
  blogState.view = v;
  if (v === 'posts') blogState.activeTopic = id;
  if (v === 'single') blogState.activePost = id;
  renderBlog();
  window.scrollTo(0, 0);
}

function renderBlog() {
  const root = document.getElementById('blogRoot');
  if (!root) return;
  if (blogState.view === 'topics') root.innerHTML = renderTopics();
  if (blogState.view === 'posts') root.innerHTML = renderPosts();
  if (blogState.view === 'single') root.innerHTML = renderSingle();
  updateFAB();
  updateCloudControls();
}

function renderTopics() {
  const cards = DB.topics.map((t) => {
    const count = DB.posts.filter((p) => p.topicId === t.id).length;
    const coverHtml = t.cover ? `<img src="${t.cover}" class="topic-cover" alt="">` : '';
    return `<div class="glass topic-card" onclick="showView('posts','${t.id}')">
      ${coverHtml}
      <div class="topic-name">${esc(t.name)}</div>
      <div class="topic-desc">${esc(t.desc)}</div>
      <div class="topic-meta">${count} post${count !== 1 ? 's' : ''}</div>
      ${blogState.isAdmin ? `<div style="margin-top:14px;display:flex;gap:8px;" onclick="event.stopPropagation()">
        <button class="btn btn-amber" onclick="openTopicModal('${t.id}')">Edit</button>
        <button class="btn btn-danger" onclick="deleteTopic('${t.id}')">Delete</button>
      </div>` : ''}
    </div>`;
  }).join('');

  const addCard = blogState.isAdmin
    ? `<div class="glass add-card" onclick="openTopicModal()"><span class="add-icon">＋</span><span class="add-label">New Topic</span></div>`
    : '';

  const empty = DB.topics.length === 0 && !blogState.isAdmin
    ? '<div class="empty-state"><div class="empty-icon">-</div>No topics yet.</div>'
    : '';

  return `<div class="section-title">Topics</div><div class="section-sub">// browse all blog categories</div>${empty}<div class="topics-grid">${cards}${addCard}</div>`;
}

function renderPosts() {
  const topic = DB.topics.find((t) => t.id === blogState.activeTopic);
  if (!topic) return '<button class="back-btn" onclick="showView(\'topics\')">← Back</button>';
  const posts = DB.posts.filter((p) => p.topicId === topic.id);

  const items = posts.map((p) => {
    const comments = (DB.comments[p.id] || []).length;
    return `<div class="glass post-item" onclick="showView('single','${p.id}')">
      <div class="post-info">
        <div class="post-title">${esc(p.title)}</div>
        <div class="post-excerpt">${esc(p.content.replace(/[#*>`-]/g, '').slice(0, 110))}…</div>
        <div class="post-meta"><span>Date: ${fmtDate(p.date)}</span><span>Likes: ${p.likes || 0}</span><span>Comments: ${comments}</span></div>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="empty-icon">-</div>No posts yet.</div>';

  return `<button class="back-btn" onclick="showView('topics')">← Back to Topics</button>
  <div class="posts-header"><div><div class="section-title">${esc(topic.name)}</div><div class="section-sub">${esc(topic.desc)}</div></div>
  ${blogState.isAdmin ? '<button class="btn btn-green" onclick="openPostModal()">New Post</button>' : ''}</div>${items}`;
}

function renderSingle() {
  const post = DB.posts.find((p) => p.id === blogState.activePost);
  if (!post) return '<button class="back-btn" onclick="showView(\'topics\')">← Back</button>';
  const topic = DB.topics.find((t) => t.id === post.topicId);
  const comments = DB.comments[post.id] || [];
  const liked = localStorage.getItem(`liked_${post.id}`) === '1';

  const coverHtml = post.cover ? `<img src="${post.cover}" class="post-hero" alt="">` : '';
  const commentsList = comments.length
    ? comments.map((c) => `<div class="glass comment-item"><div class="comment-author">${esc(c.author || 'Anonymous')} · ${fmtDate(c.ts)}</div><div class="comment-text">${esc(c.text)}</div></div>`).join('')
    : '<div class="empty-state" style="padding:24px 0"><div class="empty-icon">-</div>No comments yet. Be first!</div>';

  return `<button class="back-btn" onclick="showView('posts','${post.topicId}')">← Back to ${esc(topic ? topic.name : 'Posts')}</button>
    ${coverHtml}
    <div class="post-breadcrumb">${esc(topic ? topic.name : '')}</div>
    <h1 class="post-headline">${esc(post.title)}</h1>
    <div class="post-byline"><span>Date: ${fmtDate(post.date)}</span><span id="likeCount">Likes: ${post.likes || 0}</span><span>Comments: ${comments.length}</span></div>
    ${blogState.isAdmin ? `<div class="post-actions"><button class="btn btn-amber" onclick="openPostModal('${post.id}')">Edit Post</button><button class="btn btn-danger" onclick="deletePost('${post.id}')">Delete</button></div>` : ''}
    <div class="glass post-body">${md2html(post.content)}</div>
    <div class="like-row"><button class="like-btn${liked ? ' liked' : ''}" id="likeBtn" onclick="toggleLike('${post.id}')">${liked ? 'Liked' : 'Like this post'}</button></div>
    <div class="comments-section"><div class="comments-title">Comments (${comments.length})</div>
      <div class="glass comment-form">
        <label class="field-label">Your name (optional)</label>
        <input class="field-input" id="cName" placeholder="e.g. Rahul M." style="margin-bottom:10px">
        <label class="field-label">Comment</label>
        <textarea class="field-input" id="cText" rows="3" placeholder="Share your thoughts…"></textarea>
        <button class="btn btn-blue" onclick="submitComment('${post.id}')">Post Comment →</button>
      </div>${commentsList}
    </div>`;
}

function toggleLike(pid) {
  const post = DB.posts.find((p) => p.id === pid);
  if (!post) return;
  const liked = localStorage.getItem(`liked_${pid}`) === '1';
  if (liked) {
    post.likes = Math.max(0, (post.likes || 0) - 1);
    localStorage.removeItem(`liked_${pid}`);
  } else {
    post.likes = (post.likes || 0) + 1;
    localStorage.setItem(`liked_${pid}`, '1');
  }
  saveDB();
  renderBlog();
}

function submitComment(pid) {
  const text = document.getElementById('cText')?.value?.trim();
  if (!text) {
    toast('Please write a comment first');
    return;
  }
  const author = document.getElementById('cName')?.value?.trim() || 'Anonymous';
  if (!DB.comments[pid]) DB.comments[pid] = [];
  DB.comments[pid].push({ author, text, ts: new Date().toISOString() });
  saveDB();
  renderBlog();
  toast('Comment posted.');
}

function openTopicModal(id) {
  blogState.editingTopic = id || null;
  const t = id ? DB.topics.find((x) => x.id === id) : null;
  showModal(`<div class="modal-title">${t ? 'Edit Topic' : 'New Topic'}</div>
    <button class="modal-close" onclick="closeModal()">×</button>
    <label class="field-label">Topic Name</label><input class="field-input" id="tName" value="${esc(t?.name || '')}" placeholder="e.g. Excel Tips">
    <label class="field-label">Description</label><textarea class="field-input" id="tDesc" rows="2" placeholder="Short description…">${esc(t?.desc || '')}</textarea>
    <label class="field-label">Cover Image (optional)</label><img id="tImgPreview" class="img-preview" src="${t?.cover || ''}" style="${t?.cover ? 'display:block' : ''}">
    <input type="file" accept="image/*" onchange="previewImg(this,'tImgPreview','tImgData')" style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:16px"><input type="hidden" id="tImgData" value="${esc(t?.cover || '')}">
    <button class="btn btn-amber" onclick="saveTopic()" style="width:100%;padding:12px">Save Topic →</button>`);
}

function saveTopic() {
  const name = document.getElementById('tName').value.trim();
  if (!name) {
    toast('Topic name required');
    return;
  }
  const data = {
    id: blogState.editingTopic || uid(),
    name,
    emoji: '',
    desc: document.getElementById('tDesc').value.trim(),
    cover: document.getElementById('tImgData').value
  };
  if (blogState.editingTopic) {
    const i = DB.topics.findIndex((t) => t.id === blogState.editingTopic);
    if (i >= 0) DB.topics[i] = data;
  } else DB.topics.push(data);
  saveDB();
  closeModal();
  renderBlog();
  toast('Topic saved.');
}

function deleteTopic(id) {
  if (!confirm('Delete this topic and all its posts?')) return;
  DB.topics = DB.topics.filter((t) => t.id !== id);
  DB.posts = DB.posts.filter((p) => p.topicId !== id);
  saveDB();
  showView('topics');
  toast('Topic deleted.');
}

function openPostModal(id) {
  blogState.editingPost = id || null;
  const p = id ? DB.posts.find((x) => x.id === id) : null;
  const topicOptions = DB.topics.map((t) => `<option value="${t.id}"${(p?.topicId || blogState.activeTopic) === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
  showModal(`<div class="modal-title">${p ? 'Edit Post' : 'New Post'}</div><button class="modal-close" onclick="closeModal()">×</button>
    <label class="field-label">Title</label><input class="field-input" id="pTitle" value="${esc(p?.title || '')}" placeholder="Post title…">
    <label class="field-label">Topic</label><select class="field-input" id="pTopic">${topicOptions}</select>
    <label class="field-label">Cover Image (optional)</label><img id="pImgPreview" class="img-preview" src="${p?.cover || ''}" style="${p?.cover ? 'display:block' : ''}">
    <input type="file" accept="image/*" onchange="previewImg(this,'pImgPreview','pImgData')" style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:16px"><input type="hidden" id="pImgData" value="${esc(p?.cover || '')}">
    <label class="field-label">Content (Markdown)</label><textarea class="field-input" id="pContent" rows="10" placeholder="# Heading\n\n**Bold**, *italic*, \`code\`, > quote, - list">${esc(p?.content || '')}</textarea>
    <button class="btn btn-green" onclick="savePost()" style="width:100%;padding:12px">Publish →</button>`);
}

function savePost() {
  const title = document.getElementById('pTitle').value.trim();
  const content = document.getElementById('pContent').value.trim();
  if (!title) {
    toast('Title required');
    return;
  }
  if (!content) {
    toast('Content required');
    return;
  }
  const data = {
    id: blogState.editingPost || uid(),
    topicId: document.getElementById('pTopic').value,
    title,
    content,
    cover: document.getElementById('pImgData').value,
    date: new Date().toISOString().slice(0, 10),
    likes: blogState.editingPost ? DB.posts.find((p) => p.id === blogState.editingPost)?.likes || 0 : 0
  };
  if (blogState.editingPost) {
    const i = DB.posts.findIndex((p) => p.id === blogState.editingPost);
    if (i >= 0) DB.posts[i] = data;
    closeModal();
    renderBlog();
    toast('Post updated.');
  } else {
    DB.posts.push(data);
    saveDB();
    closeModal();
    showView('single', data.id);
    toast('Post published.');
  }
  saveDB();
}

function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  const tid = DB.posts.find((p) => p.id === id)?.topicId;
  DB.posts = DB.posts.filter((p) => p.id !== id);
  delete DB.comments[id];
  saveDB();
  showView('posts', tid);
  toast('Post deleted.');
}

function previewImg(input, previewId, hiddenId) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById(previewId);
    const hidden = document.getElementById(hiddenId);
    preview.src = e.target.result;
    preview.style.display = 'block';
    hidden.value = e.target.result;
  };
  reader.readAsDataURL(file);
}

function showModal(html) {
  document.getElementById('modalBox').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function updateFAB() {
  const fab = document.getElementById('fab');
  if (!fab) return;
  const show = blogState.isAdmin && (blogState.view === 'posts' || blogState.view === 'topics');
  fab.classList.toggle('visible', show);
}

async function initBlogApp() {
  await loadDB();
  renderBlog();
  updateCloudControls();
  document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') closeModal();
  });
  blogBootstrapped = true;
}

(function init() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);
  initNavMenu();
  initQuickActions();
  initResumeGraffiti();
  initCertificatePreview();

  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
})();
