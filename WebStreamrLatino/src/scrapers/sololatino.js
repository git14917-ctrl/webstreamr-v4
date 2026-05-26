const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { extractStreams } = require('../utils/extractors');

const BASE = 'https://sololatino.net';

async function search(title, year, type) {
    try {
        const query = encodeURIComponent(title);
        const html = await fetchHtml(`${BASE}/?s=${query}`);
        if (!html) return [];
        const $ = cheerio.load(html);
        const results = [];
        $('article, .result-item').each((i, el) => {
            const link = $(el).find('a').first().attr('href');
            const t = $(el).find('.title, h2, h3').text().trim();
            if (link && t) results.push({ title: t, url: link });
        });
        return results;
    } catch (e) {
        return [];
    }
}

async function getStreams(tmdbId, type, title, year, season, episode) {
    const streams = [];
    try {
        const results = await search(title, year, type);
        if (!results.length) return streams;

        // Tomar el primer resultado más relevante
        const best = results.find(r =>
            r.title.toLowerCase().includes(title.toLowerCase().substring(0, 8))
        ) || results[0];

        const html = await fetchHtml(best.url);
        if (!html) return streams;
        const $ = cheerio.load(html);

        // Para series: buscar el episodio correcto
        if (type === 'tv' && season && episode) {
            const epLinks = [];
            $('a[href]').each((i, el) => {
                const href = $(el).attr('href') || '';
                const text = $(el).text().toLowerCase();
                if ((text.includes(`${season}x${episode}`) ||
                     text.includes(`s${season}e${episode}`) ||
                     text.includes(`temporada ${season}`) && text.includes(`episodio ${episode}`)) &&
                    href.includes(BASE)) {
                    epLinks.push(href);
                }
            });
            if (epLinks.length) {
                const epHtml = await fetchHtml(epLinks[0]);
                if (epHtml) {
                    const ep$ = cheerio.load(epHtml);
                    const embedStreams = await extractEmbeds(ep$);
                    streams.push(...embedStreams);
                }
            }
            return streams;
        }

        // Para películas: extraer embeds directamente
        const embedStreams = await extractEmbeds($);
        streams.push(...embedStreams);
    } catch (e) {
        console.error('[SoloLatino] Error:', e.message);
    }
    return streams;
}

async function extractEmbeds($) {
    const streams = [];
    const embedUrls = new Set();

    // Buscar iframes
    $('iframe[src]').each((i, el) => {
        const src = $(el).attr('src');
        if (src && src.startsWith('http')) embedUrls.add(src);
    });

    // Buscar links de reproductores en botones/tabs
    $('a[href], [data-src], [data-url]').each((i, el) => {
        const href = $(el).attr('href') || $(el).attr('data-src') || $(el).attr('data-url') || '';
        if (href && (href.includes('voe') || href.includes('filemoon') ||
            href.includes('streamwish') || href.includes('dood'))) {
            embedUrls.add(href);
        }
    });

    for (const url of embedUrls) {
        try {
            const extracted = await extractStreams(url);
            streams.push(...extracted.map(s => ({
                ...s,
                source: 'SoloLatino',
                language: 'es-latino'
            })));
        } catch (e) {}
    }
    return streams;
}

module.exports = { getStreams, id: 'sololatino', name: 'SoloLatino', language: 'es' };
