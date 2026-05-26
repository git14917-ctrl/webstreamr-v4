const BaseProvider = require('./base');

class PeliculasMXProvider extends BaseProvider {
    constructor() {
        super({ name: 'PeliculasMX', baseUrl: 'https://peliculasmx.net', lang: 'es-latino' });
    }
}

module.exports = new PeliculasMXProvider();
