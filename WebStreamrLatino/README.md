# WebStreamr Latino

Fork de WebStreamr enfocado en contenido latino y español.

## Scrapers incluidos
| Scraper | Idioma | Tipo |
|---|---|---|
| SoloLatino | 🌎 Latino | Movies + Series |
| LA.Movie | 🌎 Latino | Movies + Series |
| HomeCine | 🌎 Latino | Movies + Series |
| CineCalidad | 🌎 Latino | Movies only |
| VerPelisTV | 🌎 Latino | Movies + Series |
| PelisGo | 🌎 Latino | Movies + Series |
| FuegoCine | 🌎 Latino | Movies + Series |
| Cineby | 🌎 Latino | Movies + Series |
| Gnula | 🇪🇸 Castellano | Movies + Series |
| VidSrc | 🇬🇧 Inglés | Movies + Series |

## Instalación
```
npm install
```

## Configuración
```
cp .env.example .env
# Edita .env con tu token TMDB
```

## Ejecutar
```
npm start
```

## Usar en Stremio o Project Aura
Agregar URL del manifest:
```
http://localhost:7000/manifest.json
```

## Deploy en Render (gratis)
1. Crea cuenta en render.com
2. New > Web Service > Connect repositorio
3. Build: `npm install`
4. Start: `npm start`
5. Agrega TMDB_TOKEN en Environment Variables
