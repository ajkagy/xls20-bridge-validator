const sqlite3 = require("sqlite3").verbose();

class Storage {
  createDatabase() {
    var newdb = new sqlite3.Database("./storage.db", (err) => {
      if (err) {
        console.log("Getting error " + err);
        exit(1);
      }
      this.createTables(newdb);
    });
    return newdb;
  }

  createTables(newdb) {
    newdb.exec(
      `
        CREATE TABLE IF NOT EXISTS BridgeNFT (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          contractAddress TEXT NOT NULL,
          originOwner TEXT NOT NULL,
          tokenId INTEGER NOT NULL,
          xrplAddress TEXT NOT NULL,
          signed INTEGER DEFAULT 0,
          offerCreated INTEGER DEFAULT 0
      );`,
      () => {}
    );
  }

  getInstance() {
    return new sqlite3.Database(
      "./storage.db",
      sqlite3.OPEN_READWRITE,
      (err) => {
        if (err && err.code == "SQLITE_CANTOPEN") {
          console.log(err);
          return;
        } else if (err) {
          console.log("Getting error " + err);
          exit(1);
        }
      }
    );
  }

  insert(db, contractAddress, originOwner, tokenId, xrplAddress) {
    db.run(
      `INSERT INTO BridgeNFT(contractAddress,originOwner,tokenId,xrplAddress,signed) select ?,?,?,?,? WHERE (SELECT COUNT(*) FROM BridgeNFT WHERE contractAddress = ? and tokenId = ?) = 0`,
      [
        contractAddress,
        originOwner,
        tokenId,
        xrplAddress,
        0,
        contractAddress,
        tokenId,
      ],
      function () {
        console.log("New BridgeNFT added with id " + this.lastID);
      }
    );
  }

  insertRecovery(
    db,
    contractAddress,
    originOwner,
    tokenId,
    signed,
    signedOffer
  ) {
    try {
      db.run(
        `INSERT INTO BridgeNFT(contractAddress,originOwner,tokenId,xrplAddress,signed,offerCreated) select ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM BridgeNFT WHERE contractAddress = ? and tokenId = ?) = 0`,
        [
          contractAddress,
          originOwner,
          tokenId,
          "",
          signed,
          signedOffer,
          contractAddress,
          tokenId,
        ]
      );
    } catch (err) {
      console.log(err);
    }
  }

  updateSigned(db, contractAddress, originOwner, tokenId) {
    try {
      db.run(
        `UPDATE BridgeNFT SET signed = 1 WHERE contractAddress = ? and originOwner = ? and tokenId = ?`,
        [contractAddress, originOwner, tokenId]
      );
    } catch (err) {
      console.log(err);
    }
  }

  updateOfferCreated(db, contractAddress, originOwner, tokenId) {
    try {
      db.run(
        `UPDATE BridgeNFT SET offerCreated = 1 WHERE contractAddress = ? and originOwner = ? and tokenId = ?`,
        [contractAddress, originOwner, tokenId]
      );
    } catch (err) {
      console.log(err);
    }
  }

  async recordexists(db, contractAddress, originOwner, tokenId) {
    return new Promise(function (resolve, reject) {
      let sql = `SELECT * FROM BridgeNFT WHERE contractAddress = ? and tokenId = ? and originOwner = ? `;
      let returnVal = undefined;

      try {
        db.all(sql, [contractAddress, tokenId, originOwner], (err, rows) => {
          if (err) {
            console.log("Record Exists Error: " + err);
          }
          if (rows.length > 0) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
      } catch (err) {
        console.log(err);
      }
    });
  }
}

module.exports = Storage;
