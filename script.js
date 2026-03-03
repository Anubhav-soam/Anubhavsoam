const STORAGE_KEY = 'blog_cms_hier_v1';
const ADMIN_SESSION_KEY = 'blog_admin_mode';
const ADMIN_PASSWORD = 'Anubhavsoam';

let state = { topics: [] };
let activeTopic = 'All';
let adminMode = false;

function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.textContent = theme === 'light' ? '🌙 Dark' : '☀️ Light';
}

function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
  document.getElementById(tab)?.classList.add('active');
  document.querySelectorAll('.nav-links a').forEach((link) => {
    link.classList.toggle('active', link.textContent.trim() === (tab === 'portfolio' ? 'My Portfolio' : 'Blog'));
  });
}

function normalizeState(raw) {
  const topics = Array.isArray(raw?.topics) ? raw.topics : [];
  return {
    topics: topics.map((topic) => ({
      id: topic.id || uid('topic'),
      name: String(topic.name || 'General').trim() || 'General',
      posts: (Array.isArray(topic.posts) ? topic.posts : []).map((post) => ({
        id: post.id || uid('post'),
        title: String(post.title || 'Untitled').trim() || 'Untitled',
        content: String(post.content || '').trim(),
        featuredImage: String(post.featuredImage || '').trim(),
        createdAt: String(post.createdAt || new Date().toISOString()),
        likesCount: Number.isFinite(Number(post.likesCount)) ? Number(post.likesCount) : 0,
        comments: (Array.isArray(post.comments) ? post.comments : []).map((c) => ({
          id: c.id || uid('cmt'),
          author: String(c.author || 'Anonymous').trim() || 'Anonymous',
          text: String(c.text || '').trim(),
          createdAt: String(c.createdAt || new Date().toISOString())
        }))
      }))
    }))
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"topics":[]}');
    state = normalizeState(raw);
    saveState();
  } catch {
    state = { topics: [] };
    saveState();
  }
}

function allPostsWithTopic() {
  return state.topics.flatMap((topic) => topic.posts.map((post) => ({ ...post, topicId: topic.id, topicName: topic.name })));
}

function formatDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'Unknown date' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderTopicStrip() {
  const strip = document.getElementById('topicStrip');
  if (!strip) return;
  const topics = ['All', ...state.topics.map((t) => t.name)];
  if (!topics.includes(activeTopic)) activeTopic = 'All';
  strip.innerHTML = topics.map((name) => `<button class="topic-chip ${name===activeTopic?'active':''}" data-topic="${name}">${name}</button>`).join('');
  strip.querySelectorAll('[data-topic]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTopic = btn.dataset.topic || 'All';
      renderPosts();
      renderTopicStrip();
    });
  });
}

function renderDraftList() {
  const list = document.getElementById('draftList');
  if (!list) return;
  const posts = allPostsWithTopic();
  if (!posts.length) {
    list.innerHTML = '<p class="draft-empty">No posts yet. Create one below.</p>';
    return;
  }
  list.innerHTML = posts.map((post) => `
    <button type="button" class="draft-item" data-edit="${post.id}" data-topicid="${post.topicId}">
      ${post.featuredImage ? `<img class="draft-thumb" src="${post.featuredImage}" alt="${post.title}">` : ''}
      <span class="draft-topic">${post.topicName}</span>
      <strong>${post.title}</strong>
      <small>${formatDate(post.createdAt)} · ❤ ${post.likesCount}</small>
    </button>
  `).join('');
  list.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => fillEditor(btn.dataset.topicid, btn.dataset.edit));
  });
}

function renderPreview() {
  const imgSrc = document.getElementById('postImage').value.trim();
  const img = document.getElementById('previewImage');
  const title = document.getElementById('postTitle').value.trim();
  const topic = document.getElementById('postTopic').value.trim();
  const content = document.getElementById('postExcerpt').value.trim();

  document.getElementById('previewTitle').textContent = title || 'Your title appears here';
  document.querySelector('#livePreview .blog-topic').textContent = topic || 'Preview';
  document.getElementById('previewMeta').textContent = `${new Date().toLocaleDateString()} · ${(content.split(/\s+/).filter(Boolean).length/180||1).toFixed(0)} min read`;
  document.getElementById('previewBody').textContent = content || 'Start typing in the editor to see your live preview.';
  if (img && imgSrc) { img.src = imgSrc; img.hidden = false; } else if (img) { img.hidden = true; img.removeAttribute('src'); }
}

