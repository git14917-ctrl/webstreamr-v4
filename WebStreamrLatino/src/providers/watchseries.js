const BaseProvider = require('./base');
const { fetchHtml, extractEmbeds } = require('../utils/fetcher');
const cheerio = require('cheerio');

class WatchSeriesProvider extends BaseProvider {
    constructor() {
        super({ name: 'WatchSeries', baseUrl: 'https://watchseries.bar', lang: 'en' });
    }

    async getStreams(tmdbId, type, title, year, season = 1, episode = 1) {
        try {
            // WatchSeries tiene búsqueda propia
            const query = encodeURIComponent(title);
            const html = await fetchHtml(`${this.baseUrl}/search?keyword=${query}`, {
                'Referer': this.baseUrl
            });
            if (!html) return [];
            const $ = cheerio.load(html);

            let pageUrl = null;
            $('.film-poster a, .item a, article a').each((i, el) => {
                if (pageUrl) return;
                const href = $(el).attr('href') || '';
                if (href.startsWith('http') || href.startsWith('/')) {
                    pageUrl = href.startsWith('http') ? href : this.baseUrl + href;
                }
            });
            if (!pageUrl) return [];

            if (type === 'tv') {
                const epUrl = await this.findEpisode(pageUrl, season, episode);
                if (!epUrl) return [];
                pageUrl = epUrl;
            }

            return await this.getEmbedsFromPage(pageUrl);
        } catch(e) { return []; }
    }
}

module.exports = new WatchSeriesProvider();
