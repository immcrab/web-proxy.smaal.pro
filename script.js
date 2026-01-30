let tabs = [];
let activeTabId = null;

const urlInput = document.getElementById('urlInput');
const viewerContainer = document.getElementById('viewer-container');
const tabBar = document.getElementById('tab-bar');
const newTabBtn = document.getElementById('new-tab-btn');

// Handle Enter Key
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') launch(urlInput.value);
});

document.getElementById('surfBtn').onclick = () => launch(urlInput.value);

function createNewTab(initialUrl = "") {
    const id = Date.now();
    const tabObj = { id, url: initialUrl, history: [] };
    tabs.push(tabObj);

    // Create Tab UI
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.id = `tab-${id}`;
    tabEl.innerHTML = `<span class="title">New Tab</span><span class="close-tab" onclick="closeTab(event, ${id})">×</span>`;
    tabEl.onclick = () => switchTab(id);
    tabBar.insertBefore(tabEl, newTabBtn);

    // Create Content Container
    const contentEl = document.createElement('div');
    contentEl.className = 'tab-content';
    contentEl.id = `content-${id}`;
    contentEl.innerHTML = '<div style="padding:20px; color:#666; text-align:center;">Enter a URL to start.</div>';
    viewerContainer.appendChild(contentEl);

    switchTab(id);
    if (initialUrl) launch(initialUrl);
}

function switchTab(id) {
    activeTabId = id;
    const currentTab = tabs.find(t => t.id === id);
    
    // Update UI
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    document.getElementById(`tab-${id}`).classList.add('active');
    document.getElementById(`content-${id}`).classList.add('active');
    
    urlInput.value = currentTab.url || "";
}

function closeTab(e, id) {
    e.stopPropagation();
    tabs = tabs.filter(t => t.id !== id);
    document.getElementById(`tab-${id}`).remove();
    document.getElementById(`content-${id}`).remove();
    
    if (activeTabId === id && tabs.length > 0) {
        switchTab(tabs[0].id);
    } else if (tabs.length === 0) {
        createNewTab();
    }
}

async function launch(target) {
    if (!target) return;
    if (!target.startsWith('http')) target = 'https://' + target;

    const currentTab = tabs.find(t => t.id === activeTabId);
    currentTab.url = target;
    const currentViewer = document.getElementById(`content-${activeTabId}`);
    const tabTitle = document.getElementById(`tab-${activeTabId}`).querySelector('.title');

    currentViewer.innerHTML = "Loading...";
    tabTitle.innerText = "Loading...";

    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`;
        const response = await fetch(proxyUrl);
        const html = await response.text();

        const base = new URL(target).origin;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Rewrite paths
        doc.querySelectorAll('[src], [href]').forEach(el => {
            let attr = el.hasAttribute('src') ? 'src' : 'href';
            let val = el.getAttribute(attr);
            if (val && !val.startsWith('http') && !val.startsWith('data:')) {
                el.setAttribute(attr, val.startsWith('/') ? base + val : base + '/' + val);
            }
        });

        tabTitle.innerText = doc.title || target.split('//')[1].substring(0, 10);
        currentViewer.innerHTML = doc.documentElement.innerHTML;

        // Intercept links within the tab
        currentViewer.querySelectorAll('a').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                urlInput.value = link.href;
                launch(link.href);
            };
        });

    } catch (err) {
        currentViewer.innerHTML = `<div style="padding:20px; color:red;">Failed to load: ${err.message}</div>`;
    }
}

// Start with one tab
createNewTab();