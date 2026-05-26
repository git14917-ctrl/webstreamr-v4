const cheerio = require('cheerio');
const { fetchHtml, extractEmbeds } = require('../utils/fetcher');

/**
 * Provider base — todos los providers extienden esta clase
 * Solo necesitas definir:
 *   - BASE_URL
 *   - searchPath(query) → ruta de búsqueda
 *   - moviePath(id) → ruta de película  (opcional)
 *   - tvPath(id, s, e) → ruta de episodio (opcional)
 *   - findPageUrl($, title) → extraer URL del resultado correcto
 */
class BaseProvider {
    constructor({ name, baseUrl, lang = 'es-latino' }) {
        this.name    = name;
        this.baseUrl = baseUrl;
        this.lang    = lang;
    }

    // Buscar por título en el sitio
    async searchByTitle(title) {
        const query = encodeURIComponent(title);
        const url   = `${this.baseUrl}/?s=${query}`;
        const html  = await fetchHtml(url, { 'Referer': this.baseUrl });
        if (!html) return null;
        const $    = cheerio.load(html);

        // Selectores comunes para resultados de búsqueda
        const selectors = [
            'article a', '.result-item a', '.movies-list a',
            '.item a', 'h2 a', 'h3 a', '.title a', '.poster a'
        ];

        for (const sel of selectors) {
            const found = $(sel).filter((i, el) => {
                const href = $(el).attr('href') || '';
                const text = ($(el).attr('title') || $(el).text()).toLowerCase();
                return href.startsWith('http') &&
                       text.includes(title.toLowerCase().substring(0, 5));
            }).first().attr('href');
            if (found) return found;
        }

        // Fallback: primer resultado
        for (const sel of selectors) {
            const first = $(sel).first().attr('href');
            if (first && first.startsWith('http')) return first;
        }
        return null;
    }

    // Buscar episodio dentro de una página de serie
    async findEpisode(seriesUrl, season, episode) {
        const html = await fetchHtml(seriesUrl, { 'Referer': this.baseUrl });
        if (!html) return null;
        const $ = cheerio.load(html);

        // Patrones comunes de episodios
        const patterns = [
            `${season}x${String(episode).padStart(2,'0')}`,
            `s${String(season).padStart(2,'0')}e${String(episode).padStart(2,'0')}`,
            `temporada-${season}-capitulo-${episode}`,
            `temporada/${season}/capitulo/${episode}`,
            `season-${season}-episode-${episode}`,
        ];

        let epUrl = null;
        $('a[href]').each((i, el) => {
            if (epUrl) return;
            const href = $(el).attr('href') || '';
            const text = ($(el).text() + href).toLowerCase();
            if (patterns.some(p => text.includes(p) || href.includes(p))) {
                epUrl = href.startsWith('http') ? href : this.baseUrl + href;
            }
        });
        return epUrl;
    }

    // Extraer embeds de una página
    async getEmbedsFromPage(pageUrl) {
        const html = await fetchHtml(pageUrl, { 'Referer': this.baseUrl });
        if (!html) return [];
        return extractEmbeds(html).map(url => ({
            url,
            source: this.name,
            language: this.lang,
        }));
    }

    // Método principal — buscar streams para una película o episodio
    async getStreams(tmdbId, type, title, year, season = 1, episode = 1) {
        try {
            // 1. Buscar por título
            let pageUrl = await this.searchByTitle(title);
            if (!pageUrl) return [];

            // 2. Si es serie, navegar al episodio
            if (type === 'tv') {
                const epUrl = await this.findEpisode(pageUrl, season, episode);
                if (!epUrl) return [];
                pageUrl = epUrl;
            }

            // 3. Extraer embeds de la página
            return await this.getEmbedsFromPage(pageUrl);
        } catch(e) {
            return [];
        }
    }
}

module.exports = BaseProvider;
