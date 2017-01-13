# The Atlas of Emotions

## Technical overview

The codebase is written in ES6, transpiled with [Babel](https://babeljs.io/). It's largely vanilla JS, with a healthy dose of [D3](https://d3js.org/) for States, Actions, and Triggers charts. Build pipline is [Gulp](http://gulpjs.com/) and [Browserify](http://browserify.org/).


## Running

Clone the project.

- `nvm use` (switch to the correct version of Node.js using [nvm](https://github.com/creationix/nvm))
- `npm install`
- `npm start`

## Deploying to GitHub pages ~~paulekman.com~~ (production)

`npm run gh-deploy`

~~`npm run dist`~~

~~SFTP (credentials in Stamen 1Pass) the contents of the generated `dist/` folder to PEG's site, in the `atlas-of-emotions/` folder (overwrite what's there). Also copy the `dist/` folder into a dated folder within `atlas-of-emotions/`, e.g. `atlas-of-emotions/2016-07-06/`.~~


### GitHub Pages setup

The CDN-backed production version of the site is running on GitHub Pages, directed to http://atlasofemotions.org/ via a [`CNAME` file](https://github.com/stamen/atlas-of-emotions/blob/gh-pages/CNAME). The deploy script uses [`git-directory-deploy`](https://www.npmjs.com/package/git-directory-deploy) to push only `dist/` to the `gh-pages` branch.

## Deploying to Heroku (staging)

```
heroku git:remote -a stamen-atlas-of-emotions
git push heroku master
```

### Heroku setup

A staging version of the site is [running on heroku](http://stamen-atlas-of-emotions.herokuapp.com), aliased at http://staging.atlasofemotions.org/. Username/password is the same as on the blog.

The heroku web process is `npm run start-heroku`, specified in [`Procfile`](https://github.com/stamen/atlas-of-emotions/blob/master/Procfile). This serves up the static `dist/` folder via [`serve`](https://www.npmjs.com/package/serve).

## Deploying to studio.stamen.com

```
npm run dist
scp -prq ./dist/. studio.stamen.com:www/emotionmap/show/v2/latest/ (or `/yyyy-mm-dd/`)
```

## Updating text content

TL;DR:
1. Edit strings in [`en.json`](./static/strings/langs/es.json), [`es.json`](./static/strings/langs/es.json), etc.
2. `npm run strings` and rebuild / redeploy.

Text content is arranged as follows:

#### Languages configuration

[`stringsConfig.json`](./static/strings/stringsConfig.json) is the entry point for bringing translated strings into the application. It has a configuration block for each language to be supported by the application; each block contains:
- `"lang"`: two-character ([ISO 639-1](https://en.wikipedia.org/wiki/ISO_639-1)) language code
- `"name"`: human-readable language name, as it appears in language selection UI
- `"fileId"`: The end of the Google Sheets URL of the corresponding language's strings spreadsheet (see Localized Strings below)
- `"enabled"`: An on/off (`true`/`false`) switch for the language

Note that each language must be set to `"enabled": true` for it to be available in the compiled application. If only one language is enabled, the application's language selection UI will be suppressed.

#### Localized strings

Text content source for the application is in a single Google Sheet per language, e.g. [AoE - English](https://docs.google.com/spreadsheets/d/1mZH66DoV1F3f1k2cP1jo5t7ApcaSIzl5Xycw_oUSPNo/edit#gid=0). These files are manually edited, with the keys pulled from the content keys files (see below), and the values provided by writers / translators.

Local text content for the application lives in a single strings file per language: [`en.json`](./static/strings/langs/es.json), [`es.json`](./static/strings/langs/es.json), etc. These files are loaded on request at runtime when the application loads or the language is changed. In order to prevent accidentally breaking the app, these strings files do not update automatically; call `npm run strings` to pull down the latest content from Google Sheets that contain the strings. They are committed with the rest of the source, however; this means that strings don't have to be pulled down when the repo is checked out, only when the source changes and an update is required.

#### Content keys
All localized string keys live in the ["AoE String Keys" spreadsheet on Drive](https://docs.google.com/spreadsheets/d/18rr302KT37L_DVOVA54CyoSEC-aQqwjWk8E7iByscyA/). To import them into the codebase, click the "Export to JSON" button in the menu at the top of the spreadsheet, select "Export all sheets to JSON", and copy+paste the resulting JSON into [`emotionsData.json`](https://github.com/stamen/atlas-of-emotions/blob/master/static/strings/emotionsData.json). These keys map to the translated strings described above in **Localized Strings**.

~~Primary content keys live in a [spreadsheet on Drive](https://docs.google.com/spreadsheets/d/1d9_u-7heRc1VHHOJQpvLqXOMXfSgmNBT9olpWk2cdvE/edit#gid=0), and in the project, in [`emotionsData.json`](https://github.com/stamen/atlas-of-emotions/blob/master/static/strings/emotionsData.json).~~

Secondary content keys live in the ["Secondary Content" spreadsheet on Drive](https://docs.google.com/a/stamen.com/spreadsheets/d/1eNeWj8q3geMb8HZsSR9ZT7vmFzXSR7nzd9nKNrvE1Ko/edit?usp=drive_web), and in the project in [`secondaryData.json`](https://github.com/stamen/atlas-of-emotions/blob/master/static/strings/secondaryData.json). As of this writing (Jan 2017), this is primarily the content in the "More Information" button at lower-right on the desktop app, and it's not planned to be translated. The exceptions are the "About" and "EmoTrak" tabs of that spreadsheet, which _are_ translated and have keys in the "AoE String Keys" spreadsheet; those tabs in the "Secondary Content" spreadsheet are effectively obsolete.

To update either, click the "Export to JSON" button in the top menu on the google sheet, cut+paste into the corresponding json file, run `npm run strings`.
