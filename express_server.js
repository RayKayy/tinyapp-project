const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');

const app = express();
const PORT = 8080; // default port 8080

app.set('view engine', 'ejs');

const urlDatabase = {
  b2xVn2: 'http://www.lighthouselabs.ca',
  '9sm5xK': 'http://www.google.com',
};

const users = {};

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
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    userObject: users[req.cookies.user_id],
  };
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    userObject: users[req.cookies.user_id],
  };
  res.render('urls_new', templateVars);
});

app.get('/login', (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    userObject: users[req.cookies.user_id],
  };
  res.render('login', templateVars);
});

app.get('/register', (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    userObject: users[req.cookies.user_id],
  };
  res.render('register', templateVars);
});

app.get('/urls', (req, res) => {
  console.log(req.cookies);
  const templateVars = {
    urls: urlDatabase,
    userObject: users[req.cookies.user_id],
  };
  res.render('urls_index', templateVars);
});

app.get('/urls/:id', (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    id: req.params.id,
    userObject: users[req.cookies.user_id],
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

app.post('/login', (req, res) => {
  console.log(req.body);
  const { username } = req.body;
  const { password } = req.body;
  for (let userId in users) {
    if (users[userId].email === username) {
      if (users[userId].password === password) {
        res.cookie('user_id', userId);
        console.log('Created new cookie for', username);
        res.redirect('/');
      } else {
        res.status(403).send('Wrong password.').end();
        return;
      }
    }
  }
  res.status(403).send('Email not registered.').end();
  return;
});

app.post('/register', (req, res) => {
  console.log(req.body);
  let id = generateRandomString(10);
  while (users[id] !== undefined) {
    id = generateRandomString(10);
  }
  if (req.body.email === '' || req.body.password === '') {
    res.status(400).send('Email or password cannot be empty.').end();
    return;
  }
  for (let userId in users) {
    if (users[userId].email === req.body.email) {
      res.status(400).send('Email registered.').end();
      return;
    }
  }
  users[id] = {};
  users[id].id = id;
  users[id].email = req.body.email;
  users[id].password = req.body.password;
  res.cookie('user_id', id);
  console.log(users);
  res.redirect('/urls');
});

app.post('/logout', (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/urls');
});

app.post('/urls', (req, res) => {
  console.log(`Generating new link for ${req.body.longURL}`);
  let short = generateRandomString(6);
  while (urlDatabase[short] !== undefined) {
    short = generateRandomString(6);
  }
  urlDatabase[short] = req.body.longURL;
  res.redirect(`/urls/${short}`);
});

app.post('/urls/:id/delete', (req, res) => {
  console.log(`Delete request on ${req.params.id}`);
  const link = req.params.id;
  delete urlDatabase[link];
  res.redirect('/urls');
});

app.post('/urls/:id/update', (req, res) => {
  const link = req.params.id;
  console.log(`Updating link ${link} to ${req.body.newURL}`);
  urlDatabase[link] = req.body.newURL;
  console.log('Updated');
  res.redirect(`/urls/${link}`);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
