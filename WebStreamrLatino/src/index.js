require('dotenv').config();
const express   = require('express');
const NodeCache  = require('node-cache');
const axios      = require('axios');

const app   = express();
const cache = new NodeCache({ stdTTL: 3600 });

const PORT       = process.env.PORT || 7000;
const TMDB_TOKEN = process.env.TMDB_TOKEN || '';
const ADDON_NAME = process.env.ADDON_NAME || 'WebStreamr Latino';

// ── Cargar todos los providers ─────────────────────────────────────────────
const providers = [
    // Latinos directos (tus URLs exactas)
    require('./providers/pelispop'),
    require('./providers/flixlatam'),
    require('./providers/entreseries'),
    require('./providers/fastflix'),
    require('./providers/compucali'),
    require('./providers/peliculasmx'),
    require('./providers/braflix'),
    // Inglés / internacionales
    require('./providers/watchseries'),
    require('./providers/movies123'),
    require('./providers/vidsrc'),
    require('./providers/autoembed'),
    require('./providers/twoembed'),
];

// ── CORS ───────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});

// ── Manifest ───────────────────────────────────────────────────────────────
app.get('/manifest.json', (req, res) => {
    res.json({
        id:          'com.webstreamr.latino',
        version:     '4.0.0',
        name:        ADDON_NAME,
        description: `Embeds desde: ${providers.map(p=>p.name).join(', ')}`,
        resources:   ['stream'],
        types:       ['movie', 'series'],
        idPrefixes:  ['tt', 'tmdb:'],
        catalogs:    [],
    });
});

// ── TMDB helpers ───────────────────────────────────────────────────────────
async function getTmdbInfo(tmdbId, type) {
    if (!TMDB_TOKEN || !tmdbId) return null;
    try {
        const endpoint = type === 'series' ? 'tv' : 'movie';
        const res = await axios.get(
            `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?language=es-MX`,
            { headers: { 'Authorization': `Bearer ${TMDB_TOKEN}` }, timeout: 8000 }
        );
        return {
            title:   res.data.title || res.data.name || '',
            titleEn: res.data.original_title || res.data.original_name || '',
            year:    (res.data.release_date || res.data.first_air_date || '').substring(0, 4),
        };
    } catch(e) { return null; }
}

async function imdbToTmdb(imdbId, type) {
    if (!TMDB_TOKEN) return null;
    try {
        const res = await axios.get(
            `https://api.themoviedb.org/3/find/${imdbId}?external_source=imdb_id`,
            { headers: { 'Authorization': `Bearer ${TMDB_TOKEN}` }, timeout: 8000 }
        );
        const r = type === 'series' ? res.data.tv_results : res.data.movie_results;
        return (r && r.length) ? r[0].id : null;
    } catch(e) { return null; }
}

// ── Stream handler ─────────────────────────────────────────────────────────
app.get('/stream/:type/:id.json', async (req, res) => {
    const { type } = req.params;
    let   { id }   = req.params;

    let season = 1, episode = 1;
    const parts = id.split(':');
    if (parts.length >= 3) {
        if (parts[0] === 'tmdb') {
            id      = `tmdb:${parts[1]}`;
            season  = parseInt(parts[2]) || 1;
            episode = parseInt(parts[3]) || 1;
        } else {
            id      = parts[0];
            season  = parseInt(parts[1]) || 1;
            episode = parseInt(parts[2]) || 1;
        }
    }

    const cacheKey = `${type}:${id}:${season}:${episode}`;
    const cached   = cache.get(cacheKey);
    if (cached) return res.json({ streams: cached });

    // Resolver IDs
    let tmdbId = null;
    if (id.startsWith('tmdb:')) {
        tmdbId = parseInt(id.replace('tmdb:', ''));
    } else if (id.startsWith('tt')) {
        tmdbId = await imdbToTmdb(id, type);
    }

    // Obtener título
    let title = '', titleEn = '', year = '';
    if (tmdbId) {
        const info = await getTmdbInfo(tmdbId, type);
        if (info) { title = info.title; titleEn = info.titleEn; year = info.year; }
    }
    if (!title) title = id;

    console.log(`[${type.toUpperCase()}] "${title}" (${year}) | tmdb:${tmdbId} | S${season}E${episode}`);

    const mediaType = type === 'series' ? 'tv' : 'movie';

    // Buscar en todos los providers en paralelo
    const settled = await Promise.allSettled(
        providers.map(p =>
            Promise.race([
                p.getStreams(tmdbId, mediaType, title, year, season, episode),
                new Promise((_, rej) => setTimeout(() => rej(), 18000))
            ]).catch(() => [])
        )
    );

    let allStreams = [];
    settled.forEach((r, i) => {
        if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length) {
            console.log(`  ✓ ${providers[i].name}: ${r.value.length} embeds`);
            allStreams.push(...r.value);
        }
    });

    // Si no hay resultados con título en español, reintentar con título en inglés
    if (allStreams.length === 0 && titleEn && titleEn !== title) {
        console.log(`  → Reintentando con título en inglés: "${titleEn}"`);
        const settled2 = await Promise.allSettled(
            providers.slice(0, 6).map(p =>
                p.getStreams(tmdbId, mediaType, titleEn, year, season, episode).catch(() => [])
            )
        );
        settled2.forEach(r => {
            if (r.status === 'fulfilled' && Array.isArray(r.value)) allStreams.push(...r.value);
        });
    }

    // Formatear para Stremio/Nuvio
    const formatted = allStreams
        .filter(s => s && s.url && s.url.startsWith('http'))
        .map(s => ({
            name:  `[${s.source}]`,
            title: `${s.language === 'es-latino' ? '🌎 Latino' : s.language === 'es-castellano' ? '🇪🇸' : '🇬🇧'} · ${s.quality || 'HD'}`,
            url:   s.url,
            behaviorHints: { notWebReady: false }
        }));

    // Latinos primero
    formatted.sort((a, b) => (a.title.includes('🌎') ? 0 : 1) - (b.title.includes('🌎') ? 0 : 1));

    console.log(`  → Total: ${formatted.length} streams encontrados\n`);
    if (formatted.length) cache.set(cacheKey, formatted);
    res.json({ streams: formatted });
});

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        name:      ADDON_NAME,
        version:   '4.0.0',
        status:    '✅ running',
        providers: providers.map(p => ({ name: p.name })),
        manifest:  '/manifest.json',
    });
});

app.listen(PORT, () => {
    console.log(`\n🎬 ${ADDON_NAME} v4.0`);
    console.log(`🚀 http://localhost:${PORT}`);
    console.log(`📺 ${providers.length} providers: ${providers.map(p=>p.name).join(', ')}\n`);
});
