// ///////
// Modules
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 8080; // default port 8080
app.set('view engine', 'ejs');

// ////
// Data
const urlDatabase = {
  b2xVn2: {
    url: 'http://www.lighthouselabs.ca',
    user: 'default',
  },
  '9sm5xK': {
    url: 'http://www.google.com',
    user: 'default',
  },
};

const users = {};

// ////////////////
// Helper Functions
// Generates and returns a random Alphanumeric string
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

// Return an object which is a subset of the urlDatabase based on id of user.
function urlsForUser(id) {
  const subset = {};
  for (let link in urlDatabase) {
    if (urlDatabase[link].user === id) {
      subset[link] = urlDatabase[link];
    }
  }
  return subset;
}

// ///////////
// Middleware
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/stylesheets'));
app.use(cookieSession({
  name: 'session',
  keys: ['this is my key'],
}));

// //////////////////
// GET request routes
app.get('/', (req, res) => {
  if (req.session.user_id) {
    res.redirect('/urls');
  } else {
    res.redirect('/login');
  }
});

app.get('/urls/new', (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    userObject: users[req.session.user_id],
  };
  if (templateVars.userObject === undefined) {
    res.redirect('/login');
    return;
  }
  res.render('urls_new', templateVars);
});

app.get('/login', (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    userObject: users[req.session.user_id],
  };
  if (req.session.user_id !== undefined) {
    res.redirect('/urls');
  } else {
    res.render('login', templateVars);
  }
});

app.get('/register', (req, res) => {
  const templateVars = {
    urls: urlsForUser(req.session.user_id),
    userObject: users[req.session.user_id],
  };
  if (req.session.user_id !== undefined) {
    res.redirect('/urls');
  } else {
    res.render('register', templateVars);
  }
});

app.get('/urls', (req, res) => {
  const templateVars = {
    urls: urlsForUser(req.session.user_id),
    userObject: users[req.session.user_id],
  };
  res.render('urls_index', templateVars);
});

app.get('/urls/:id', (req, res) => {
  const templateVars = {
    urls: urlsForUser(req.session.user_id),
    id: req.params.id,
    userObject: users[req.session.user_id],
  };
  if (urlDatabase[req.params.id] === undefined) {
    res.status(404).send('Link does not exist').end();
  } else if (templateVars.urls[req.params.id] === undefined) {
    res.status(404).send('URL access denied.').end();
  } else if (req.session.user_id === undefined) {
    res.status(404).send('Please login or register first').end();
  }
  res.render('single_url', templateVars);
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

app.get('/u/:shortURL', (req, res) => {
  if (urlDatabase[req.params.shortURL] === undefined) {
    res.status(404).send('Link not found.');
    return;
  }
  let longURL = urlDatabase[req.params.shortURL].url;
  console.log('Visited:', urlDatabase[req.params.shortURL].count += 1);
  if (longURL.slice(0, 7) !== 'http://') {
    longURL = `http://${longURL}`;
  }
  res.redirect(longURL);
});

// ///////////////////
// POST request routes
app.post('/login', (req, res) => {
  const { username } = req.body;
  const { password } = req.body;
  for (let userId in users) {
    if (users[userId].email === username) {
      if (bcrypt.compareSync(password, users[userId].password)) {
        req.session.user_id = userId;
        console.log('Created new session for', username);
        res.redirect('/');
        return;
      }
    }
  }
  res.status(403).send('Invalid password or email.').end();
});

app.post('/register', (req, res) => {
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
  users[id].password = bcrypt.hashSync(req.body.password, 10);
  req.session.user_id = id;
  res.redirect('/urls');
});

app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/urls');
});

app.post('/urls', (req, res) => {
  console.log(`Generating new link for ${req.body.longURL}`);
  let short = generateRandomString(6);
  const date = new Date().toDateString();
  while (urlDatabase[short] !== undefined) {
    short = generateRandomString(6);
  }
  urlDatabase[short] = {
    url: req.body.longURL,
    user: req.session.user_id,
    count: 0,
    date,
  };
  res.redirect(`/urls/${short}`);
});

app.post('/urls/:id/delete', (req, res) => {
  console.log(`Delete request on ${req.params.id}`);
  const user = req.session.user_id;
  const link = req.params.id;
  if (urlDatabase[link].user === user) {
    delete urlDatabase[link];
    res.redirect('/urls');
  } else {
    res.status(400).send('Action denied.').end();
  }
});

app.post('/urls/:id', (req, res) => {
  const link = req.params.id;
  const user = req.session.user_id;
  if (urlDatabase[link].user === user) {
    console.log(`Updating link ${link} to ${req.body.newURL}`);
    urlDatabase[link].url = req.body.newURL;
    console.log('Updated');
    res.redirect('/urls');
  } else {
    res.status(400).send('Action denied.').end();
  }
});

// LISTEN
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
