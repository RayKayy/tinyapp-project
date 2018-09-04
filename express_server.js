const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8080; // default port 8080

app.set('view engine', 'ejs');

const urlDatabase = {
  b2xVn2: 'http://www.lighthouselabs.ca',
  '9sm5xK': 'http://www.google.com',
};

// Generates a random Alphanumeric string
function generateRandomString(length) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    const random = Math.floor(Math.random() * chars.length);
    const char = chars[random];
    result += char;
  }
  return result;
}


app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Hello!');
});

app.get('/urls/new', (req, res) => {
  res.render('urls_new');
});

app.get('/urls', (req, res) => {
  const templateVars = { urls: urlDatabase };
  res.render('urls_index', templateVars);
});

app.get('/urls/:id', (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    id: req.params.id,
  };
  res.render('single_url', templateVars);
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

app.get('/u/:shortURL', (req, res) => {
  let longURL = urlDatabase[req.params.shortURL];
  if (longURL.slice(0, 7) !== 'http://') {
    console.log(longURL);
    longURL = `http://${longURL}`;
  }
  res.redirect(longURL);
});

app.post('/urls', (req, res) => {
  console.log(req.body);
  let short = generateRandomString(6);
  while (urlDatabase[short] !== undefined) {
    short = generateRandomString(6);
  }
  urlDatabase[short] = req.body.longURL;
  res.redirect(`/urls/${short}`);
  console.log(urlDatabase);
});

app.post('/urls/:id/delete', (req, res) => {
  console.log('delete request');
  const link = req.params.id;
  delete urlDatabase[link];
  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
