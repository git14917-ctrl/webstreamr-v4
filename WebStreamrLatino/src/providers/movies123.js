const BaseProvider = require('./base');

class Movies123Provider extends BaseProvider {
    constructor() {
        super({ name: '123Movies', baseUrl: 'https://www1.123moviesme.online', lang: 'en' });
    }
}

module.exports = new Movies123Provider();
