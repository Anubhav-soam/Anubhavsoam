// ============================================================
//  BLOG APP — GLASSMORPHISM EDITION
// ============================================================

const ADMIN_PASSWORD = "admin123";
const DB_KEY = "glass_blog_v1";

// ── Default seed data ────────────────────────────────────────
const DEFAULT_DB = {
  topics: [
    { id: "t1", name: "Excel Terms & Concepts", emoji: "📊",
      desc: "Master the building blocks of Excel from lookups to pivots.",
      cover: "" },
    { id: "t2", name: "Equity Research", emoji: "📈",
      desc: "Break down financial statements and valuation frameworks.",
      cover: "" }
  ],
  posts: [
    { id: "p1", topicId: "t1", title: "VLOOKUP vs XLOOKUP: Which Should You Use?",
      cover: "",
      content: "# VLOOKUP vs XLOOKUP\n\nFor decades, **VLOOKUP** was the go-to lookup function in Excel. But Microsoft introduced **XLOOKUP** in 2019 and it solves almost every limitation.\n\n## Key Differences\n\n- VLOOKUP can only look right. XLOOKUP looks in any direction.\n- XLOOKUP returns a range, not just one cell.\n- `=XLOOKUP(lookup, range, return_range)` is cleaner syntax.\n\n> If you're on Microsoft 365, switch to XLOOKUP. It's strictly better.\n\nThat said, VLOOKUP is still worth knowing for legacy spreadsheets.",
      date: "2025-11-10", likes: 12 },
    { id: "p2", topicId: "t1", title: "INDEX-MATCH: The Power Combo Explained",
      cover: "",
      content: "# INDEX-MATCH\n\nBefore XLOOKUP, **INDEX-MATCH** was the expert's alternative to VLOOKUP.\n\n## Why It's Powerful\n\n- Works left, right, up, down.\n- More efficient on large datasets.\n- `=INDEX(return_col, MATCH(value, lookup_col, 0))`\n\n> Once you learn INDEX-MATCH, you'll use it everywhere.",
      date: "2025-11-18", likes: 7 },
    { id: "p3", topicId: "t2", title: "How to Read a Balance Sheet in 10 Minutes",
      cover: "",
      content: "# Reading a Balance Sheet\n\nA balance sheet has three sections: **Assets**, **Liabilities**, and **Equity**.\n\n## The Golden Equation\n\n> Assets = Liabilities + Equity\n\n## What to Look For\n\n- Current ratio: Current Assets / Current Liabilities\n- Debt-to-equity: Total Debt / Shareholders Equity\n- Working capital signals short-term health.\n\nAlways read the balance sheet alongside the income statement and cash flow.",
      date: "2025-12-01", likes: 21 }
  ],
  comments: {
    p1: [{ author: "Rahul M.", text: "Super helpful, switched to XLOOKUP immediately!", ts: "2025-11-12T09:14:00Z" }],
    p3: [{ author: "Priya S.", text: "Clear and concise, great for beginners.", ts: "2025-12-03T14:22:00Z" }]
  }
};

// ── State ────────────────────────────────────────────────────
let DB = {};
let state = {
  isAdmin: false,
  view: "topics",       // topics | posts | single
  activeTopic: null,
  activePost: null,
  editingTopic: null,
  editingPost: null
};

// ── Storage ──────────────────────────────────────────────────
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    DB = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_DB));
  } catch { DB = JSON.parse(JSON.stringify(DEFAULT_DB)); }
}
function saveDB() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch {}
}

// ── Utilities ────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function esc(s) {
  return String(s||"")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { year:"numeric", month:"short", day:"numeric" });
}
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}

// ── Markdown parser ──────────────────────────────────────────
function md2html(md) {
  return md
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm,  "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,    "<em>$1</em>")
    .replace(/`(.+?)`/g,      "<code>$1</code>")
    .replace(/^> (.+)$/gm,    "<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm,    "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^(?!<[h|u|b|l])/, "<p>")
    .replace(/$(?<![>])/, "</p>");
}

// ── Admin ────────────────────────────────────────────────────
function toggleAdmin() {
  if (!state.isAdmin) {
    const pw = prompt("Enter admin password:");
    if (pw !== ADMIN_PASSWORD) { toast("❌ Wrong password"); return; }
  }
  state.isAdmin = !state.isAdmin;
  document.getElementById("adminBtn").classList.toggle("active", state.isAdmin);
  document.getElementById("adminBtn").textContent = state.isAdmin ? "⚙ Admin ON" : "⚙ Admin";
  render();
  toast(state.isAdmin ? "🔓 Admin mode enabled" : "🔒 Admin mode disabled");
}

