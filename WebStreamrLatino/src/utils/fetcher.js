const axios = require('axios');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
};

async function fetchHtml(url, extra = {}) {
    try {
        const res = await axios.get(url, {
            headers: { ...HEADERS, ...extra },
            timeout: 12000,
            maxRedirects: 5,
        });
        return res.data;
    } catch(e) {
        return null;
    }
}

async function fetchJson(url, extra = {}) {
    try {
        const res = await axios.get(url, {
            headers: { ...HEADERS, 'Accept': 'application/json', ...extra },
            timeout: 10000,
        });
        return res.data;
    } catch(e) {
        return null;
    }
}

// Extrae iframes y URLs de embeds de un HTML
function extractEmbeds(html) {
    if (!html) return [];
    const embeds = new Set();

    // iframes src
    const iframeRe = /<iframe[^>]+src=["']([^"']+)["']/gi;
    let m;
    while ((m = iframeRe.exec(html)) !== null) {
        if (m[1].startsWith('http')) embeds.add(m[1]);
    }

    // data-src
    const dataSrcRe = /data-src=["']([^"']+)["']/gi;
    while ((m = dataSrcRe.exec(html)) !== null) {
        if (m[1].startsWith('http')) embeds.add(m[1]);
    }

    // file: "url" o source: "url"
    const fileRe = /(?:file|source|src)\s*:\s*["'`](https?:[^"'`\s]+)["'`]/gi;
    while ((m = fileRe.exec(html)) !== null) embeds.add(m[1]);

    // m3u8 o mp4 directos
    const directRe = /["'`](https?:[^"'`\s]+\.(?:m3u8|mp4)[^"'`\s]*)["'`]/gi;
    while ((m = directRe.exec(html)) !== null) embeds.add(m[1]);

    return [...embeds];
}

module.exports = { fetchHtml, fetchJson, extractEmbeds, HEADERS };
