const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { extractStreams } = require('../utils/extractors');

const BASE = 'https://www.cineby.sc';

async function getStreams(tmdbId, type, title, year, season, episode) {
    const streams = [];
    try {
        // Cineby usa TMDB ID directamente en su URL
        let targetUrl;
        if (type === 'tv') {
            targetUrl = `${BASE}/es/tv/${tmdbId}/${season}/${episode}`;
        } else {
            targetUrl = `${BASE}/es/movie/${tmdbId}`;
        }

        const html = await fetchHtml(targetUrl, {
            'Referer': BASE,
            'Accept': 'text/html,application/xhtml+xml'
        });
        if (!html) return streams;
        const $ = cheerio.load(html);

        const embedUrls = new Set();
        $('iframe[src]').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.startsWith('http')) embedUrls.add(src);
        });
        $('source[src]').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.startsWith('http')) embedUrls.add(src);
        });

        for (const url of embedUrls) {
            const extracted = await extractStreams(url);
            streams.push(...extracted.map(s => ({ ...s, source: 'Cineby', language: 'es-latino' })));
        }

        // Si tiene URL de video directa
        const directVideo = html.match(/["'](https?:[^"']+\.(m3u8|mp4)[^"']*)['"]/);
        if (directVideo) {
            streams.push({
                url: directVideo[1],
                quality: directVideo[2] === 'm3u8' ? '1080p' : '720p',
                label: 'Cineby Direct',
                source: 'Cineby',
                language: 'es-latino'
            });
        }
    } catch (e) {
        console.error('[Cineby] Error:', e.message);
    }
    return streams;
}

module.exports = { getStreams, id: 'cineby', name: 'Cineby', language: 'es' };
