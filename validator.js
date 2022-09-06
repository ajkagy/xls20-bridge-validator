const xrpl = require("xrpl");
const WebSocket = require("ws");
const web3 = require("web3");
const sqlite3 = require("sqlite3").verbose();
var Contract = require("web3-eth-contract");
const fs = require("fs");
const Recovery = require("./recovery.js");
const Storage = require("./storage.js");
const XrplHelpers = require("./xrplhelpers.js");

require("dotenv").config();
const autoReconnectDelay = 5000;
var db;
var bridgeABI;
var erc721baseABI;
var ws;
var storage;
var recovery;
var xrplHelpers;

const requestNFTPayload = {
  type: "Request",
  command: "GetNewNFTs",
  validator: process.env.VALIDATOR_NUMBER,
};

const responseCombineMultiSigPayload = {
  type: "Response",
  command: "CombineMultiSig",
  validator: process.env.VALIDATOR_NUMBER,
  originOwner: "",
  contractAddress: "",
  tokenId: "",
  txn_blob: "",
};

const responseCombineMultiSigPayloadOffer = {
  type: "Response",
  command: "CombineMultiSigOffer",
  validator: process.env.VALIDATOR_NUMBER,
  originOwner: "",
  contractAddress: "",
  tokenId: "",
  txn_blob: "",
};

const responseSignPayload = {
  type: "Response",
  command: "SignMessage",
  validator: process.env.VALIDATOR_NUMBER,
  originOwner: "",
  contractAddress: "",
  tokenId: "",
  xrplAddress: "",
  signMessage: {},
};

const offerResponseSignPayload = {
  type: "Response",
  command: "OfferSignMessage",
  validator: process.env.VALIDATOR_NUMBER,
  originOwner: "",
  contractAddress: "",
  tokenId: "",
  xrplAddress: "",
  xrplTokenId: "",
  signMessage: {},
};

const responsePing = {
  type: "Response",
  command: "Ping",
  validator: process.env.VALIDATOR_NUMBER,
};

var reconnectInterval = 1000 * 5;
var connect = function () {
  ws = new WebSocket(process.env.MAIN_SERVER, {
    headers: {
      token: process.env.VALIDATOR_WSS_KEY,
    },
  });
  ws.on("open", function () {
    console.log("Validator " + process.env.VALIDATOR_NUMBER + " Connected!");
  });
  ws.on("error", function () {
    console.log("socket error");
  });
  ws.on("close", function () {
    console.log("socket close...attempting reconnect");
    setTimeout(connect, reconnectInterval);
  });

  ws.on("message", async (e) => {
    try {
      var request = JSON.parse(Buffer.from(e).toString("utf8"));
      if (request.command == "Ping") {
        await ws.send(JSON.stringify(responsePing));
      }
      if (request.command == "SignMessageConfirmed") {
        storage.updateSigned(
          db,
          request.contractAddress,
          request.originOwner,
          request.tokenId
        );
      }
      if (request.command == "SignOfferMessageConfirmed") {
        storage.updateOfferCreated(
          db,
          request.contractAddress,
          request.originOwner,
          request.tokenId
        );
      }
      if (request.command == "CombineMultiSig") {
        if (request.txn_blob.length > 1) {
          var blobArray = [];
          for (j = 0; j < request.txn_blob.length; j++) {
            blobArray.push(request.txn_blob[j]);
          }

          const combined = await xrpl.multisign(blobArray);

          var responsePayload = responseCombineMultiSigPayload;
          responsePayload.originOwner = request.originOwner;
          responsePayload.contractAddress = request.contractAddress;
          responsePayload.tokenId = request.tokenId;
          responsePayload.txn_blob = combined;
          await ws.send(JSON.stringify(responsePayload));
        } else {
          console.log("Invalid # of transaction blobs to be combined");
        }
      }
      if (request.command == "CombineMultiSigOffer") {
        if (request.txn_blob.length > 1) {
          var blobArray = [];
          for (j = 0; j < request.txn_blob.length; j++) {
            blobArray.push(request.txn_blob[j]);
          }

          const client = new xrpl.Client(process.env.XRPL_RPC);
          const combined = await xrpl.multisign(blobArray);

          var responsePayload = responseCombineMultiSigPayloadOffer;
          responsePayload.originOwner = request.originOwner;
          responsePayload.contractAddress = request.contractAddress;
          responsePayload.tokenId = request.tokenId;
          responsePayload.txn_blob = combined;
          await ws.send(JSON.stringify(responsePayload));
        } else {
          console.log("Invalid # of transaction blobs to be combined");
        }
      }
      if (request.command == "CreateOffer") {
        await CreateOffer(request);
      }
      if (request.command == "NewBridgeNFTs") {
        let recordExists = await storage.recordexists(
          db,
          request.contractAddress,
          request.originOwner,
          request.tokenId
        );
        if (recordExists == false) {
          await ValidateAndSign(request);
        }
      }
    } catch (error) {
      console.log(error);
    }
  });
};

