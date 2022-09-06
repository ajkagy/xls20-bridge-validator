const xrpl = require("xrpl");
require("dotenv").config();
class XrplHelpers {

  async getNextSequence() {
    const client = new xrpl.Client(process.env.XRPL_RPC);
    await client.connect();
    const response = await client.request({
      command: "account_info",
      account: process.env.MULTI_SIG_WALLET_ADDRESS,
      ledger_index: "validated",
    });
    await client.disconnect();
    return response.result.account_data.Sequence;
  }

  async getAccountNFTs() {
    const client = new xrpl.Client(process.env.XRPL_RPC);
    await client.connect();
    const response = await client.request({
      command: "account_nfts",
      account: process.env.MULTI_SIG_WALLET_ADDRESS,
      ledger_index: "validated",
    });
    await client.disconnect();
    return response.result;
  }

  async getAccountTransactions(client, marker) {
    const request = this.TransactionRequestPayload();
    if (marker != undefined) {
      request.marker = marker;
    }
    const response = await client.request(request);
    return response.result;
  }

  async getTransactionMetadata(txnHash) {
    const client = new xrpl.Client(process.env.XRPL_RPC);
    await client.connect();
    const response = await client.request({
      command: "tx",
      transaction: txnHash,
    });
    await client.disconnect();
    return response.result;
  }

  async getAccountSellOffers(tokenId)
  {
      const client = new xrpl.Client(process.env.XRPL_RPC);  
      await client.connect();
  
      let nftSellOffers
        try {
            nftSellOffers = await client.request({
            method: "nft_sell_offers",
            tokenid: tokenId
          })
          } catch (err) {
            console.log("No sell offers.")
        }
        await client.disconnect();
        return nftSellOffers.result;
  }

  TransactionRequestPayload() {
    return {
      command: "account_tx",
      account: process.env.MULTI_SIG_WALLET_ADDRESS,
    };
  }

  CreateOfferPayload() {
    return {
      TransactionType: "NFTokenCreateOffer",
      Account: process.env.MULTI_SIG_WALLET_ADDRESS,
      NFTokenID: "",
      Destination: "",
      Amount: "0",
      Flags: xrpl.NFTokenCreateOfferFlags.tfSellNFToken,
      Sequence: 0,
      Fee: "1000",
      Memos: [
        {
          Memo: {
            MemoData: "",
          },
        },
      ],
    };
  }

  TokenMintPayload() {
    return {
      TransactionType: "NFTokenMint",
      Account: process.env.MULTI_SIG_WALLET_ADDRESS,
      Flags: xrpl.NFTokenMintFlags.tfTransferable,
      URI: "",
      NFTokenTaxon: 0,
      Fee: "1000",
      Sequence: 0,
      Memos: [
        {
          Memo: {
            MemoData: "",
          },
        },
      ],
    };
  }

}

module.exports = XrplHelpers;
