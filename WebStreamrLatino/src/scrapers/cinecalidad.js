const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { extractStreams } = require('../utils/extractors');

const BASE = 'https://cinecalidad.foo';

async function getStreams(tmdbId, type, title, year, season, episode) {
    const streams = [];
    if (type === 'tv') return streams; // CineCalidad es solo películas
    try {
        const query = encodeURIComponent(`${title} ${year}`);
        const html = await fetchHtml(`${BASE}/?s=${query}`, { 'Referer': BASE });
        if (!html) return streams;
        const $ = cheerio.load(html);

        let pageUrl = null;
        $('.result-item a, article a').each((i, el) => {
            if (pageUrl) return;
            const href = $(el).attr('href') || '';
            if (href.includes(BASE) || href.includes('cinecalidad')) pageUrl = href;
        });
        if (!pageUrl) return streams;

        const pageHtml = await fetchHtml(pageUrl, { 'Referer': BASE });
        if (!pageHtml) return streams;
        const p$ = cheerio.load(pageHtml);

        const embedUrls = new Set();
        p$('iframe[src]').each((i, el) => {
            const src = p$(el).attr('src');
            if (src && src.startsWith('http')) embedUrls.add(src);
        });
        // CineCalidad usa botones con data-url
        p$('[data-url], .dooplay_player_option').each((i, el) => {
            const src = p$(el).attr('data-url') || p$(el).attr('data-post');
            if (src) embedUrls.add(src);
        });

        for (const url of embedUrls) {
            const extracted = await extractStreams(url);
            streams.push(...extracted.map(s => ({
                ...s,
                source: 'CineCalidad',
                language: 'es-latino'
            })));
        }
    } catch (e) {
        console.error('[CineCalidad] Error:', e.message);
    }
    return streams;
}

module.exports = { getStreams, id: 'cinecalidad', name: 'CineCalidad', language: 'es' };
