const BaseProvider = require('./base');

class FastFlixProvider extends BaseProvider {
    constructor() {
        super({ name: 'FastFlix', baseUrl: 'https://fastflix.to', lang: 'es-latino' });
    }
}

module.exports = new FastFlixProvider();
