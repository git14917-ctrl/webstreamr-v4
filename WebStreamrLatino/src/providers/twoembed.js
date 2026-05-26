const { extractEmbeds, fetchHtml } = require('../utils/fetcher');

module.exports = {
    name: '2Embed',
    async getStreams(tmdbId, type, title, year, season = 1, episode = 1) {
        if (!tmdbId) return [];
        const url = type === 'tv'
            ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`
            : `https://www.2embed.cc/embed/${tmdbId}`;
        const html = await fetchHtml(url, { 'Referer': 'https://www.2embed.cc/' });
        if (!html) return [];
        return extractEmbeds(html).map(e => ({ url: e, source: '2Embed', language: 'en' }));
    }
};
