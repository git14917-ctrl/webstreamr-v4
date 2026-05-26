const BaseProvider = require('./base');

class CompucaliProvider extends BaseProvider {
    constructor() {
        super({ name: 'CompucaliTV', baseUrl: 'https://compucalitv.tv', lang: 'es-latino' });
    }
}

module.exports = new CompucaliProvider();
