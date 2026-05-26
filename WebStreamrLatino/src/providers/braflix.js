const BaseProvider = require('./base');
const { fetchJson } = require('../utils/fetcher');

class BraflixProvider extends BaseProvider {
    constructor() {
        super({ name: 'Braflix', baseUrl: 'https://braflix.win', lang: 'es-latino' });
    }

    async getStreams(tmdbId, type, title, year, season = 1, episode = 1) {
        try {
            // Braflix tiene API propia
            if (tmdbId) {
                const endpoint = type === 'tv'
                    ? `${this.baseUrl}/api/v1/videos/sources?id=${tmdbId}&type=tv&season=${season}&episode=${episode}`
                    : `${this.baseUrl}/api/v1/videos/sources?id=${tmdbId}&type=movie`;
                const data = await fetchJson(endpoint);
                if (data && data.sources) {
                    return data.sources.map(s => ({
                        url: s.url || s.file,
                        source: this.name,
                        language: this.lang,
                        quality: s.quality || s.label || '1080p'
                    })).filter(s => s.url);
                }
            }
            return await super.getStreams(tmdbId, type, title, year, season, episode);
        } catch(e) { return []; }
    }
}

module.exports = new BraflixProvider();
