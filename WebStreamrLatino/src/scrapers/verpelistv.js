const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { extractStreams } = require('../utils/extractors');

const BASE = 'https://verpelistv.com';

async function getStreams(tmdbId, type, title, year, season, episode) {
    const streams = [];
    try {
        const query = encodeURIComponent(title);
        const html = await fetchHtml(`${BASE}/?s=${query}`, { 'Referer': BASE });
        if (!html) return streams;
        const $ = cheerio.load(html);

        let pageUrl = null;
        $('article a, .result-item a').each((i, el) => {
            if (pageUrl) return;
            const href = $(el).attr('href') || '';
            if (href.includes(BASE)) pageUrl = href;
        });
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
                if ((txt.includes(`${season}x${episode}`) || txt.includes(`s${season}e${episode}`)) && href)
                    epUrl = href;
            });
            if (epUrl) pageUrl = epUrl;
            else return streams;
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
            streams.push(...extracted.map(s => ({ ...s, source: 'VerPelisTV', language: 'es-latino' })));
        }
    } catch (e) {
        console.error('[VerPelisTV] Error:', e.message);
    }
    return streams;
}

module.exports = { getStreams, id: 'verpelistv', name: 'VerPelisTV', language: 'es' };
