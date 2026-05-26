const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { extractStreams } = require('../utils/extractors');

const GNULA_MOVIE = 'https://gnulahd.nu';
const GNULA_SERIES = 'https://gnulaseries.nu';

async function getStreams(tmdbId, type, title, year, season, episode) {
    const streams = [];
    try {
        const BASE = type === 'tv' ? GNULA_SERIES : GNULA_MOVIE;
        const query = encodeURIComponent(title);
        const html = await fetchHtml(`${BASE}/?s=${query}`, { 'Referer': BASE });
        if (!html) return streams;
        const $ = cheerio.load(html);

        let pageUrl = $('article a, .result-item a').first().attr('href');
        if (!pageUrl) return streams;

        if (type === 'tv' && season && episode) {
            const ph = await fetchHtml(pageUrl, { 'Referer': BASE });
            if (!ph) return streams;
            const p$ = cheerio.load(ph);
            let epUrl = null;
            p$('a[href]').each((i, el) => {
                if (epUrl) return;
                const href = p$(el).attr('href') || '';
                const txt = p$(el).text().toLowerCase();
                if ((txt.includes(`${season}x${episode}`) || txt.includes(`temporada ${season}`)) && href)
                    epUrl = href;
            });
            if (epUrl) pageUrl = epUrl; else return streams;
        }

        const targetHtml = await fetchHtml(pageUrl, { 'Referer': BASE });
        if (!targetHtml) return streams;
        const t$ = cheerio.load(targetHtml);

        const embedUrls = new Set();
        t$('iframe[src]').each((i, el) => {
            const src = t$(el).attr('src');
            if (src && src.startsWith('http')) embedUrls.add(src);
        });

        for (const url of embedUrls) {
            const extracted = await extractStreams(url);
            streams.push(...extracted.map(s => ({ ...s, source: 'Gnula', language: 'es-castellano' })));
        }
    } catch (e) {
        console.error('[Gnula] Error:', e.message);
    }
    return streams;
}

module.exports = { getStreams, id: 'gnula', name: 'Gnula', language: 'es' };
