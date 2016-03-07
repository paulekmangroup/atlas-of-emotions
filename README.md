# The Atlas of Emotions

## Running

Clone the project.
`npm install`
`npm start`

## Deploying to heroku

`TODO`

## Deploying to GitHub pages

`TODO`

## Deploying to studio.stamen.com

`npm run dist`
`scp -prq ./dist/. studio.stamen.com:www/emotionmap/show/v2/latest/` (or `/2016-mm-dd/`)

## Updating text content

Primary content lives here:
https://docs.google.com/spreadsheets/d/1d9_u-7heRc1VHHOJQpvLqXOMXfSgmNBT9olpWk2cdvE/edit#gid=0

And in the project is emotionsData.json

Secondary content lives here:
https://docs.google.com/a/stamen.com/spreadsheets/d/1eNeWj8q3geMb8HZsSR9ZT7vmFzXSR7nzd9nKNrvE1Ko/edit?usp=drive_web

And in the project is secondaryData.json

To update either, click the Export to JSON button in the top menu on the google sheet, cut+paste into the corresponding json file, and rebuild.