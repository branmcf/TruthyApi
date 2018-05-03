//boilerplate
const express = require('express')
const bodyParser = require('body-parser');
const path = require('path')
const app = express();
const PORT = process.env.PORT || 5000
const connectionString = 'postgres://ubfshvpvonrkvr:b87b3d8160d836b9fac7762fa942f46b7c70055867ff78b2e5b550ae78b68b97@ec2-54-163-240-54.compute-1.amazonaws.com:5432/daledlksliu340?ssl=true'
const bcrypt = require('bcrypt');

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

//express configuration
app
  .use(express.static(path.join(__dirname, 'public')))
  .use(bodyParser.json())
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .listen(PORT, () => console.log(`~ TRUTHY API LISTENING ON PORT: ${ PORT } ~`))
  // .get('/', (req, res) => res.render('pages/index'))


// 
//Application Routes
//

app.get('/', function(req, res) {
  res.status(200).send({'message':'Touched base with Truthy API'});
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

// app.get('/signup', async (req, res) => {
//   try {
//     const client = await pool.connect()
//     // const result = await client.query('INSERT INTO users (password, type) VALUES ($1, $2)');
//     console.log('BODY IS: ', req.body);
//     res.render('pages/db', result);
//     client.release();
//   } catch (err) {
//     console.error(err);
//     res.send("Error " + err);
//   }
// });

app.post('/signup', async (req, res) => {
  try {
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    const userType = req.body.accountType;
    const userEmail = req.body.email;
    const text = 'INSERT INTO users (email, password, type) VALUES ($1, $2, $3)'
    const values = [ userEmail, hashedPassword, userType ];
    const client = await pool.connect();
    const result = await client.query(text, values);
    res.status(200).send({'message':'Signup submitted successfully!'});
    client.release();
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/login', async (req, res) => {
  try {
    if (req.body.password && req.body.email ) {
      console.log('in if')
      const userPassword = req.body.password;
      const userEmail = req.body.email;
      // const text = 'SELECT (id, password) FROM users WHERE email = $1'
      const text = 'select row_to_json(t) from ( select * from users WHERE email = $1) t'
      const values = [userEmail];
      const client = await pool.connect();
      const result = await client.query(text, values);
      var dbPassword = (result.rows[0].row_to_json.password);
      const dbId = result.rows[0].row_to_json.id;
      // console.log(dbId, dbPassword)
      if(bcrypt.compareSync(userPassword, dbPassword)) {
        res.status(200).send({'isAuthenticated': true, 'userId': dbId});
       } else {
        res.status(400).send({'isAuthenticated': false});
       }
      client.release();
    }
    else {
      console.log('in else')
      res.status(400).send({'message':'Invalid login', 'isAuthenticated': false});
    }
  } catch (err) {
    console.log('in catch')
    console.error(err);
    res.status(400).send({'message': `Error:  + ${err}`, 'isAuthenticated': false});
  }
});

app.post('/addRequest', async (req, res) => {
  try {
    const updateBalance = async (id, price, currentBalance) => {
      const subbedBalance = +currentBalance - +price;
      const text = 'UPDATE users SET funds = $1 WHERE id = $2 RETURNING funds'
      const values = [subbedBalance, id];
      const client = await pool.connect();
      const result = await client.query(text, values);
      const newBalance = result.rows[0].funds
      client.release();
      return newBalance;
    }

    const userId = req.body.userId
    const statement = req.body.statement
    const expiry = req.body.expiry;
    const price = req.body.price;
    const currentBalance = req.body.currentBalance;
    const text = 'INSERT INTO requests (user_id, body, expiration, price) VALUES ($1, $2, $3, $4)'
    const values = [userId, statement, expiry, price];
    const client = await pool.connect();
    const result = await client.query(text, values);
    client.release();
    const updatedBalance = await updateBalance(userId, price, currentBalance);
    console.log('updatedBalance: ', updatedBalance);
    return res.status(200).send({'message': 'Request submitted successfully!', 'submitted': true, 'balance': updatedBalance});
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }

  // const updateBalance = async (id, price, currentBalance) => {
  //   const subbedBalance = +currentBalance - +price;
  //   const text = 'UPDATE users SET funds = $1 WHERE id = $2 RETURNING funds'
  //   const values = [subbedBalance, id];
  //   const client = await pool.connect();
  //   const result = await client.query(text, values);
  //   const newBalance = result.rows[0].funds
  //   client.release();
  //   return newBalance;
  // }
});

app.post('/oneUser', async (req, res) => {
  try {
    const userId = req.body.paramId
    const text = 'SELECT * FROM users WHERE id = $1'
    const values = [userId];
    const client = await pool.connect();
    const result = await client.query(text, values);
    const userType = result.rows[0].type;
    const balance = result.rows[0].funds;
    client.release();
    return res.status(200).send({
      'message': 'Got user successfully!',
      'userType': userType,
      'balance': balance
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.get('/allOpenRequests', async (req, res) => {
  try {
    const text = 'SELECT * FROM requests WHERE complete = true OR in_progress = false'
    const values = [];
    rowResults = [];
    const client = await pool.connect();
    const result = await client.query(text, values);
    console.log(result)
    for (let i in result.rows) {
      rowResults.push(result.rows[i])
    }
    client.release();
    return res.status(200).send({
      'message': 'Got requests successfully!',
      'rows': rowResults
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/allRequestsByUserId1', async (req, res) => {
  try {
    const userId = req.body.paramId
    const text = 'SELECT * FROM requests WHERE user_id = $1'
    const values = [userId];
    rowResults = [];
    const client = await pool.connect();
    const result = await client.query(text, values);
    for (let i in result.rows) {
      rowResults.push(result.rows[i])
    }
    client.release();
    return res.status(200).send({
      'message': 'Got requests successfully!',
      'rows': rowResults
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/allRequestsByUserId2', async (req, res) => {
  console.log('HERE!!!')
  try {
    const userId = req.body.paramId
    console.log(userId);
    const text = 'SELECT * FROM requests WHERE responder_id = $1'
    const values = [userId];
    rowResults = [];
    const client = await pool.connect();
    const result = await client.query(text, values);
    for (let i in result.rows) {
      rowResults.push(result.rows[i])
    }
    client.release();
    return res.status(200).send({
      'message': 'Got requests successfully!',
      'rows': rowResults
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/getRequestById', async (req, res) => {
  try {
    const userId = req.body.paramId;
    const resourceId = req.body.resourceId;
    const text = `SELECT * FROM requests WHERE id = $1`;
    const values = [resourceId];
    const client = await pool.connect();
    const result = await client.query(text, values);
    const resultRow = result.rows[0];
    console.log(resultRow);

    const text1 = `SELECT * FROM users WHERE id = $1`;
    const values1 = [userId];
    const result1 = await client.query(text1, values1);
    const resultRow1 = result1.rows[0];

    client.release();
    return res.status(200).send({
      'message': 'Got request successfully!',
      'data': {
        'request_id': resultRow.id,
        'requester_id': resultRow.user_id,
        'user_id': resultRow1.id,
        'type': resultRow1.type,
        'body': resultRow.body,
        'expiration': resultRow.expiration ,
        'price': resultRow.price,
        'complete': resultRow.complete,
        'in_progress': resultRow.in_progress,
        'email': resultRow.email,
        'corpus': resultRow.corpus
      }
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/getBidsForRequest', async (req, res) => {
  try {
    const reqId = req.body.paramId
    const text = 'SELECT * FROM bids WHERE req_id = $1'
    const values = [reqId];
    bidArray = [];
    const client = await pool.connect();
    const result = await client.query(text, values);
    const resultRowsArray = result.rows;
    client.release();

    for (let i in resultRowsArray) {
      bidArray.push(resultRowsArray[i])
    }

    return res.status(200).send({
      'message': 'Got bids successfully!',
      'data': bidArray
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/deteteRequest', async (req, res) => {
  try {
    const reqId = req.body.reqId
    const text = 'DELETE FROM requests WHERE id = $1'
    const values = [reqId];
    const client = await pool.connect();
    const result = await client.query(text, values);
    client.release();
    return res.status(200).send({
      'message': 'Deleted request successfully!'
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/addFunds', async (req, res) => {
  try {
    const userId = req.body.userId
    const amount = req.body.amount
    const text = 'UPDATE users SET funds = $1 WHERE id = $2 RETURNING funds'
    const values = [amount, userId];
    const client = await pool.connect();
    const result = await client.query(text, values);
    const newbalance = result.rows[0].funds
    client.release();
    return res.status(200).send({
      'message': 'Added funds successfully!',
      'newBalance': newbalance
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/saveCorpus', async (req, res) => {
  try {
    const corpus = req.body.corpus;
    const reqId = req.body.reqId;
    const text = 'UPDATE requests SET corpus = $1 WHERE id = $2'
    const values = [corpus, reqId];
    const client = await pool.connect();
    const result = await client.query(text, values);
    client.release();
    return res.status(200).send({
      'message': 'Corpus saved successfully!'
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/markInProgress', async (req, res) => {
  try {
    const requestId = req.body.requestId;
    const requesterId = req.body.requesterId;
    const responderId = req.body.responderId;
    const text = 'UPDATE requests SET in_progress = TRUE, responder_id = $1 WHERE id = $2 RETURNING *'
    const values = [responderId, requestId];
    const client = await pool.connect();
    const result = await client.query(text, values);

    client.release();
    return res.status(200).send({
      'message': 'Request marked as in progress!'
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/markComplete', async (req, res) => {
  try {
    const requestId = req.body.requestId;
    const text = 'UPDATE requests SET in_progress = FALSE, complete = TRUE WHERE id = $1'
    const values = [requestId];
    const client = await pool.connect();
    const result = await client.query(text, values);

    client.release();
    return res.status(200).send({
      'message': 'Request marked as complete!'
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});