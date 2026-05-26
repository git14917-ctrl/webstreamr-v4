const BaseProvider = require('./base');

class FlixLatamProvider extends BaseProvider {
    constructor() {
        super({ name: 'FlixLatam', baseUrl: 'https://flixlatam.com', lang: 'es-latino' });
    }
}

module.exports = new FlixLatamProvider();
