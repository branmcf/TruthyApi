const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const app = express();
const connectionString = 'postgres://ubfshvpvonrkvr:b87b3d8160d836b9fac7762fa942f46b7c70055867ff78b2e5b550ae78b68b97@ec2-54-163-240-54.compute-1.amazonaws.com:5432/daledlksliu340?ssl=true'

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: connectionString,
  ssl: true
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

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

