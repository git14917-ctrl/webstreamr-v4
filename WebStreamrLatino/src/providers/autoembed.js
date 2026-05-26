const { extractEmbeds, fetchHtml } = require('../utils/fetcher');

module.exports = {
    name: 'AutoEmbed',
    async getStreams(tmdbId, type, title, year, season = 1, episode = 1) {
        if (!tmdbId) return [];
        const url = type === 'tv'
            ? `https://autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`
            : `https://autoembed.cc/embed/movie/${tmdbId}`;
        const html = await fetchHtml(url, { 'Referer': 'https://autoembed.cc/' });
        if (!html) return [];
        return extractEmbeds(html).map(e => ({ url: e, source: 'AutoEmbed', language: 'en' }));
    }
};
