pragma solidity ^0.5.0;

import "../contracts/StructLib.sol";

library InitLib {
    
    //Modifiers
    //Make sure there are no funds with the same name
    modifier noDupName(StructLib.Data storage self, uint _fundCount, bytes32 _name) {
        for(uint i = _fundCount; i > 0; i--){
            require(
                //no duplicate names in any contract
                self.list[_fundCount].name != _name,
                "Fund already exists with that name, please try another"
            );
        }
        _;
    }

    function addHash(StructLib.Data storage self, bytes32 ipfsHash, uint8 hash_function, uint8 size, uint _fundCount)
    internal
    {
        self.list[_fundCount].investHash.ipfsHash = ipfsHash;
        self.list[_fundCount].investHash.hash_function = hash_function;
        self.list[_fundCount].investHash.size = size;

    }
    
    function initializeFund(
        StructLib.Data storage self, 
        uint _fundCount, 
        bytes32 _name, 
        address _fundOwner, 
        uint _investment, 
        uint _feeRate, 
        uint _paymentCycle,
        bytes32 ipfsHash,
        uint8 hash_function,
        uint8 size) 
    public
    noDupName(self, _fundCount, _name)
    {
        //Make sure that Message Sender is the same as the declared fund Owner
        require(
            _fundOwner == msg.sender,
            "Message Sender has not listed themselves as fund owner"
        );
        uint count = _fundCount + 1;
        //initialize fund num to fundCount
        self.list[count].fundNum = count;
        //initialize strat name to _name
        self.list[count].name = _name;
        //Fund owner is message sender
        self.list[count].fundOwner = _fundOwner;
        //Initial funds are the msg.value
        self.list[count].totalCapital = _investment;
        //Set fee rate
        self.list[count].feeRate = _feeRate;
        //Set payment cycle
        self.list[count].paymentCycle = _paymentCycle;
        //set fundOwner to also be an investor
        self.list[count].investors[_fundOwner] = true;
        //set fundOwner's investor balance to the msg.value
        self.list[count].virtualBalances[_fundOwner] = _investment;
        //set fundOwner's fees to zero
        self.list[count].fees[_fundOwner] = 0;
        //set fundraising to 1
        self.list[count].fundraising = true;
        //set closed to 0
        self.list[count].closed = false;
        addHash(self, ipfsHash, hash_function, size, count);
    }
}