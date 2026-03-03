const BLOG_DATA = [
  {
    topic: 'Fixed Income',
    title: 'Yield Curve Basics: Reading the Macro Signal',
    date: 'May 2026',
    readTime: '6 min read',
    excerpt: 'How term structure shapes borrowing costs, recession cues, and portfolio duration decisions.'
  },
  {
    topic: 'Fixed Income',
    title: 'Duration vs Convexity in Volatile Rate Cycles',
    date: 'May 2026',
    readTime: '8 min read',
    excerpt: 'A practical guide to bond sensitivity and why convexity matters when rates move quickly.'
  },
  {
    topic: 'Equity Valuation',
    title: 'DCF Sanity Checks Before You Trust Fair Value',
    date: 'Apr 2026',
    readTime: '7 min read',
    excerpt: 'A checklist for assumptions: growth, margins, discount rates, and terminal value discipline.'
  },
  {
    topic: 'Risk Management',
    title: 'Building Position Sizing Rules That Survive Drawdowns',
    date: 'Apr 2026',
    readTime: '5 min read',
    excerpt: 'Simple risk controls for concentration, correlation shocks, and portfolio resilience.'
  },
  {
    topic: 'Macro Strategy',
    title: 'Inflation Regimes and Asset-Class Rotation',
    date: 'Mar 2026',
    readTime: '7 min read',
    excerpt: 'How changing inflation and policy cycles influence allocation across equity, debt, and cash.'
  }
];

let activeTopic = 'All';

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

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function likeStateFor(postId) {
  const key = `blog_like_${postId}`;
  return localStorage.getItem(key) === '1';
}

function setLikeState(postId, liked) {
  localStorage.setItem(`blog_like_${postId}`, liked ? '1' : '0');
}

function likesCountFor(postId) {
  const base = 20 + (postId * 3);
  const bump = likeStateFor(postId) ? 1 : 0;
  return base + bump;
}

function renderTopics() {
  const strip = document.getElementById('topicStrip');
  if (!strip) return;

  const topics = ['All', ...new Set(BLOG_DATA.map((item) => item.topic))];
  strip.innerHTML = topics.map((topic) =>
    `<button class="topic-chip ${topic === activeTopic ? 'active' : ''}" data-topic="${topic}">${topic}</button>`
  ).join('');

  strip.querySelectorAll('.topic-chip').forEach((button) => {
    button.addEventListener('click', () => {
      activeTopic = button.dataset.topic || 'All';
      renderTopics();
      renderBlogs();
    });
  });
}

function renderBlogs() {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;

  const filtered = activeTopic === 'All'
    ? BLOG_DATA
    : BLOG_DATA.filter((post) => post.topic === activeTopic);

  grid.innerHTML = filtered.map((post) => {
    const id = BLOG_DATA.indexOf(post);
    const liked = likeStateFor(id);
    const likes = likesCountFor(id);

    return `
      <article class="blog-card">
        <p class="blog-topic">${post.topic}</p>
        <h3 class="blog-title">${post.title}</h3>
        <p class="blog-meta">${post.date} · ${post.readTime}</p>
        <p>${post.excerpt}</p>
        <button class="blog-like-btn ${liked ? 'liked' : ''}" data-id="${id}" aria-label="Like blog post">
          ${liked ? '💚 Liked' : '🤍 Like'} · <span>${likes}</span>
        </button>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.blog-like-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const next = !likeStateFor(id);
      setLikeState(id, next);
      renderBlogs();
    });
  });
}

(function init() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);

  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  renderTopics();
  renderBlogs();
})();
