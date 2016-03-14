# The Atlas of Emotions

## Running

Clone the project.
`npm install`
`npm start`

## Deploying to GitHub pages (production)

`npm run gh-deploy`

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
scp -prq ./dist/. studio.stamen.com:www/emotionmap/show/v2/latest/` (or `/yyyy-mm-dd/`)
```

## Updating text content

Primary content lives in a [spreadsheet on Drive](https://docs.google.com/spreadsheets/d/1d9_u-7heRc1VHHOJQpvLqXOMXfSgmNBT9olpWk2cdvE/edit#gid=0), and in the project, in [`emotionsData.json`](https://github.com/stamen/atlas-of-emotions/blob/master/static/emotionsData.json).

Secondary content lives in a [spreadsheet on Drive](https://docs.google.com/a/stamen.com/spreadsheets/d/1eNeWj8q3geMb8HZsSR9ZT7vmFzXSR7nzd9nKNrvE1Ko/edit?usp=drive_web), and in the project in [`secondaryData.json`](https://github.com/stamen/atlas-of-emotions/blob/master/static/secondaryData.json).

To update either, click the "Export to JSON" button in the top menu on the google sheet, cut+paste into the corresponding json file, and rebuild.