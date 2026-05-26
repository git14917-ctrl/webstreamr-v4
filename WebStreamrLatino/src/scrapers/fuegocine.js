const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { extractStreams } = require('../utils/extractors');

const BASE = 'https://www.fuegocine.com';

async function getStreams(tmdbId, type, title, year, season, episode) {
    const streams = [];
    try {
        const query = encodeURIComponent(title);
        const html = await fetchHtml(`${BASE}/?s=${query}&m=1`, { 'Referer': BASE });
        if (!html) return streams;
        const $ = cheerio.load(html);

        let pageUrl = $('article a, .result-item a, h2 a').first().attr('href');
        if (!pageUrl) return streams;

        const targetHtml = await fetchHtml(pageUrl, { 'Referer': BASE });
        if (!targetHtml) return streams;
        const t$ = cheerio.load(targetHtml);

        const embedUrls = new Set();
        t$('iframe[src]').each((i, el) => {
            const src = t$(el).attr('src');
            if (src && src.startsWith('http')) embedUrls.add(src);
        });
        t$('[data-src]').each((i, el) => {
            const src = t$(el).attr('data-src');
            if (src && src.startsWith('http')) embedUrls.add(src);
        });

        for (const url of embedUrls) {
            const extracted = await extractStreams(url);
            streams.push(...extracted.map(s => ({ ...s, source: 'FuegoCine', language: 'es-latino' })));
        }
    } catch (e) {
        console.error('[FuegoCine] Error:', e.message);
    }
    return streams;
}

module.exports = { getStreams, id: 'fuegocine', name: 'FuegoCine', language: 'es' };
