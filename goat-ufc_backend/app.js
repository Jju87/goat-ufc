const express = require('express');
const mongoose = require('mongoose');

mongoose.set('debug', (collectionName, method, query, doc) => {
  console.log(`Mongoose: ${collectionName}.${method}`, JSON.stringify(query), doc);

});const cors = require('cors');

const app = express()
const fightRoutes = require('./routes/fight');
const fighterRoutes = require('./routes/fighter');
const eloRoutes = require('./routes/elo');


require('dotenv').config();
app.use(cors());


mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB Connected...'))
.catch(err => console.log(err));

// mongoose.connection.on('connected', async () => {
//   console.log('Mongoose connected to MongoDB...');
//   const collections = await mongoose.connection.db.listCollections().toArray();
//   console.log('Name of database collection:', mongoose.connection.db.databaseName);

//   console.log('show collections:', collections.map(c => c.name));
//   const uriParts = process.env.MONGODB_URI.split('@');
//   console.log('URI (part after @):', uriParts[uriParts.length - 1]);
//   const count = await mongoose.connection.db.collection('fights').countDocuments();
//   console.log('Number of docs collection fights:', count);
//   const fightIndexes = await mongoose.connection.db.collection('fights').indexes();
//   console.log('Index of collection fights:', fightIndexes);
// });

app.use(express.json())

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  next();
})
// route handler for the root route 
app.get('/', (req, res) => {
  res.send('Welcome to the goat-ufc API!');
});

app.use('/api/fight', fightRoutes);
app.use('/api/fighter', fighterRoutes);
app.use('/api/elo', eloRoutes);

module.exports = app;