// ── View switcher ────────────────────────────────────────────
function showView(v, id) {
  state.view = v;
  if (v === "posts")  { state.activeTopic = id; }
  if (v === "single") { state.activePost  = id; }
  render();
  window.scrollTo(0, 0);
}

// ── Render dispatcher ────────────────────────────────────────
function render() {
  const root = document.getElementById("blogRoot");
  if (state.view === "topics")  root.innerHTML = renderTopics();
  if (state.view === "posts")   root.innerHTML = renderPosts();
  if (state.view === "single")  root.innerHTML = renderSingle();
  updateFAB();
}

// ── Render: Topics ───────────────────────────────────────────
function renderTopics() {
  const cards = DB.topics.map(t => {
    const count = DB.posts.filter(p => p.topicId === t.id).length;
    const coverHtml = t.cover
      ? `<img src="${t.cover}" class="topic-cover" alt="">`
      : "";
    return `
      <div class="glass topic-card" onclick="showView('posts','${t.id}')">
        ${coverHtml}
        <span class="topic-emoji">${esc(t.emoji)}</span>
        <div class="topic-name">${esc(t.name)}</div>
        <div class="topic-desc">${esc(t.desc)}</div>
        <div class="topic-meta">${count} post${count!==1?"s":""}</div>
        ${state.isAdmin ? `
          <div style="margin-top:14px;display:flex;gap:8px;" onclick="event.stopPropagation()">
            <button class="btn btn-amber" onclick="openTopicModal('${t.id}')">✏ Edit</button>
            <button class="btn btn-danger" onclick="deleteTopic('${t.id}')">🗑</button>
          </div>` : ""}
      </div>`;
  }).join("");

  const addCard = state.isAdmin
    ? `<div class="glass add-card" onclick="openTopicModal()">
         <span class="add-icon">＋</span>
         <span class="add-label">New Topic</span>
       </div>` : "";

  const empty = DB.topics.length === 0 && !state.isAdmin
    ? `<div class="empty-state"><div class="empty-icon">📂</div>No topics yet.</div>` : "";

  return `
    <div class="section-title">Topics</div>
    <div class="section-sub">// browse all blog categories</div>
    ${empty}
    <div class="topics-grid">${cards}${addCard}</div>`;
}

