const BLOG_STORAGE_KEY = 'blogs_data';
const BLOG_DEFAULTS = [];

let activeTopic = 'All';
let managerFilter = 'all';
let blogs = [];

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.textContent = theme === 'light' ? '🌙 Dark' : '☀️ Light';
}

function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
  const target = document.getElementById(tab);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-links a').forEach((link) => {
    const expected = tab === 'portfolio' ? 'My Portfolio' : 'Blog';
    link.classList.toggle('active', link.textContent.trim() === expected);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function normalizeBlogs(rawBlogs) {
  if (!Array.isArray(rawBlogs)) return [];
  return rawBlogs
    .filter((post) => post && typeof post === 'object')
    .map((post, idx) => ({
      id: Number.isFinite(Number(post.id)) ? Number(post.id) : idx + 1,
      topic: String(post.topic || 'General').trim() || 'General',
      title: String(post.title || 'Untitled Post').trim() || 'Untitled Post',
      date: String(post.date || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })).trim(),
      readTime: String(post.readTime || '5 min read').trim() || '5 min read',
      status: String(post.status || 'published').toLowerCase() === 'draft' ? 'draft' : 'published',
      excerpt: String(post.excerpt || '').trim()
    }));
}

function saveBlogs() { localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(blogs)); }

function loadBlogs() {
  const saved = localStorage.getItem(BLOG_STORAGE_KEY);
  if (!saved) {
    blogs = normalizeBlogs(BLOG_DEFAULTS);
    saveBlogs();
    return;
  }
  try {
    blogs = normalizeBlogs(JSON.parse(saved));
    saveBlogs();
  } catch {
    blogs = normalizeBlogs(BLOG_DEFAULTS);
    saveBlogs();
  }
}

function likeStateFor(postId) { return localStorage.getItem(`blog_like_${postId}`) === '1'; }
function setLikeState(postId, liked) { localStorage.setItem(`blog_like_${postId}`, liked ? '1' : '0'); }
function likesCountFor(postId) { return 20 + postId + (likeStateFor(postId) ? 1 : 0); }

function renderTopics() {
  const strip = document.getElementById('topicStrip');
  if (!strip) return;
  const topics = ['All', ...new Set(blogs.filter((p)=>p.status==='published').map((post) => post.topic).filter(Boolean))];
  if (!topics.includes(activeTopic)) activeTopic = 'All';
  strip.innerHTML = topics
    .map((topic) => `<button class="topic-chip ${topic === activeTopic ? 'active' : ''}" data-topic="${topic}">${topic}</button>`)
    .join('');
  strip.querySelectorAll('.topic-chip').forEach((button) => {
    button.addEventListener('click', () => {
      activeTopic = button.dataset.topic || 'All';
      renderTopics();
      renderBlogs();
    });
  });
}

function setEditorMessage(message) {
  const status = document.getElementById('editorStatus');
  if (status) status.textContent = message;
}

function updatePreview() {
  const title = document.getElementById('postTitle').value.trim();
  const topic = document.getElementById('postTopic').value.trim();
  const date = document.getElementById('postDate').value.trim();
  const readTime = document.getElementById('postReadTime').value.trim();
  const status = document.getElementById('postStatus').value;
  const content = document.getElementById('postExcerpt').value.trim();

  document.getElementById('previewTitle').textContent = title || 'Your title appears here';
  document.getElementById('previewMeta').textContent = `${date || 'Date'} · ${readTime || 'Read time'} · ${(status || 'published').toUpperCase()}`;
  document.querySelector('#livePreview .blog-topic').textContent = topic || 'Preview';
  document.getElementById('previewBody').textContent = content || 'Start typing in the editor to see your live preview.';
}

function fillEditor(post) {
  document.getElementById('editPostId').value = String(post.id);
  document.getElementById('postTopic').value = post.topic;
  document.getElementById('postTitle').value = post.title;
  document.getElementById('postDate').value = post.date;
  document.getElementById('postReadTime').value = post.readTime;
  document.getElementById('postStatus').value = post.status;
  document.getElementById('postExcerpt').value = post.excerpt;
  document.getElementById('savePostBtn').textContent = post.status === 'draft' ? 'Update Draft' : 'Update Blog';
  updatePreview();
}

function startEdit(postId) {
  const post = blogs.find((entry) => entry.id === postId);
  if (!post) return setEditorMessage('Could not find blog to edit.');
  fillEditor(post);
  setEditorMessage(`Editing: ${post.title}`);
}

function clearEditor(message = '') {
  const form = document.getElementById('blogEditorForm');
  form.reset();
  document.getElementById('editPostId').value = '';
  document.getElementById('postStatus').value = 'published';
  document.getElementById('savePostBtn').textContent = 'Publish Blog';
  setEditorMessage(message);
  updatePreview();
}

function deletePost(postId) {
  blogs = blogs.filter((entry) => entry.id !== postId);
  saveBlogs();
  renderTopics();
  renderBlogs();
  renderDraftList();
  clearEditor('Blog deleted.');
}

