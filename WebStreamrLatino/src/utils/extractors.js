const axios = require('axios');

// ── Extractor VOE ──────────────────────────────────────────────────────────
async function extractVoe(url) {
    try {
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': url },
            timeout: 10000
        });
        const html = res.data;
        // VOE usa una variable 'wc0' o similar con la URL HLS
        const hlsMatch = html.match(/'hls':\s*'([^']+)'/);
        if (hlsMatch) return [{ url: hlsMatch[1], quality: '1080p', label: 'VOE' }];
        const mp4Match = html.match(/'mp4':\s*'([^']+)'/);
        if (mp4Match) return [{ url: mp4Match[1], quality: '720p', label: 'VOE' }];
    } catch (e) {}
    return [];
}

// ── Extractor FileMoon ─────────────────────────────────────────────────────
async function extractFilemoon(url) {
    try {
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://filemoon.sx/' },
            timeout: 10000
        });
        const html = res.data;
        const m3u8Match = html.match(/file:\s*"(https?:[^"]+\.m3u8[^"]*)"/);
        if (m3u8Match) return [{ url: m3u8Match[1], quality: '1080p', label: 'FileMoon' }];
    } catch (e) {}
    return [];
}

// ── Extractor StreamWish ───────────────────────────────────────────────────
async function extractStreamwish(url) {
    try {
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': url },
            timeout: 10000
        });
        const html = res.data;
        const m3u8Match = html.match(/file:\s*"(https?:[^"]+\.m3u8[^"]*)"/);
        if (m3u8Match) return [{ url: m3u8Match[1], quality: '1080p', label: 'StreamWish' }];
    } catch (e) {}
    return [];
}

// ── Extractor VidHide ──────────────────────────────────────────────────────
async function extractVidhide(url) {
    try {
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': url },
            timeout: 10000
        });
        const html = res.data;
        const m3u8Match = html.match(/file:\s*"(https?:[^"]+\.m3u8[^"]*)"/);
        if (m3u8Match) return [{ url: m3u8Match[1], quality: '1080p', label: 'VidHide' }];
    } catch (e) {}
    return [];
}

// ── Extractor DoodStream ───────────────────────────────────────────────────
async function extractDoodstream(url) {
    try {
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://dood.re/' },
            timeout: 10000
        });
        const html = res.data;
        const passMatch = html.match(/\/pass_md5\/[^'"]*/);
        if (!passMatch) return [];
        const passUrl = 'https://dood.re' + passMatch[0];
        const passRes = await axios.get(passUrl, {
            headers: { 'Referer': url },
            timeout: 10000
        });
        const token = html.match(/\?token=([^&'"]+)/);
        if (passRes.data && token) {
            const videoUrl = passRes.data + 'xYz123' + '?token=' + token[1] + '&expiry=' + Date.now();
            return [{ url: videoUrl, quality: '720p', label: 'DoodStream' }];
        }
    } catch (e) {}
    return [];
}

// ── Extractor Fastream ─────────────────────────────────────────────────────
async function extractFastream(url) {
    try {
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': url },
            timeout: 10000
        });
        const html = res.data;
        const m3u8Match = html.match(/file:\s*"(https?:[^"]+\.m3u8[^"]*)"/);
        if (m3u8Match) return [{ url: m3u8Match[1], quality: '1080p', label: 'Fastream' }];
        const mp4Match = html.match(/file:\s*"(https?:[^"]+\.mp4[^"]*)"/);
        if (mp4Match) return [{ url: mp4Match[1], quality: '720p', label: 'Fastream' }];
    } catch (e) {}
    return [];
}

// ── Extractor OkRu ────────────────────────────────────────────────────────
async function extractOkru(url) {
    try {
        const videoId = url.match(/video\/(\d+)/)?.[1];
        if (!videoId) return [];
        const apiUrl = `https://ok.ru/videoembed/${videoId}`;
        const res = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://ok.ru/' },
            timeout: 10000
        });
        const html = res.data;
        const dataMatch = html.match(/data-options="([^"]+)"/);
        if (dataMatch) {
            const data = JSON.parse(dataMatch[1].replace(/&quot;/g, '"'));
            const flashVars = data.flashvars || data;
            if (flashVars.hlsManifestUrl) {
                return [{ url: flashVars.hlsManifestUrl, quality: '720p', label: 'OkRu' }];
            }
        }
    } catch (e) {}
    return [];
}

// ── Router de extractores ──────────────────────────────────────────────────
async function extractStreams(embedUrl) {
    const url = embedUrl.toLowerCase();
    try {
        if (url.includes('voe.sx') || url.includes('voe.la'))
            return await extractVoe(embedUrl);
        if (url.includes('filemoon') || url.includes('moonplayer'))
            return await extractFilemoon(embedUrl);
        if (url.includes('streamwish') || url.includes('swish'))
            return await extractStreamwish(embedUrl);
        if (url.includes('vidhide') || url.includes('vid.icu'))
            return await extractVidhide(embedUrl);
        if (url.includes('dood') || url.includes('d0000d'))
            return await extractDoodstream(embedUrl);
        if (url.includes('fastream'))
            return await extractFastream(embedUrl);
        if (url.includes('ok.ru') || url.includes('odnoklassniki'))
            return await extractOkru(embedUrl);
        // Para hosters desconocidos intentar extracción genérica de m3u8/mp4
        return await extractGeneric(embedUrl);
    } catch (e) {
        return [];
    }
}

async function extractGeneric(url) {
    try {
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': url },
            timeout: 10000
        });
        const html = res.data;
        const m3u8 = html.match(/["'](https?:[^"']+\.m3u8[^"']*)['"]/);
        if (m3u8) return [{ url: m3u8[1], quality: '1080p', label: 'Stream' }];
        const mp4 = html.match(/["'](https?:[^"']+\.mp4[^"']*)['"]/);
        if (mp4) return [{ url: mp4[1], quality: '720p', label: 'Stream' }];
    } catch (e) {}
    return [];
}

module.exports = { extractStreams };
