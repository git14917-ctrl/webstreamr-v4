const BaseProvider = require('./base');
const { fetchHtml, extractEmbeds } = require('../utils/fetcher');
const cheerio = require('cheerio');

class PelisPopProvider extends BaseProvider {
    constructor() {
        super({ name: 'PelisPop', baseUrl: 'https://pelispop.mov', lang: 'es-latino' });
    }

    // PelisPop usa TMDB directamente en sus URLs — más preciso
    async getStreams(tmdbId, type, title, year, season = 1, episode = 1) {
        try {
            // Intento 1: buscar por TMDB ID si disponible
            if (tmdbId) {
                const slug = type === 'tv'
                    ? await this.findByTmdb(tmdbId, 'serie')
                    : await this.findByTmdb(tmdbId, 'pelicula');
                if (slug) {
                    const pageUrl = type === 'tv'
                        ? `${this.baseUrl}/serie/${slug}/temporada/${season}/capitulo/${episode}`
                        : `${this.baseUrl}/pelicula/${slug}`;
                    const embeds = await this.getEmbedsFromPage(pageUrl);
                    if (embeds.length) return embeds;
                }
            }
            // Fallback: búsqueda por título
            return await super.getStreams(tmdbId, type, title, year, season, episode);
        } catch(e) { return []; }
    }

    async findByTmdb(tmdbId, tipo) {
        // PelisPop muestra TMDB IDs en sus páginas de resultados
        const html = await fetchHtml(`${this.baseUrl}/${tipo}s`, { 'Referer': this.baseUrl });
        if (!html) return null;
        const $ = cheerio.load(html);
        // Buscar por data-tmdb o en las URLs que contienen el ID
        let found = null;
        $(`a[href*="/${tipo}/"]`).each((i, el) => {
            if (found) return;
            const href = $(el).attr('href') || '';
            if (href.includes(String(tmdbId))) found = href.split('/').pop();
        });
        return found;
    }
}

module.exports = new PelisPopProvider();
