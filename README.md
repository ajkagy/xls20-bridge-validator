# xls-20-bridge-validator
NodeJS lightweight validator for the ERC721 to XLS-20 bridge

### Requirements

+ [NodeJs](https://nodejs.org/en/)
+ [Git](https://git-scm.com/downloads)
+ [Infura Account](https://infura.io/)

## Getting Started

1. Create an [Infura Account](https://infura.io/), Create a new project, then make note of the Rinkeby https endpoint.

## Installation

Open a command prompt or Powershell prompt and issue the following commands

```
git clone https://github.com/ajkagy/xls20-bridge-validator
```

1. in the root of the xls20-bridge-validator directory create a new .env file and add the following text:

          UPDATE_FREQUENCY=15
          MAIN_SERVER=wss://192.168.0.133:11500/
          VALIDATOR_WSS_KEY=
          VALIDATOR_NUMBER=1
          VALIDATOR_XRPL_ADDRESS=
          VALIDATOR_XRPL_SECRET=
          MULTI_SIG_WALLET_ADDRESS= 
          ETH_ENDPOINT=
          BRIDGE_CONTRACT=0xaA1c3f272f9709d2a6dB4A8FC3Ab0e31FFd30a92
          XRPL_RPC=wss://xls20-sandbox.rippletest.net:51233

2. Replace the environement variables with your own set values.
    - `MAIN_SERVER` the websocket url for the [Bridge Master Process](https://github.com/ajkagy/xls20-bridge-master) example shown.
    - `VALIDATOR_WSS_KEY` the WS/WSS Key for the [Bridge Master Process](https://github.com/ajkagy/xls20-bridge-master)
    - `VALIDATOR_NUMBER` validator number (1,2 or 3)
    - `VALIDATOR_XRPL_ADDRESS` xrpl address for the validators setup in step 1 of the [Bridge Instructions](https://github.com/ajkagy/xls20-bridge)
    - `VALIDATOR_XRPL_SECRET` xrpl seed for the validators setup in step 1 of the [Bridge Instructions](https://github.com/ajkagy/xls20-bridge)
    - `MULTI_SIG_WALLET_ADDRESS` multisig issuer address setup in step 3 of the [Bridge Instructions](https://github.com/ajkagy/xls20-bridge)
    - `ETH_ENDPOINT` Infura Rinkeby Eth Endpoint
    - `BRIDGE_CONTRACT` Bridge contract address on Rinkeby
    - `XRPL_RPC` XLS-20 Dev Net RPC

3. Install

        npm install

4. Start the validator

        node validator.js
