const express = require('express');
const app = express();
const postRoute = require('./routes/posts');


// Import routes
const authRoute = require('./routes/auth');


//Router MIddlewares
app.use(express.json());
app.use('/api/user', authRoute);
app.use('/api/posts', postRoute);

module.exports = app;