function renderPosts() {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;
  const posts = allPostsWithTopic().filter((post) => activeTopic === 'All' || post.topicName === activeTopic);
  if (!posts.length) {
    grid.innerHTML = '<article class="blog-card blog-card-wide"><h3 class="blog-title">No posts found.</h3><p>Create a topic and post in admin mode.</p></article>';
    return;
  }

  grid.innerHTML = posts.map((post) => `
    <article class="blog-card blog-card-wide" data-postid="${post.id}" data-topicid="${post.topicId}">
      ${post.featuredImage ? `<img class="blog-cover" src="${post.featuredImage}" alt="${post.title}">` : ''}
      <div class="blog-content-wrap">
        <p class="blog-topic">${post.topicName}</p>
        <h3 class="blog-title ${adminMode ? 'editable-field' : ''}" ${adminMode ? 'contenteditable="true" data-inline="title"' : ''}>${post.title}</h3>
        <p class="blog-meta">${formatDate(post.createdAt)} · ❤ ${post.likesCount}</p>
        <p class="${adminMode ? 'editable-field' : ''}" ${adminMode ? 'contenteditable="true" data-inline="content"' : ''}>${post.content}</p>
        <div class="blog-actions-row">
          <button class="blog-like-btn" data-like="${post.id}" data-topicid="${post.topicId}">🤍 Like · <span>${post.likesCount}</span></button>
          ${adminMode ? `<button class="blog-edit-btn" data-saveinline="${post.id}" data-topicid="${post.topicId}">Save Inline</button>
          <button class="blog-delete-btn" data-delete="${post.id}" data-topicid="${post.topicId}">Delete</button>
          <label class="blog-edit-btn upload-inline">Change Image<input type="file" accept="image/*" data-imgupload="${post.id}" data-topicid="${post.topicId}" hidden></label>` : ''}
        </div>
        <div class="comments-box">
          <h4>Comments (${post.comments.length})</h4>
          <div class="comment-list">${post.comments.map((c) => `<div class="comment-item"><strong>${c.author}:</strong> ${c.text}</div>`).join('') || '<p class="draft-empty">No comments yet.</p>'}</div>
          <form class="comment-form" data-commentform="${post.id}" data-topicid="${post.topicId}">
            <input type="text" name="author" placeholder="Your name" required>
            <input type="text" name="comment" placeholder="Write a comment" required>
            <button type="submit" class="btn btn-outline">Comment</button>
          </form>
        </div>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('[data-like]').forEach((btn) => btn.addEventListener('click', () => {
    const topic = state.topics.find((t) => t.id === btn.dataset.topicid);
    const post = topic?.posts.find((p) => p.id === btn.dataset.like);
    if (!post) return;
    post.likesCount += 1;
    saveState();
    renderPosts();
    renderDraftList();
  }));

  grid.querySelectorAll('[data-commentform]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const topic = state.topics.find((t) => t.id === form.dataset.topicid);
    const post = topic?.posts.find((p) => p.id === form.dataset.commentform);
    if (!post) return;
    const fd = new FormData(form);
    post.comments.push({ id: uid('cmt'), author: String(fd.get('author')||'Anonymous'), text: String(fd.get('comment')||''), createdAt: new Date().toISOString() });
    saveState();
    renderPosts();
  }));

  if (adminMode) {
    grid.querySelectorAll('[data-saveinline]').forEach((btn) => btn.addEventListener('click', () => {
      const card = btn.closest('[data-postid]');
      const topic = state.topics.find((t) => t.id === btn.dataset.topicid);
      const post = topic?.posts.find((p) => p.id === btn.dataset.saveinline);
      if (!card || !post) return;
      const title = card.querySelector('[data-inline="title"]')?.textContent?.trim() || post.title;
      const content = card.querySelector('[data-inline="content"]')?.textContent?.trim() || post.content;
      post.title = title;
      post.content = content;
      saveState();
      renderPosts();
      renderDraftList();
    }));

    grid.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', () => {
      const topic = state.topics.find((t) => t.id === btn.dataset.topicid);
      if (!topic) return;
      topic.posts = topic.posts.filter((p) => p.id !== btn.dataset.delete);
      if (!topic.posts.length) state.topics = state.topics.filter((t) => t.id !== topic.id);
      saveState();
      renderTopicStrip();
      renderDraftList();
      renderPosts();
    }));

    grid.querySelectorAll('[data-imgupload]').forEach((input) => input.addEventListener('change', () => {
      const file = input.files?.[0];
      const topic = state.topics.find((t) => t.id === input.dataset.topicid);
      const post = topic?.posts.find((p) => p.id === input.dataset.imgupload);
      if (!file || !post) return;
      const reader = new FileReader();
      reader.onload = () => {
        post.featuredImage = String(reader.result || '');
        saveState();
        renderPosts();
        renderDraftList();
      };
      reader.readAsDataURL(file);
    }));
  }
}

function fillEditor(topicId, postId) {
  const topic = state.topics.find((t) => t.id === topicId);
  const post = topic?.posts.find((p) => p.id === postId);
  if (!topic || !post) return;
  document.getElementById('editPostId').value = postId;
  document.getElementById('postTopic').value = topic.name;
  document.getElementById('postTitle').value = post.title;
  document.getElementById('postExcerpt').value = post.content;
  document.getElementById('postImage').value = post.featuredImage || '';
  renderPreview();
}

function clearEditor() {
  document.getElementById('blogEditorForm').reset();
  document.getElementById('editPostId').value = '';
  renderPreview();
}

function upsertFromForm(forceDraft = false) {
  const postId = document.getElementById('editPostId').value;
  const topicName = document.getElementById('postTopic').value.trim() || 'General';
  const title = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postExcerpt').value.trim();
  const image = document.getElementById('postImage').value.trim();
  if (!title || !content) return;

  let topic = state.topics.find((t) => t.name.toLowerCase() === topicName.toLowerCase());
  if (!topic) {
    topic = { id: uid('topic'), name: topicName, posts: [] };
    state.topics.unshift(topic);
  }

  if (postId) {
    const existing = state.topics.flatMap((t) => t.posts).find((p) => p.id === postId);
    if (!existing) return;
    existing.title = title;
    existing.content = content;
    existing.featuredImage = image;
  } else {
    topic.posts.unshift({
      id: uid('post'),
      title,
      content,
      featuredImage: image,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      comments: []
    });
  }

  saveState();
  clearEditor();
  renderTopicStrip();
  renderDraftList();
  renderPosts();
}

function bindAdmin() {
  const toggleBtn = document.getElementById('admin-toggle');
  const badge = document.getElementById('adminModeBadge');
  const adminPanel = document.querySelector('.blog-admin');
  if (!toggleBtn || !badge || !adminPanel) return;

  const applyAdminUi = () => {
    document.body.classList.toggle('admin-mode', adminMode);
    toggleBtn.textContent = adminMode ? '🛠 Exit Admin' : '🔒 Admin';
    badge.textContent = adminMode ? 'Admin mode: Editing enabled' : 'Visitor mode: Read-only';
    adminPanel.style.display = adminMode ? 'block' : 'none';
    sessionStorage.setItem(ADMIN_SESSION_KEY, adminMode ? '1' : '0');
    renderPosts();
  };

  adminMode = sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
  applyAdminUi();

  toggleBtn.addEventListener('click', () => {
    if (!adminMode) {
      const entered = prompt('Enter admin password to enable edit mode:');
      if (entered !== ADMIN_PASSWORD) {
        alert('Incorrect password.');
        return;
      }
      adminMode = true;
    } else {
      adminMode = false;
    }
    applyAdminUi();
  });
}

function bindEditor() {
  const form = document.getElementById('blogEditorForm');
  const newBtn = document.getElementById('newPostBtn');
  const saveDraft = document.getElementById('saveDraftBtn');
  const imageFile = document.getElementById('postImageFile');
  const exportBtn = document.getElementById('exportBlogsBtn');
  const importInput = document.getElementById('importBlogsFile');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    upsertFromForm(false);
  });

  saveDraft?.addEventListener('click', () => {
    if (form?.reportValidity()) upsertFromForm(true);
  });

  newBtn?.addEventListener('click', clearEditor);

  ['postTopic', 'postTitle', 'postExcerpt', 'postImage'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', renderPreview);
  });

  imageFile?.addEventListener('change', () => {
    const file = imageFile.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || '');
      document.getElementById('postImage').value = url;
      renderPreview();
    };
    reader.readAsDataURL(file);
  });

  exportBtn?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `blog-cms-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  importInput?.addEventListener('change', () => {
    const file = importInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state = normalizeState(JSON.parse(String(reader.result || '{}')));
        saveState();
        renderTopicStrip();
        renderDraftList();
        renderPosts();
      } catch {
        alert('Invalid import file.');
      }
    };
    reader.readAsText(file);
    importInput.value = '';
  });
}

(function init() {
  applyTheme(localStorage.getItem('theme') || 'dark');
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  loadState();
  bindEditor();
  bindAdmin();
  renderTopicStrip();
  renderDraftList();
  renderPosts();
  renderPreview();
})();
