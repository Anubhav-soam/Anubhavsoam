const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  if (themeToggle) {
    themeToggle.textContent = theme === 'light' ? 'Dark Mode' : 'Light Mode';
  }
}

const storedTheme = localStorage.getItem('theme') || 'dark';
applyTheme(storedTheme);

themeToggle?.addEventListener('click', () => {
  const nextTheme = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  applyTheme(nextTheme);
  localStorage.setItem('theme', nextTheme);
});

function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach((tab) => tab.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach((link) => link.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  document.getElementById(`nav-${tabId}`)?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const likesStorageKey = 'blogLikes';
const likesState = JSON.parse(localStorage.getItem(likesStorageKey) || '{}');

function syncLikesUI() {
  document.querySelectorAll('.blog-card').forEach((card) => {
    const postId = card.dataset.postId;
    const count = likesState[postId] || 0;
    const countEl = card.querySelector('.like-count');
    if (countEl) countEl.textContent = count;
  });
}

function persistLikes() {
  localStorage.setItem(likesStorageKey, JSON.stringify(likesState));
}

document.querySelectorAll('.like-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const card = button.closest('.blog-card');
    if (!card) return;
    const postId = card.dataset.postId;
    likesState[postId] = (likesState[postId] || 0) + 1;
    persistLikes();
    syncLikesUI();
    button.classList.add('liked-pop');
    setTimeout(() => button.classList.remove('liked-pop'), 220);
  });
});

const topicChips = document.querySelectorAll('.topic-chip');
const topicSections = document.querySelectorAll('.blog-topic');

function filterTopics(topic) {
  topicSections.forEach((section) => {
    const group = section.dataset.topicGroup;
    const visible = topic === 'all' || group === topic;
    section.style.display = visible ? 'block' : 'none';
  });
}

topicChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    topicChips.forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    filterTopics(chip.dataset.topic);
  });
});

syncLikesUI();
filterTopics('all');
