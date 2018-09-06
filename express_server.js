const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
// const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const methodOverride = require('method-override');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 8080; // default port 8080

app.set('view engine', 'ejs');

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


app.use(bodyParser.urlencoded({ extended: true }));
// app.use(cookieParser());
app.use(cookieSession({
  name: 'session',
  keys: ['this is my key'],
}));
app.use(methodOverride('_method'));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  const templateVars = {
    urls: urlsForUser(req.session.user_id),
    userObject: users[req.session.user_id],
  };
  res.render('urls_index', templateVars);
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
    urls: urlsForUser(req.session.user_id),
    userObject: users[req.session.user_id],
  };
  res.render('login', templateVars);
});

app.get('/register', (req, res) => {
  const templateVars = {
    urls: urlsForUser(req.session.user_id),
    userObject: users[req.session.user_id],
  };
  res.render('register', templateVars);
});

app.get('/urls', (req, res) => {
  console.log(req.session);
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
    res.status(404).send('URL access denied: belong to another user.').end();
  } else if (req.session.user_id === undefined) {
    res.status(404).send('Please login or register first').end();
  }
  res.render('single_url', templateVars);
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

app.get('/u/:shortURL', (req, res) => {
  let longURL = urlDatabase[req.params.shortURL].url;
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
      if (bcrypt.compareSync(password, users[userId].password)) {
        req.session.user_id = userId;
        console.log('Created new session for', username);
        res.redirect('/');
      } else {
        res.status(403).send('Invalid password or email.').end();
      }
    }
  }
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
  res.clearCookie('session');
  res.redirect('/urls');
});

app.post('/urls', (req, res) => {
  console.log(`Generating new link for ${req.body.longURL}`);
  let short = generateRandomString(6);
  while (urlDatabase[short] !== undefined) {
    short = generateRandomString(6);
  }
  urlDatabase[short] = {
    url: req.body.longURL,
    user: req.session.user_id,
  };
  console.log(urlDatabase);
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
    res.status(400).send('Action not allowed; URL owned by another user.').end();
  }
});

app.post('/urls/:id/update', (req, res) => {
  const link = req.params.id;
  const user = req.session.user_id;
  if (urlDatabase[link].user === user) {
    console.log(`Updating link ${link} to ${req.body.newURL}`);
    urlDatabase[link].url = req.body.newURL;
    console.log('Updated');
    console.log(urlDatabase);
    res.redirect(`/urls/${link}`);
  } else {
    res.status(400).send('Action not allowed; URL owned by another user.').end();
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