async function main() {
  //Startup
  try {
    bridgeABI = fs.readFileSync("./bridge-abi.txt", "utf8");
    erc721baseABI = fs.readFileSync("./erc721-base.txt", "utf8");
  } catch (err) {
    console.error(err);
  }

  try {
    storage = new Storage();
    recovery = new Recovery();
    xrplHelpers = new XrplHelpers();
    if (fs.existsSync("./storage.db")) {
      console.log("Database found");
      db = storage.getInstance();
      console.log("ERC721-XLS20 Validator Starting");
      await connect();
    } else {
      console.log("Database not found. Starting in recovery mode...");
      db = storage.createDatabase();
      const recoveryValid = await recovery.RunRecovery(db);
      if (recoveryValid == true) {
        console.log("Recovery Successful");
        await connect();
      } else {
        console.log("Recovery Failed...Quitting");
        return;
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function CreateOffer(response) {
  try {
    const result = await xrplHelpers.getAccountNFTs();
    for (i = 0; i < result.account_nfts.length; i++) {
      if (
        xrpl.convertHexToString(result.account_nfts[i].URI) == response.tokenUri
      ) {
        const client = new xrpl.Client(process.env.XRPL_RPC);
        var offerPayload = xrplHelpers.CreateOfferPayload();
        offerPayload.NFTokenID = result.account_nfts[i].NFTokenID;
        offerPayload.Destination = response.xrplAddress;
        offerPayload.Sequence = await xrplHelpers.getNextSequence();
        let memoData;
        memoData = await xrpl.convertStringToHex(
          '{ "contractAddress":"' +
            response.contractAddress +
            '", "originOwner": "' +
            response.originOwner +
            '", "tokenId":"' +
            response.tokenId +
            '" }'
        );
        offerPayload.Memos[0].Memo.MemoData = memoData;

        const wallet = xrpl.Wallet.fromSeed(process.env.VALIDATOR_XRPL_SECRET);
        const signedMessage = await wallet.sign(offerPayload, true);

        var payload = offerResponseSignPayload;
        payload.originOwner = response.originOwner;
        payload.contractAddress = response.contractAddress;
        payload.tokenId = response.tokenId;
        payload.xrplAddress = response.xrplAddress;
        payload.xrplTokenId = result.account_nfts[i].NFTokenID;
        payload.signMessage = signedMessage.tx_blob;
        console.log(payload);
        ws.send(JSON.stringify(payload));
        break;
      }
    }
  } catch (error) {
    console.log(error);
  }
}

async function ValidateAndSign(request) {
  try {
    Contract.setProvider(process.env.ETH_ENDPOINT);
    var MyContract = new Contract(
      JSON.parse(bridgeABI),
      process.env.BRIDGE_CONTRACT
    );

    var originOwner = request.originOwner;
    var tokenId = request.tokenId;
    var contractAddress = request.contractAddress;
    var xrplAddress = request.xrplAddress;
    //Validate that data is good straight from ETH
    MyContract.methods
      .returnBridgeNFTsByWallet(request.originOwner)
      .call()
      .then(async function (result) {
        for (j = 0; j < result.length; j++) {
          if (
            originOwner == result[j].originOwner &&
            tokenId == result[j].tokenId &&
            contractAddress == result[j].contractAddress
          ) {
            //Valid data. Proceed to sign and send to master process
            var signMessage = xrplHelpers.TokenMintPayload();

            //Check token URI
            var TokenContract = new Contract(
              JSON.parse(erc721baseABI),
              result[j].contractAddress
            );
            TokenContract.methods
              .tokenURI(result[j].tokenId)
              .call()
              .then(async function (result) {
                const tokenUri = result;
                //Create Signed Payload and send back to Master Process
                signMessage.URI = xrpl.convertStringToHex(tokenUri);
                let memoData;
                memoData = await xrpl.convertStringToHex(
                  '{ "contractAddress":"' +
                    contractAddress +
                    '", "originOwner": "' +
                    originOwner +
                    '", "tokenId":"' +
                    tokenId +
                    '" }'
                );
                signMessage.Memos[0].Memo.MemoData = memoData;
                signMessage.Sequence = await xrplHelpers.getNextSequence();
                const wallet = xrpl.Wallet.fromSeed(
                  process.env.VALIDATOR_XRPL_SECRET
                );
                const signedMessage = await wallet.sign(signMessage, true);

                var payload = responseSignPayload;
                payload.originOwner = originOwner;
                payload.contractAddress = contractAddress;
                payload.tokenId = tokenId;
                payload.xrplAddress = xrplAddress;
                payload.signMessage = signedMessage.tx_blob;
                ws.send(JSON.stringify(payload));
                storage.insert(
                  db,
                  contractAddress,
                  originOwner,
                  tokenId,
                  xrplAddress
                );
              });
          }
        }
      });
  } catch (error) {
    console.log("Validate and sign error: " + error);
  }
}

main();
