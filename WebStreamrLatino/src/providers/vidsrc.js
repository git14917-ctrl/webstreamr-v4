const { extractEmbeds, fetchHtml } = require('../utils/fetcher');

module.exports = {
    name: 'VidSrc',
    async getStreams(tmdbId, type, title, year, season = 1, episode = 1) {
        const urls = [];
        if (!tmdbId) return [];

        if (type === 'tv') {
            urls.push(`https://vidsrc.me/embed/${tmdbId}/${season}-${episode}/`);
            urls.push(`https://vidsrc.pro/embed/tv/${tmdbId}/${season}/${episode}`);
            urls.push(`https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`);
        } else {
            urls.push(`https://vidsrc.me/embed/${tmdbId}/`);
            urls.push(`https://vidsrc.pro/embed/movie/${tmdbId}`);
            urls.push(`https://vidsrc.to/embed/movie/${tmdbId}`);
        }

        const results = [];
        for (const url of urls) {
            const html = await fetchHtml(url, { 'Referer': 'https://vidsrc.me/' });
            if (html) {
                const embeds = extractEmbeds(html);
                embeds.forEach(e => results.push({ url: e, source: 'VidSrc', language: 'en' }));
            }
            if (results.length >= 2) break;
        }
        return results;
    }
};
