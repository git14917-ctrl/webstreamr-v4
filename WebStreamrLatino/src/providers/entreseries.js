const BaseProvider = require('./base');

class EntreSeriesProvider extends BaseProvider {
    constructor() {
        super({ name: 'EntreSeriesYPeliculas', baseUrl: 'https://entrepeliculasyseries.nz', lang: 'es-latino' });
    }
}

module.exports = new EntreSeriesProvider();
