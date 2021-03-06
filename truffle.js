const path = require("path");
let HDWalletProvider = require("truffle-hdwallet-provider")
let secrets = require('./secret.js');
const MNEMONIC = secrets.MNEMONIC;
const infuraKey = secrets.infuraKey;
// let secrets = require('./secret.js');
// const WalletProvider = require("truffle-wallet-provider");
// const Wallet = require('ethereumjs-wallet');

// //Ropsten Testnet
// let ropstenPrivateKey = new Buffer(secrets.ropstenPK, "hex");
// let ropstenWallet = Wallet.fromPrivateKey(ropstenPrivateKey);
// let ropstenProvider = new WalletProvider(ropstenWallet, "https://ropsten.infura.io/");

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  
  contracts_build_directory: path.join(__dirname, "client/src/contracts"),

  networks:{
    development:{
      host: "127.0.0.1",
      port: "8545",
      network_id:"*"
    },
    ropsten: {
      provider: function() {
        return new HDWalletProvider(MNEMONIC,("https://ropsten.infura.io/"+infuraKey))
      },
      network_id: 3,
      gas: 4000000
    }
    // ropsten: { 
    //   provider: ropstenProvider,
    //   network_id: "3", gas: 4465030
    // }
  }
};
