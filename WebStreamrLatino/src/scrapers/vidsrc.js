const { fetchJson } = require('../utils/fetcher');

const BASE = 'https://vidsrc.xyz';

async function getStreams(tmdbId, type, title, year, season, episode) {
    const streams = [];
    try {
        let embedUrl;
        if (type === 'tv') {
            embedUrl = `${BASE}/embed/tv/${tmdbId}/${season}/${episode}`;
        } else {
            embedUrl = `${BASE}/embed/movie/${tmdbId}`;
        }

        // VidSrc devuelve el embed directo — lo pasamos al extractor
        const { extractStreams } = require('../utils/extractors');
        const extracted = await extractStreams(embedUrl);
        streams.push(...extracted.map(s => ({
            ...s,
            source: 'VidSrc',
            language: 'en'
        })));
    } catch (e) {
        console.error('[VidSrc] Error:', e.message);
    }
    return streams;
}

module.exports = { getStreams, id: 'vidsrc', name: 'VidSrc', language: 'en' };
