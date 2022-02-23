const XrplHelpers = require('./xrplhelpers.js');
const Storage = require('./storage.js')
const xrpl = require("xrpl");
class Recovery {
    async RunRecovery(db){
        const client = new xrpl.Client(process.env.XRPL_RPC);
        try{
            let xrplhelper = new XrplHelpers();
            let marker = undefined;
            let totalTransactions = 0;
            await client.connect();
            let accountTx = await xrplhelper.getAccountTransactions(client, marker);
            totalTransactions = accountTx.transactions.length;
            console.log('Found ' + totalTransactions + ' Total Transactions...Processing');
            this.ProcessTransactions(accountTx.transactions,db);
            marker = accountTx.marker;
            while(marker != undefined)
            {
                await new Promise(r => setTimeout(r, 5000));
                accountTx = await xrplhelper.getAccountTransactions(client, marker);
                totalTransactions = totalTransactions + accountTx.transactions.length;
                console.log('Found ' + totalTransactions + ' Total Transactions...Processing');
                this.ProcessTransactions(accountTx.transactions,db);
                marker = accountTx.marker;
            }     
            return true;   
        } catch(err)
        {
            console.log(err);
            return false;
        } finally
        {
            await client.disconnect();
        }
    }
    ProcessTransactions(transactions, db)
    {
        let storage = new Storage();
        for(let i = 0; i < transactions.length; i++)
        {
            if(transactions[i].tx.TransactionType == 'NFTokenMint')
            {
                if(transactions[i].tx.Memos != undefined)
                {
                    for(let j = 0; j < transactions[i].tx.Memos.length; j++)
                    {
                        try{
                            let jsonMemo = JSON.parse(xrpl.convertHexToString(transactions[i].tx.Memos[j].Memo.MemoData));
                            storage.updateSigned(db,jsonMemo.contractAddress,jsonMemo.originOwner,jsonMemo.tokenId);
                            storage.insertRecovery(db,jsonMemo.contractAddress,jsonMemo.originOwner,jsonMemo.tokenId,1,0);
                        } catch(err)
                        {
                            console.log(err)
                        }
                    }
                }
            }
            if(transactions[i].tx.TransactionType == 'NFTokenCreateOffer')
            {
                if(transactions[i].tx.Memos != undefined)
                {
                    for(let j = 0; j < transactions[i].tx.Memos.length; j++)
                    {
                        try{
                            let jsonMemo = JSON.parse(xrpl.convertHexToString(transactions[i].tx.Memos[j].Memo.MemoData));
                            storage.updateOfferCreated(db,jsonMemo.contractAddress,jsonMemo.originOwner,jsonMemo.tokenId);
                            storage.insertRecovery(db,jsonMemo.contractAddress,jsonMemo.originOwner,jsonMemo.tokenId,1,1);
                        } catch(err)
                        {
                            console.log(err)
                        }
                    }
                }
            }
        }
    }
  }
  
  module.exports = Recovery