'use strict';

require('dotenv').config();

const PORT = process.env.PORT || 3001;

const app = require('./express/server.js');

app.listen(PORT, () => console.log(`Local app listening on port ${PORT}!`));