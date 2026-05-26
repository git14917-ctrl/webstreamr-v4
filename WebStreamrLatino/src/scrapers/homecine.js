const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { extractStreams } = require('../utils/extractors');

const BASE = 'https://homecine.to';

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
            const t = ($(el).attr('title') || $(el).text()).toLowerCase();
            if (href.includes(BASE) && t.includes(title.toLowerCase().substring(0, 6))) {
                pageUrl = href;
            }
        });

        if (!pageUrl && $('article').length) {
            pageUrl = $('article').first().find('a').attr('href');
        }
        if (!pageUrl) return streams;

        let targetUrl = pageUrl;

        // Series: navegar a episodio
        if (type === 'tv' && season && episode) {
            const pageHtml = await fetchHtml(pageUrl);
            if (!pageHtml) return streams;
            const p$ = cheerio.load(pageHtml);
            let epUrl = null;
            p$('a[href]').each((i, el) => {
                if (epUrl) return;
                const href = p$(el).attr('href') || '';
                const text = p$(el).text().toLowerCase();
                if ((text.includes(`${season}x${episode}`) || text.includes(`s${season}e${episode}`)) && href) {
                    epUrl = href;
                }
            });
            if (!epUrl) return streams;
            targetUrl = epUrl;
        }

        const targetHtml = await fetchHtml(targetUrl, { 'Referer': BASE });
        if (!targetHtml) return streams;
        const t$ = cheerio.load(targetHtml);

        // Extraer iframes y links de embeds
        const embedUrls = new Set();
        t$('iframe[src]').each((i, el) => {
            const src = t$(el).attr('src');
            if (src && src.startsWith('http')) embedUrls.add(src);
        });
        t$('[data-src], [data-url]').each((i, el) => {
            const src = t$(el).attr('data-src') || t$(el).attr('data-url');
            if (src && src.startsWith('http')) embedUrls.add(src);
        });

        for (const url of embedUrls) {
            const extracted = await extractStreams(url);
            streams.push(...extracted.map(s => ({
                ...s,
                source: 'HomeCine',
                language: 'es-latino'
            })));
        }
    } catch (e) {
        console.error('[HomeCine] Error:', e.message);
    }
    return streams;
}

module.exports = { getStreams, id: 'homecine', name: 'HomeCine', language: 'es' };
