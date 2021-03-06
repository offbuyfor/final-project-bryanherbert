pragma solidity ^0.5.0;

import "../contracts/StructLib.sol";
import "../contracts/Misc.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

library PayFeeLib {
    //Modifiers
    modifier verifyInvestmentStatus(StructLib.Data storage self, uint _fundNum){
        //check that msg.sender is an investor
        require(
            self.list[_fundNum].investors[msg.sender] == true,
            "Message Sender is not an investor"
        );
        _;
    }

    modifier checkFeePayment(StructLib.Data storage self, uint _fundNum, uint _timePeriod) {
        //uint virtualBalance = self.list[_name].virtualBalances[msg.sender];
        //uint fees = self.list[_name].fees[msg.sender];
        //Get investor's virtual balance and fees deposited
        //(,virtualBalance,fees) = getFundDetails2(_name, msg.sender);
        //uint payment = (self.list[_name].virtualBalances[msg.sender]/checkFeeRate(self, _name))/_timePeriod;
        require(
            //Check that msg.sender has enough in fees to make payment installment
            self.list[_fundNum].fees[msg.sender] > SafeMath.div(SafeMath.div(self.list[_fundNum].virtualBalances[msg.sender], Misc.checkFeeRate(self, _fundNum)),_timePeriod),
            "Fee balance is insufficient to make payment or payment cycle is not complete"
        );
        _;
    }

    modifier cycleComplete(StructLib.Data storage self, uint _fundNum){
        //uint paymentCycleStart = self.list[_name].paymentCycleStart[msg.sender];
        //uint paymentCycle = self.list[_name].paymentCycle;
        require(
            now >= SafeMath.add(self.list[_fundNum].paymentCycleStart[msg.sender], SafeMath.mul(self.list[_fundNum].paymentCycle, 1 days)),
            "Cycle is not complete, no fee due"
        );
        _;
    }

    function checkFee(StructLib.Data storage self, uint _fundNum, uint _timePeriod)
    public view
    verifyInvestmentStatus(self, _fundNum)
    returns (uint, bool)
    {
        uint payment = SafeMath.div(SafeMath.div(self.list[_fundNum].virtualBalances[msg.sender],Misc.checkFeeRate(self, _fundNum)),_timePeriod);
        bool paymentDue = (now >= SafeMath.add(self.list[_fundNum].paymentCycleStart[msg.sender], SafeMath.mul(self.list[_fundNum].paymentCycle, 1 days)));
        return (payment, paymentDue);
    }


    function payFee(StructLib.Data storage self, uint _fundNum, uint _timePeriod) 
    public
    verifyInvestmentStatus(self, _fundNum)
    checkFeePayment(self, _fundNum, _timePeriod)
    cycleComplete(self, _fundNum)
    {
        //Calculate payment
        uint payment = SafeMath.div(SafeMath.div(self.list[_fundNum].virtualBalances[msg.sender],Misc.checkFeeRate(self, _fundNum)),_timePeriod);
        //uint payment = (self.list[_name].virtualBalances[msg.sender]/Misc.checkFeeRate(self, _name))/_timePeriod;
        //Owner fees account
        //address fundOwner = self.list[_name].fundOwner;
        //Subtract payment from investor fees
        self.list[_fundNum].fees[msg.sender] -= payment;
        self.list[_fundNum].fees[self.list[_fundNum].fundOwner] += payment;
        self.list[_fundNum].paymentCycleStart[msg.sender] = now;
    }
}