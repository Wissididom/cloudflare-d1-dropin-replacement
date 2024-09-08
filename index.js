import "dotenv/config";
import express from "express";
import helmet from "helmet";
import sqlite3 from "sqlite3";

function buildError(err) {
  let resultObj = {};
  for (let key of Object.keys(err)) {
    resultObj[key] = err[key];
  }
  resultObj.message = err.message;
  return resultObj;
}

async function handleSql(sql, params) {
  return new Promise((resolve, reject) => {
    const sqlLower = sql.trim().toLowerCase();
    let db = new sqlite3.Database("./database.db");
    if (sqlLower.startsWith("select")) {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(buildError(err));
          return;
        }
        resolve(rows);
      });
    } else {
      db.run(sql, params, (err) => {
        if (err) {
          reject(buildError(err));
          return;
        }
        resolve({ changes: this.changes, lastID: this.lastID });
      });
    }
  });
}

async function handleQuery(req, res) {
  if (req.get("Authorization") != `Bearer ${process.env.TOKEN}`) {
    res.status(401);
    res.send(
      JSON.stringify({
        errors: [
          {
            code: 401,
            message: "Invalid Authorization Header",
          },
        ],
        messages: [
          {
            code: 401,
            message: "Invalid Authorization Header",
          },
        ],
        result: null,
        success: false,
      }),
    );
    return;
  }
  try {
    let result = await handleSql(req.body.sql, req.body.params);
    res.send(
      JSON.stringify({
        errors: [],
        messages: [],
        result: [
          {
            meta: {
              changed_db: !req.body.sql
                .trim()
                .toLowerCase()
                .startsWith("select"),
              changes: 0,
              duration: 0,
              last_row_id: 0,
              rows_read: 0,
              rows_written: 0,
              size_after: 0,
            },
            results: result,
            success: true,
          },
        ],
        success: true,
      }),
    );
  } catch (err) {
    res.status(401);
    res.send(
      JSON.stringify({
        errors: [
          {
            code: 500,
            message: JSON.stringify(err),
          },
        ],
        messages: [
          {
            code: 500,
            message: JSON.stringify(err),
          },
        ],
        result: null,
        success: false,
      }),
    );
  }
}

const app = express();
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Check
app.get(`/check`, (req, res, next) => {
  res.send("Server is running");
});
// Query 1
app.post(
  `/client/:version/accounts/:accountId/d1/database/:databaseId/query`,
  handleQuery,
);
// Raw Query 1
app.post(
  `/client/:version/accounts/:accountId/d1/database/:databaseId/raw`,
  handleQuery,
);
// Query 2
app.post(`/query`, handleQuery);
// Raw Query 2
app.post(`/raw`, handleQuery);
app.use("/", (req, res, next) => {
  res.status(404); // Unknown route
  res.send("Unknown route");
});

app.listen(process.env.PORT);
console.log(`Server listening on port ${process.env.PORT}`);
