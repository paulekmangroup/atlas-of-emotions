# webdev-boilerplate

Minimal boilerplate for making the kinds of things we make at Stamen.
Note this boilerplate is for websites, not libraries.



##Setup

1. Update npm:

```bash
npm install -g npm
```

2. Install dependencies:

```bash
npm install
```



## Develop

To run locally:

```bash
npm start
```
Open browser to [http://localhost:8888/](http://localhost:8888/)



##Deploy

To generate a package for deployment:

```bash
npm run deploy
```

This will create a `deploy` directory. Move this directory to your server.



##Deploy to studio.stamen

```bash
scp -prq ./dist/. studio.stamen.com:www/<projectname>/show/
scp -prq ./dist/. studio.stamen.com:www/<projectname>/show/yyyy-mm-dd/
```
