const express = require('express')
const app = express();
const path = require('path')
const PORT = process.env.PORT || 5000
const bodyParser = require('body-parser');
const connectionString = 'postgres://ubfshvpvonrkvr:b87b3d8160d836b9fac7762fa942f46b7c70055867ff78b2e5b550ae78b68b97@ec2-54-163-240-54.compute-1.amazonaws.com:5432/daledlksliu340?ssl=true'

//middleware for CORS requests
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

//postgres setup
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: connectionString,
  ssl: true
});

app
  .use(express.static(path.join(__dirname, 'public')))
  .use(bodyParser.json())
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  // .get('/', (req, res) => res.render('pages/index'))
  .listen(PORT, () => console.log(`~ TRUTHY API LISTENING ON PORT: ${ PORT } ~`))

app.get('/', function(request, response) {
  response.send('Hello World!');
  console.log("hello roland");
});


app.get('/db', async (req, res) => {
      try {
        const client = await pool.connect()
        const result = await client.query('SELECT * FROM test_table');
        res.render('pages/db', result);
        client.release();
      } catch (err) {
        console.error(err);
        res.send("Error " + err);
      }
    });