// ── Render: Posts ────────────────────────────────────────────
function renderPosts() {
  const topic = DB.topics.find(t => t.id === state.activeTopic);
  if (!topic) return `<button class="back-btn" onclick="showView('topics')">← Back</button>`;
  const posts = DB.posts.filter(p => p.topicId === topic.id);

  const items = posts.map(p => {
    const comments = (DB.comments[p.id] || []).length;
    const thumb = p.cover
      ? `<img src="${p.cover}" class="post-thumb" alt="">`
      : `<div class="post-thumb-placeholder">${esc(topic.emoji)}</div>`;
    return `
      <div class="glass post-item" onclick="showView('single','${p.id}')">
        ${thumb}
        <div class="post-info">
          <div class="post-title">${esc(p.title)}</div>
          <div class="post-excerpt">${esc(p.content.replace(/[#*>`-]/g,"").slice(0,110))}…</div>
          <div class="post-meta">
            <span>📅 ${fmtDate(p.date)}</span>
            <span>♥ ${p.likes||0}</span>
            <span>💬 ${comments}</span>
          </div>
        </div>
      </div>`;
  }).join("") || `<div class="empty-state"><div class="empty-icon">✍️</div>No posts yet.</div>`;

  return `
    <button class="back-btn" onclick="showView('topics')">← Back to Topics</button>
    <div class="posts-header">
      <div>
        <div class="section-title">${esc(topic.emoji)} ${esc(topic.name)}</div>
        <div class="section-sub">${esc(topic.desc)}</div>
      </div>
      ${state.isAdmin ? `<button class="btn btn-green" onclick="openPostModal()">✍ New Post</button>` : ""}
    </div>
    ${items}`;
}

// ── Render: Single ───────────────────────────────────────────
function renderSingle() {
  const post  = DB.posts.find(p => p.id === state.activePost);
  if (!post) return `<button class="back-btn" onclick="showView('topics')">← Back</button>`;
  const topic = DB.topics.find(t => t.id === post.topicId);
  const comments = DB.comments[post.id] || [];
  const liked = localStorage.getItem("liked_"+post.id) === "1";

  const coverHtml = post.cover
    ? `<img src="${post.cover}" class="post-hero" alt="">` : "";

  const commentsList = comments.length
    ? comments.map(c => `
        <div class="glass comment-item">
          <div class="comment-author">${esc(c.author||"Anonymous")} · ${fmtDate(c.ts)}</div>
          <div class="comment-text">${esc(c.text)}</div>
        </div>`).join("")
    : `<div class="empty-state" style="padding:24px 0"><div class="empty-icon">💬</div>No comments yet. Be first!</div>`;

  return `
    <button class="back-btn" onclick="showView('posts','${post.topicId}')">← Back to ${esc(topic?topic.name:"Posts")}</button>
    ${coverHtml}
    <div class="post-breadcrumb">${esc(topic?topic.emoji+' '+topic.name:"")}</div>
    <h1 class="post-headline">${esc(post.title)}</h1>
    <div class="post-byline">
      <span>📅 ${fmtDate(post.date)}</span>
      <span id="likeCount">♥ ${post.likes||0} likes</span>
      <span>💬 ${comments.length} comments</span>
    </div>

    ${state.isAdmin ? `
    <div class="post-actions">
      <button class="btn btn-amber" onclick="openPostModal('${post.id}')">✏ Edit Post</button>
      <button class="btn btn-danger" onclick="deletePost('${post.id}')">🗑 Delete</button>
    </div>` : ""}

    <div class="glass post-body">${md2html(post.content)}</div>

    <div class="like-row">
      <button class="like-btn${liked?" liked":""}" id="likeBtn" onclick="toggleLike('${post.id}')">
        ${liked?"♥":"♡"} ${liked?"Liked":"Like this post"}
      </button>
    </div>

    <div class="comments-section">
      <div class="comments-title">Comments (${comments.length})</div>
      <div class="glass comment-form">
        <label class="field-label">Your name (optional)</label>
        <input class="field-input" id="cName" placeholder="e.g. Rahul M." style="margin-bottom:10px">
        <label class="field-label">Comment</label>
        <textarea class="field-input" id="cText" rows="3" placeholder="Share your thoughts…"></textarea>
        <button class="btn btn-blue" onclick="submitComment('${post.id}')">Post Comment →</button>
      </div>
      ${commentsList}
    </div>`;
}

// ── Like ─────────────────────────────────────────────────────
function toggleLike(pid) {
  const post = DB.posts.find(p => p.id === pid);
  if (!post) return;
  const liked = localStorage.getItem("liked_"+pid) === "1";
  if (liked) { post.likes = Math.max(0,(post.likes||0)-1); localStorage.removeItem("liked_"+pid); }
  else        { post.likes = (post.likes||0)+1;           localStorage.setItem("liked_"+pid,"1"); }
  saveDB(); render();
}

// ── Comment ──────────────────────────────────────────────────
function submitComment(pid) {
  const text = document.getElementById("cText")?.value?.trim();
  if (!text) { toast("⚠ Please write a comment first"); return; }
  const author = document.getElementById("cName")?.value?.trim() || "Anonymous";
  if (!DB.comments[pid]) DB.comments[pid] = [];
  DB.comments[pid].push({ author, text, ts: new Date().toISOString() });
  saveDB(); render(); toast("💬 Comment posted!");
}

// ── Topic Modal ──────────────────────────────────────────────
function openTopicModal(id) {
  state.editingTopic = id || null;
  const t = id ? DB.topics.find(x=>x.id===id) : null;
  showModal(`
    <div class="modal-title">${t?"Edit Topic":"New Topic"}</div>
    <button class="modal-close" onclick="closeModal()">×</button>
    <label class="field-label">Topic Name</label>
    <input class="field-input" id="tName" value="${esc(t?.name||"")}" placeholder="e.g. Excel Tips">
    <label class="field-label">Emoji Icon</label>
    <input class="field-input" id="tEmoji" value="${esc(t?.emoji||"📝")}" placeholder="📝" style="width:80px">
    <label class="field-label">Description</label>
    <textarea class="field-input" id="tDesc" rows="2" placeholder="Short description…">${esc(t?.desc||"")}</textarea>
    <label class="field-label">Cover Image (optional)</label>
    <img id="tImgPreview" class="img-preview" src="${t?.cover||""}" style="${t?.cover?"display:block":""}">
    <input type="file" accept="image/*" onchange="previewImg(this,'tImgPreview','tImgData')" style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:16px">
    <input type="hidden" id="tImgData" value="${esc(t?.cover||"")}">
    <button class="btn btn-amber" onclick="saveTopic()" style="width:100%;padding:12px">Save Topic →</button>
  `);
}
function saveTopic() {
  const name = document.getElementById("tName").value.trim();
  if (!name) { toast("⚠ Topic name required"); return; }
  const data = {
    id: state.editingTopic || uid(),
    name,
    emoji: document.getElementById("tEmoji").value.trim() || "📝",
    desc:  document.getElementById("tDesc").value.trim(),
    cover: document.getElementById("tImgData").value
  };
  if (state.editingTopic) {
    const i = DB.topics.findIndex(t=>t.id===state.editingTopic);
    if (i>=0) DB.topics[i] = data;
  } else { DB.topics.push(data); }
  saveDB(); closeModal(); render(); toast("✅ Topic saved!");
}
function deleteTopic(id) {
  if (!confirm("Delete this topic and all its posts?")) return;
  DB.topics = DB.topics.filter(t=>t.id!==id);
  DB.posts   = DB.posts.filter(p=>p.topicId!==id);
  saveDB(); showView("topics"); toast("🗑 Topic deleted.");
}

// ── Post Modal ───────────────────────────────────────────────
function openPostModal(id) {
  state.editingPost = id || null;
  const p = id ? DB.posts.find(x=>x.id===id) : null;
  const topicOptions = DB.topics.map(t =>
    `<option value="${t.id}"${(p?.topicId||state.activeTopic)===t.id?" selected":""}>${esc(t.emoji+' '+t.name)}</option>`
  ).join("");
  showModal(`
    <div class="modal-title">${p?"Edit Post":"New Post"}</div>
    <button class="modal-close" onclick="closeModal()">×</button>
    <label class="field-label">Title</label>
    <input class="field-input" id="pTitle" value="${esc(p?.title||"")}" placeholder="Post title…">
    <label class="field-label">Topic</label>
    <select class="field-input" id="pTopic">${topicOptions}</select>
    <label class="field-label">Cover Image (optional)</label>
    <img id="pImgPreview" class="img-preview" src="${p?.cover||""}" style="${p?.cover?"display:block":""}">
    <input type="file" accept="image/*" onchange="previewImg(this,'pImgPreview','pImgData')" style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:16px">
    <input type="hidden" id="pImgData" value="${esc(p?.cover||"")}">
    <label class="field-label">Content (Markdown)</label>
    <textarea class="field-input" id="pContent" rows="10" placeholder="# Heading\n\n**Bold**, *italic*, \`code\`, > quote, - list">${esc(p?.content||"")}</textarea>
    <button class="btn btn-green" onclick="savePost()" style="width:100%;padding:12px">Publish →</button>
  `);
}
function savePost() {
  const title = document.getElementById("pTitle").value.trim();
  const content = document.getElementById("pContent").value.trim();
  if (!title)   { toast("⚠ Title required"); return; }
  if (!content) { toast("⚠ Content required"); return; }
  const data = {
    id: state.editingPost || uid(),
    topicId: document.getElementById("pTopic").value,
    title, content,
    cover: document.getElementById("pImgData").value,
    date:  new Date().toISOString().slice(0,10),
    likes: state.editingPost ? DB.posts.find(p=>p.id===state.editingPost)?.likes||0 : 0
  };
  if (state.editingPost) {
    const i = DB.posts.findIndex(p=>p.id===state.editingPost);
    if (i>=0) DB.posts[i] = data;
    closeModal(); render(); toast("✅ Post updated!");
  } else {
    DB.posts.push(data);
    saveDB(); closeModal(); showView("single", data.id); toast("🚀 Post published!");
  }
  saveDB();
}
function deletePost(id) {
  if (!confirm("Delete this post?")) return;
  const tid = DB.posts.find(p=>p.id===id)?.topicId;
  DB.posts = DB.posts.filter(p=>p.id!==id);
  delete DB.comments[id];
  saveDB(); showView("posts", tid); toast("🗑 Post deleted.");
}

// ── Image preview ────────────────────────────────────────────
function previewImg(input, previewId, hiddenId) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById(previewId);
    const hidden  = document.getElementById(hiddenId);
    preview.src = e.target.result;
    preview.style.display = "block";
    hidden.value = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Modal helpers ─────────────────────────────────────────────
function showModal(html) {
  document.getElementById("modalBox").innerHTML = html;
  document.getElementById("modalOverlay").classList.add("open");
}
function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
}

// ── FAB ──────────────────────────────────────────────────────
function updateFAB() {
  const fab = document.getElementById("fab");
  if (fab) {
    const show = state.isAdmin && (state.view==="posts"||state.view==="topics");
    fab.classList.toggle("visible", show);
  }
}

// ── Init ─────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  loadDB();
  render();
  document.getElementById("modalOverlay")?.addEventListener("click", e => {
    if (e.target.id === "modalOverlay") closeModal();
  });
});
