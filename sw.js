// Forces the service worker to activate immediately without waiting for a refresh
self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(clients.claim()));

// The proxy bridge URL
const PROXY_URL = 'https://api.allorigins.win/raw?url='; 

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Only intercept requests directed to our /service/ path
    if (url.pathname.startsWith('/service/')) {
        // Extract the actual website URL from the path
        const actualTarget = decodeURIComponent(url.pathname.split('/service/')[1]);
        
        event.respondWith(
            fetch(PROXY_URL + encodeURIComponent(actualTarget))
                .then(response => {
                    // We must return a new response to set the correct Content-Type
                    return response.text().then(html => {
                        const rewritten = rewriteHTML(html, actualTarget);
                        return new Response(rewritten, {
                            headers: { 'Content-Type': 'text/html' }
                        });
                    });
                })
                .catch(err => {
                    return new Response("Proxy Error: " + err, { status: 500 });
                })
        );
    }
});

/**
 * Rewrites relative links (like /style.css) into absolute links 
 * that point back through the proxy (/service/https://site.com/style.css)
 */
function rewriteHTML(html, target) {
    try {
        const urlObj = new URL(target);
        const origin = urlObj.origin;
        const path = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);

        return html.replace(/(href|src)=["']((?!http|data|#).+?)["']/g, (match, p1, p2) => {
            let fullUrl;
            if (p2.startsWith('/')) {
                // Root-relative path
                fullUrl = origin + p2;
            } else {
                // Relative path
                fullUrl = origin + path + p2;
            }
            return `${p1}="/service/${encodeURIComponent(fullUrl)}"`;
        });
    } catch (e) {
        return html; // Return original if parsing fails
    }
}