function renderDraftList() {
  const draftList = document.getElementById('draftList');
  const searchTerm = (document.getElementById('draftSearch')?.value || '').trim().toLowerCase();
  if (!draftList) return;

  const visible = blogs.filter((post) => {
    const byFilter = managerFilter === 'all' || post.status === managerFilter;
    const bySearch = !searchTerm || `${post.title} ${post.topic}`.toLowerCase().includes(searchTerm);
    return byFilter && bySearch;
  });

  if (!visible.length) {
    draftList.innerHTML = '<p class="draft-empty">No matching blogs found. Try a new draft or change filters.</p>';
    return;
  }

  draftList.innerHTML = visible.map((post) => `
    <button type="button" class="draft-item" data-edit-draft="${post.id}">
      <span class="draft-topic">${post.topic}</span>
      <strong>${post.title}</strong>
      <small>${post.date} · ${post.readTime} · ${post.status.toUpperCase()}</small>
    </button>
  `).join('');

  draftList.querySelectorAll('[data-edit-draft]').forEach((btn) => {
    btn.addEventListener('click', () => startEdit(Number(btn.dataset.editDraft)));
  });
}

function renderBlogs() {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;

  const filtered = (activeTopic === 'All'
    ? blogs
    : blogs.filter((post) => post.topic === activeTopic)
  ).filter((post)=>post.status==='published');

  if (!filtered.length) {
    grid.innerHTML = '<article class="blog-card"><h3 class="blog-title">No published blogs yet.</h3><p>Write in the editor and publish to show posts here.</p></article>';
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
        <button class="blog-like-btn ${liked ? 'liked' : ''}" data-id="${post.id}" aria-label="Like blog post">
          ${liked ? '💚 Liked' : '🤍 Like'} · <span>${likes}</span>
        </button>
        <div class="card-actions">
          <button class="blog-edit-btn" data-edit="${post.id}">Edit</button>
          <button class="blog-delete-btn" data-delete="${post.id}">Delete</button>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.blog-like-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      setLikeState(id, !likeStateFor(id));
      renderBlogs();
    });
  });
  grid.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => startEdit(Number(btn.dataset.edit))));
  grid.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', () => deletePost(Number(btn.dataset.delete))));
}

function formPayload() {
  return {
    topic: document.getElementById('postTopic').value.trim(),
    title: document.getElementById('postTitle').value.trim(),
    date: document.getElementById('postDate').value.trim(),
    readTime: document.getElementById('postReadTime').value.trim(),
    status: document.getElementById('postStatus').value,
    excerpt: document.getElementById('postExcerpt').value.trim()
  };
}

function saveFromEditor() {
  const editingId = document.getElementById('editPostId').value.trim();
  const data = formPayload();
  if (editingId) {
    blogs = blogs.map((post) => (String(post.id) === editingId ? { ...post, ...data } : post));
    clearEditor(data.status === 'draft' ? 'Draft updated.' : 'Blog updated successfully.');
  } else {
    const nextId = blogs.length ? Math.max(...blogs.map((post) => post.id)) + 1 : 1;
    blogs.unshift({ ...data, id: nextId });
    clearEditor(data.status === 'draft' ? 'Draft saved.' : 'Blog published successfully.');
  }
  saveBlogs();
  renderTopics();
  renderBlogs();
  renderDraftList();
}

function initEditor() {
  const form = document.getElementById('blogEditorForm');
  const cancel = document.getElementById('cancelEditBtn');
  const fresh = document.getElementById('newPostBtn');
  const saveDraftBtn = document.getElementById('saveDraftBtn');
  const draftSearch = document.getElementById('draftSearch');
  if (!form || !cancel) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    document.getElementById('postStatus').value = 'published';
    saveFromEditor();
  });

  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', () => {
      document.getElementById('postStatus').value = 'draft';
      if (form.reportValidity()) saveFromEditor();
    });
  }

  cancel.addEventListener('click', () => clearEditor('Edit canceled.'));
  if (fresh) fresh.addEventListener('click', () => clearEditor('Ready for a new blog draft.'));
  if (draftSearch) draftSearch.addEventListener('input', renderDraftList);

  document.querySelectorAll('[data-manager-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      managerFilter = btn.dataset.managerFilter || 'all';
      document.querySelectorAll('[data-manager-filter]').forEach((item) => item.classList.remove('active'));
      btn.classList.add('active');
      renderDraftList();
    });
  });

  ['postTopic', 'postTitle', 'postDate', 'postReadTime', 'postStatus', 'postExcerpt'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updatePreview);
    if (el) el.addEventListener('change', updatePreview);
  });
}

(function init() {
  applyTheme(localStorage.getItem('theme') || 'dark');
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.addEventListener('click', () => applyTheme((document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark'));

  loadBlogs();
  initEditor();
  renderTopics();
  renderBlogs();
  renderDraftList();
  updatePreview();
})();
