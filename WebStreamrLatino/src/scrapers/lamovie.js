const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { extractStreams } = require('../utils/extractors');

const BASE = 'https://la.movie';

async function getStreams(tmdbId, type, title, year, season, episode) {
    const streams = [];
    try {
        const query = encodeURIComponent(title);
        const html = await fetchHtml(`${BASE}/?s=${query}`, { 'Referer': BASE });
        if (!html) return streams;
        const $ = cheerio.load(html);

        let pageUrl = null;
        $('article a, .result-item a, .movies-list a').each((i, el) => {
            if (pageUrl) return;
            const href = $(el).attr('href') || '';
            const t = ($(el).attr('title') || $(el).text()).toLowerCase();
            if (href.includes(BASE) && t.includes(title.toLowerCase().substring(0, 5)))
                pageUrl = href;
        });
        if (!pageUrl && $('article').first().find('a').attr('href'))
            pageUrl = $('article').first().find('a').attr('href');
        if (!pageUrl) return streams;

        // Series: navegar al episodio
        if (type === 'tv' && season && episode) {
            const ph = await fetchHtml(pageUrl, { 'Referer': BASE });
            if (!ph) return streams;
            const p$ = cheerio.load(ph);
            let epUrl = null;
            p$('a[href]').each((i, el) => {
                if (epUrl) return;
                const href = p$(el).attr('href') || '';
                const txt = p$(el).text().toLowerCase();
                if ((txt.includes(`temporada ${season}`) || txt.includes(`season ${season}`)) && href)
                    epUrl = href;
            });
            if (epUrl) {
                const sh = await fetchHtml(epUrl, { 'Referer': BASE });
                if (sh) {
                    const s$ = cheerio.load(sh);
                    s$('a[href]').each((i, el) => {
                        const href = s$(el).attr('href') || '';
                        const txt = s$(el).text().toLowerCase();
                        if ((txt.includes(`episodio ${episode}`) || txt.includes(`episode ${episode}`)) && href)
                            pageUrl = href;
                    });
                }
            }
        }

        const targetHtml = await fetchHtml(pageUrl, { 'Referer': BASE });
        if (!targetHtml) return streams;
        const t$ = cheerio.load(targetHtml);

        const embedUrls = new Set();
        t$('iframe[src]').each((i, el) => {
            const src = t$(el).attr('src');
            if (src && src.startsWith('http')) embedUrls.add(src);
        });
        t$('[data-src], [data-url], .dooplay_player_option').each((i, el) => {
            const src = t$(el).attr('data-src') || t$(el).attr('data-url');
            if (src && src.startsWith('http')) embedUrls.add(src);
        });

        for (const url of embedUrls) {
            const extracted = await extractStreams(url);
            streams.push(...extracted.map(s => ({ ...s, source: 'LaMovie', language: 'es-latino' })));
        }
    } catch (e) {
        console.error('[LaMovie] Error:', e.message);
    }
    return streams;
}

module.exports = { getStreams, id: 'lamovie', name: 'LA.Movie', language: 'es' };
