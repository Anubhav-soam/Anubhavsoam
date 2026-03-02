const DEFAULT_BLOGS = [
  { topic: 'Fixed Income', title: 'Yield Curve Basics: Reading the Macro Signal', date: 'May 2026', readTime: '6 min read', excerpt: 'How term structure shapes borrowing costs, recession cues, and portfolio duration decisions.' },
  { topic: 'Fixed Income', title: 'Duration vs Convexity in Volatile Rate Cycles', date: 'May 2026', readTime: '8 min read', excerpt: 'A practical guide to bond sensitivity and why convexity matters when rates move quickly.' },
  { topic: 'Equity Valuation', title: 'DCF Sanity Checks Before You Trust Fair Value', date: 'Apr 2026', readTime: '7 min read', excerpt: 'A checklist for assumptions: growth, margins, discount rates, and terminal value discipline.' }
];

let activeTopic = 'All';
let blogs = [];

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

function loadBlogs() {
  const saved = localStorage.getItem('blogs_data');
  blogs = saved ? JSON.parse(saved) : DEFAULT_BLOGS.map((p, idx) => ({ ...p, id: idx + 1 }));
}

function saveBlogs() {
  localStorage.setItem('blogs_data', JSON.stringify(blogs));
}

function likeStateFor(postId) { return localStorage.getItem(`blog_like_${postId}`) === '1'; }
function setLikeState(postId, liked) { localStorage.setItem(`blog_like_${postId}`, liked ? '1' : '0'); }
function likesCountFor(postId) { return 20 + postId + (likeStateFor(postId) ? 1 : 0); }

function renderTopics() {
  const strip = document.getElementById('topicStrip');
  if (!strip) return;
  const topics = ['All', ...new Set(blogs.map((item) => item.topic.trim()).filter(Boolean))];
  if (!topics.includes(activeTopic)) activeTopic = 'All';
  strip.innerHTML = topics.map((topic) => `<button class="topic-chip ${topic === activeTopic ? 'active' : ''}" data-topic="${topic}">${topic}</button>`).join('');
  strip.querySelectorAll('.topic-chip').forEach((button) => {
    button.addEventListener('click', () => {
      activeTopic = button.dataset.topic || 'All';
      renderTopics();
      renderBlogs();
    });
  });
}

function startEdit(id) {
  const post = blogs.find((b) => b.id === id);
  if (!post) return;
  document.getElementById('editPostId').value = String(post.id);
  document.getElementById('postTopic').value = post.topic;
  document.getElementById('postTitle').value = post.title;
  document.getElementById('postDate').value = post.date;
  document.getElementById('postReadTime').value = post.readTime;
  document.getElementById('postExcerpt').value = post.excerpt;
  document.getElementById('savePostBtn').textContent = 'Update Blog';
  document.getElementById('editorStatus').textContent = `Editing: ${post.title}`;
}

function clearEditor(message = '') {
  document.getElementById('blogEditorForm').reset();
  document.getElementById('editPostId').value = '';
  document.getElementById('savePostBtn').textContent = 'Publish Blog';
  document.getElementById('editorStatus').textContent = message;
}

function deletePost(id) {
  blogs = blogs.filter((b) => b.id !== id);
  saveBlogs();
  renderTopics();
  renderBlogs();
  clearEditor('Post deleted.');
}

function renderBlogs() {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;
  const filtered = activeTopic === 'All' ? blogs : blogs.filter((post) => post.topic === activeTopic);
  if (!filtered.length) {
    grid.innerHTML = '<article class="blog-card"><h3 class="blog-title">No blogs yet in this topic.</h3><p>Create one using the editor above.</p></article>';
    return;
  }

  grid.innerHTML = filtered.map((post) => {
    const liked = likeStateFor(post.id);
    const likes = likesCountFor(post.id);
    return `
      <article class="blog-card">
        <p class="blog-topic">${post.topic}</p>
        <h3 class="blog-title">${post.title}</h3>
        <p class="blog-meta">${post.date} · ${post.readTime}</p>
        <p>${post.excerpt}</p>
        <button class="blog-like-btn ${liked ? 'liked' : ''}" data-id="${post.id}" aria-label="Like blog post">${liked ? '💚 Liked' : '🤍 Like'} · <span>${likes}</span></button>
        <div class="card-actions">
          <button class="blog-edit-btn" data-edit="${post.id}">Edit</button>
          <button class="blog-delete-btn" data-delete="${post.id}">Delete</button>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.blog-like-btn').forEach((btn) => btn.addEventListener('click', () => { const id = Number(btn.dataset.id); setLikeState(id, !likeStateFor(id)); renderBlogs(); }));
  grid.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => startEdit(Number(btn.dataset.edit))));
  grid.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', () => deletePost(Number(btn.dataset.delete))));
}

function initEditor() {
  const form = document.getElementById('blogEditorForm');
  const cancel = document.getElementById('cancelEditBtn');
  if (!form || !cancel) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('editPostId').value.trim();
    const data = {
      topic: document.getElementById('postTopic').value.trim(),
      title: document.getElementById('postTitle').value.trim(),
      date: document.getElementById('postDate').value.trim(),
      readTime: document.getElementById('postReadTime').value.trim(),
      excerpt: document.getElementById('postExcerpt').value.trim()
    };

    if (id) {
      blogs = blogs.map((b) => (String(b.id) === id ? { ...b, ...data } : b));
      clearEditor('Blog updated successfully.');
    } else {
      const nextId = blogs.length ? Math.max(...blogs.map((b) => b.id)) + 1 : 1;
      blogs.unshift({ ...data, id: nextId });
      clearEditor('Blog published successfully.');
    }

    saveBlogs();
    renderTopics();
    renderBlogs();
  });

  cancel.addEventListener('click', () => clearEditor('Edit canceled.'));
}

(function init() {
  applyTheme(localStorage.getItem('theme') || 'dark');
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.addEventListener('click', () => applyTheme((document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark'));
  loadBlogs();
  initEditor();
  renderTopics();
  renderBlogs();
})();
