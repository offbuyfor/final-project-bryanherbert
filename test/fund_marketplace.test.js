const FundMarketplace = artifacts.require("./FundMarketplace.sol");

contract('FundMarketplace', function(accounts) {
    const owner = accounts[0]
    const manager = accounts[1]
    const investor = accounts[2]

    var fundName
    var fundNum
    const name = "alpha"
    //Read results from getFundDetails
    var result
    var result2

    function hex2string(hexx) {
        var hex = hexx.toString(16);
        var str = '';
        for (var i = 0; (i < hex.length && hex.substr(i,2) !== '00'); i += 2)
            str += String.fromCharCode(parseInt(hex.substr(i,2), 16));
        //Get rid of null characters
        str = str.replace('\0', '')
        return str;
    }

    // function compareStrings(string_1, string_2) {
    //     for (var c=0; c<string_1.length; c++) {
    //         if (string_1.charCodeAt(c) != string_2.charCodeAt(c)){
    //             console.log('c:'+c+' '+string_1.charCodeAt(c)+'!='+string_2.charCodeAt(c));
    //         }
    //     }
    // }

    //Price equals 1 ether
    //const price = web3.toWei(1, "ether")

    it("should initialize a fund on the marketplace", async() => {
        const fundMarketplace = await FundMarketplace.deployed()

        //Manager's Balance to measure Gas Costs
        var managerBalanceBefore = await web3.eth.getBalance(manager)
        console.log("Manager Balance Before: "+managerBalanceBefore);
        //managerBalanceBefore = managerBalanceBefore.toNumber()

        var eventEmitted = false
        //constants for comparison here
        let amount = 1;
        const initialFund = web3.utils.toWei(amount.toString(), "ether")
        const feeRate = 2
        const paymentCycle = 0
        //Transaction from Manager account
        const tx = await fundMarketplace.initializeFund(name, manager, initialFund, feeRate, paymentCycle, {from: manager})
        if (tx.logs[0].event === "FundCreated") {
            fundNum = tx.logs[0].args.fundNum
            fundName = tx.logs[0].args.name
            managerAddr = tx.logs[0].args.fundOwner
            eventEmitted = true;
        }

        //Manager Account Balance Afterwards
        var managerBalanceAfter = await web3.eth.getBalance(manager)
        console.log("Manager Balance After: "+managerBalanceAfter);
        //managerBalanceAfter = managerBalanceAfter.toNumber()
        //Test for Gas Costs
        assert.isBelow(managerBalanceAfter, managerBalanceBefore, "Manager's Account should be decreased by gas costs")

        //Event Testing
        fundName = hex2string(fundName);
        //Confirm fundName is accurately broadcast in event
        assert.equal(fundName, name, "Fund Name does not match test name")
        //Confirm fundCount is accurately broadcast in event
        assert.equal(fundNum, 1, "Fund Number does not match test")
        //Confirm manager address is accurately broadcast in event
        assert.equal(managerAddr, manager, "Manager is not listed as owner in event")
        assert.equal(eventEmitted, true, 'Initiating a fund should emit an event')

        //Retrieve Fund Details
        result = await fundMarketplace.getFundDetails.call(fundNum)
        result2 = await fundMarketplace.getFundDetails2.call(fundNum, manager)
        result3 = await fundMarketplace.checkFundStatus.call(fundNum)

        //Result Testing
        //Want to be able to remove hex2string- JavaScript converting string to hex at some point in process
        assert.equal(hex2string(result[0]), name, "Fund name from getter function does not match test name")
        assert.equal(result[1], manager, "Manager is not owner of Fund");
        assert.equal(result[2], initialFund, "total capital in fund do not match test amount");
        assert.equal(result[3], 0, "Deployed Capital is not equal to zero");
        assert.equal(result[4], feeRate, "Fee Rate does not match test rate");
        assert.equal(result[5], paymentCycle, "Payment Cycle does not match test cycle");
        assert.equal(result2[0], true, "Manager is not listed as investor");
        assert.equal(result2[1], initialFund, "Manager's funds are not listed");
        assert.equal(result2[2], 0, "Manager's fees deposited are not zero");
        //New Tests for Investor list
        assert.equal(result3[2][0], manager, "Manager is not listed as investor");

    })

    it("should allow an investor to deposit capital into a fund", async() => {
        const fundMarketplace = await FundMarketplace.deployed()

        //Set event emitted to be false
        var eventEmitted = false

        //Investor's Balance
        var investorBalanceBefore = await web3.eth.getBalance(investor).toNumber()

        //local variables
        var investment = web3.toWei(2, "ether")
        const initialFund = web3.toWei(1, "ether")

        //Pre-transaction testing
        result = await fundMarketplace.getFundDetails.call(fundNum)
        result2 = await fundMarketplace.getFundDetails2.call(fundNum, investor)
        //Tests
        assert.equal(result[2], initialFund, "Initial total capital does not match initial balance")
        assert.equal(result2[0], false, "Account is incorrectly listed as investor")
        assert.equal(result2[1], 0, "Investor's virtual balance is not zero")
        assert.equal(result2[2], 0, "Investor's fees are not zero")

        //Calculate Fee
        var feeRate = await fundMarketplace.checkFeeRate.call(fundNum)
        var fee = (investment/feeRate)+1;

        //Make Investment
        const tx = await fundMarketplace.Invest(fundNum, investment, {from: investor, value: fee})
        //Check for Event
        if (tx.logs[0].event === "Investment"){
            //fundNum, investor, investment
            fundNum = tx.logs[0].args.fundNum
            investorAddr = tx.logs[0].args.investor
            newInvestment = tx.logs[0].args.investment
            eventEmitted = true;
        }

        //Event Testing
        //Confirm fundNum is accurately broadcast in event
        assert.equal(fundNum, 1, "Fund Number does not match test number")
        //Confirm fundCount is accurately broadcast in event
        assert.equal(investorAddr, investor, "Fund Count does not match test")
        //Confirm manager address is accurately broadcast in event
        assert.equal(newInvestment, investment, "Manager is not listed as owner in event")
        assert.equal(eventEmitted, true, 'Initiating a fund should emit an event')

        //Investor's Balance
        var investorBalanceAfter = await web3.eth.getBalance(investor).toNumber()
        //Account Balance Testing
        assert.isBelow(investorBalanceAfter, investorBalanceBefore-fee, "Investor's Balance should be less than the initial balance minus the fee, due to gas costs")

        //Post-transaction testing
        result = await fundMarketplace.getFundDetails.call(fundNum)
        result2 = await fundMarketplace.getFundDetails2.call(fundNum, investor)
        //Tests
        assert.equal(result[2].toNumber(), web3.toWei(3, "ether"), "Total Capital does not match sum of initial fund and new investment")
        assert.equal(result2[0], true, "Account is not listed as investor")
        assert.equal(result2[1], investment, "Investor's virtual balance does not match investment")
        assert.equal(result2[2], fee, "Investor's fees were not valid")

    })

    it("should allow a fund manager to place and an investor to receive an order", async() => {
        //Deployed fundMarketplace
        const fundMarketplace = await FundMarketplace.deployed()

        //Set event emitted to be false
        var eventEmitted = false

        //Account Balances
        var managerBalanceBefore = await web3.eth.getBalance(manager).toNumber()
        var investorBalanceBefore = await web3.eth.getBalance(investor).toNumber()

        //local variables
        const action = "buy"
        const ticker = "PLNT"
        const qty = 3
        const price = web3.toWei(100, "szabo") //0.0001 ether

        //Pre-transaction Testing
        result = await fundMarketplace.getFundDetails.call(fundNum)
        //Make sure Capital Deployed is 0
        assert.equal(result[3], 0, "capital deployed is not zero")

        //Define event that investor watches
        //Only watch for events filtered by fund
        let event = fundMarketplace.OrderPlaced({fundNum: fundNum})

        //Place Order
        const tx = await fundMarketplace.placeOrder(fundNum, action, ticker, qty, price, {from: manager})
        //Check for Event
        if(tx.logs[0].event === "OrderPlaced"){
            //name, action, ticker, qty, price
            fundNum = tx.logs[0].args.fundNum
            fundAction = tx.logs[0].args.action
            fundTicker = tx.logs[0].args.ticker
            fundQty = tx.logs[0].args.qty
            fundPrice = tx.logs[0].args.price            
            eventEmitted = true
        }

        //How does the investor receive the event information - check contracts documentation

        //Event Testing- verify investor can receive information
        fundAction = hex2string(fundAction)
        fundTicker = hex2string(fundTicker)
        fundQty = fundQty.toNumber()
        assert.equal(fundNum, 1, "Fund number does not match test number")
        assert.equal(fundAction, action, "fund action does not match test action")
        assert.equal(fundTicker, ticker, "fund ticker does not match test ticker")
        assert.equal(fundQty, qty, "fund quantity does not match test quantity")
        assert.equal(fundPrice, price, "fund price does not match test price")
        assert.equal(eventEmitted, true, "Placing an Order should emit an event")

        //Investor account reads event information
        event.watch(async function(error, result) {
            if(!error){
                //What should the error be, if any
                //console.log(result)
                let eventNum = await result.args.fundNum.toNumber()
                let eventQty = await result.args.qty.toNumber()
                // console.log("Event Name: "+eventName)
                // console.log("Event Quantity: "+eventQty)
                //Code works, but takes time into next test to work, try to make sure this executes before this specific test finishes
                let outcome =  await fundMarketplace.calcQty.call(eventNum, eventQty, {from: investor})
                outcome = await outcome.toNumber()
                assert.equal(outcome, 2, "Quantity in order is not proportional to investor's share of capital in the fund")
                // outcome.then(function (result){
                //         //Can change test value to 2, when the code is working
                //         assert.equal(result.toNumber(), 3, "Quantity in order is not proportional to investor's share of capital in the fund")
                //     }, function (error){
                //         console.error("Something went wrong", error)
                //     }
                // )
            } else {
                console.log(error)
            }
            event.stopWatching()
        })

        //Account Balance Testing
        var managerBalanceAfter = await web3.eth.getBalance(manager).toNumber()
        var investorBalanceAfter = await web3.eth.getBalance(investor).toNumber()
        assert.isBelow(managerBalanceAfter, managerBalanceBefore, "Manager's Balance should be less than the initial balance due to gas costs")
        assert.equal(investorBalanceAfter, investorBalanceBefore, "Investor's Balance should not change")

        //Post-transaction Testing
        result = await fundMarketplace.getFundDetails.call(fundNum)
        //Make sure Capital Deployed is equal to cost of trade (price * quantity)
        assert.equal(result[3], web3.toWei(300, "szabo"), "capital was not successfully deployed")
    })

    it("should allow investors to pay fees", async() => {
        //Deployed fundMarketplace
        const fundMarketplace = await FundMarketplace.deployed()

        //Set event emitted to be false
        var eventEmitted = false

        //Account Balances
        var managerBalanceBefore = await web3.eth.getBalance(manager).toNumber()
        var investorBalanceBefore = await web3.eth.getBalance(investor).toNumber()

        //local variables
        const _timePeriod = 12
        const investment = web3.toWei(2, "ether")
        const feeRate = await fundMarketplace.checkFeeRate.call(fundNum)
        const fee = (investment/feeRate)+1;

        //Pre-transaction testing
        resultMan = await fundMarketplace.getFundDetails2.call(fundNum, manager)
        resultInv = await fundMarketplace.getFundDetails2.call(fundNum, investor)
        assert.equal(resultMan[2], 0, "Manager's fees received were not zero")
        assert.equal(resultInv[2], fee, "Investor's fees are not valid")

        //Calculate actual payment
        const payment = Math.floor((resultInv[1]/feeRate)/_timePeriod)

        //Pay Fee
        const tx = await fundMarketplace.payFee(fundNum, _timePeriod, {from: investor})
        //Check for Event
        if(tx.logs[0].event === "FeesPaid"){
            //fundNum, investor, fee
            fundNum = tx.logs[0].args.fundNum
            payingInvestor = tx.logs[0].args.investor
            feePaid = tx.logs[0].args.fee         
            eventEmitted = true
        }

        //Event Testing
        feePaid = feePaid.toNumber()
        assert.equal(fundNum, 1, "Fund number does not match test number")
        assert.equal(payingInvestor, investor, "Investor does not match fee paying investor")
        assert.equal(feePaid, payment, "Fees paid does not match test payment")
        assert.equal(eventEmitted, true, "Paying Fees should emit an event")

        //Account Balance Testing
        var managerBalanceAfter = await web3.eth.getBalance(manager).toNumber()
        var investorBalanceAfter = await web3.eth.getBalance(investor).toNumber()
        assert.equal(managerBalanceAfter, managerBalanceBefore, "Manager's Balance should not change")
        assert.isBelow(investorBalanceAfter, investorBalanceBefore, "Investor's Balance should be less than the initial balance due to gas costs")
    
        //Post-transaction testing
        resultMan = await fundMarketplace.getFundDetails2.call(fundNum, manager)
        resultInv = await fundMarketplace.getFundDetails2.call(fundNum, investor)
        assert.equal(resultMan[2].toNumber(), Math.floor(fee/_timePeriod), "Manager did not receive fee")
        assert.equal(resultInv[2].toNumber(), Math.floor(fee-fee/_timePeriod), "Investor did not pay fee")   
    })

    it("should allow mangers to collect fees", async() => {
        //get instance of deployed contract
        //Deployed fundMarketplace
        const fundMarketplace = await FundMarketplace.deployed()

        //Set event emitted to be false
        var eventEmitted = false

        //Account testing
        var managerBalanceBefore = await web3.eth.getBalance(manager).toNumber()

        //local variables
        const _result = await fundMarketplace.getFundDetails2.call(fundNum, investor)
        const _investment = _result[1].toNumber()
        const feeRate = await fundMarketplace.checkFeeRate.call(fundNum)
        const _timePeriod = 12
        const payment = Math.floor(((_investment/feeRate)+1)/_timePeriod)

        //Collect Fees
        const tx = await fundMarketplace.collectFees(fundNum, {from: manager})
        if(tx.logs[0].event == "FeesCollected"){
            //fundNum, fee
            fundNum = tx.logs[0].args.fundNum
            feesCollected = tx.logs[0].args.fee
            eventEmitted = true
        }

        //Event Testing
        feesCollected = feesCollected.toNumber()
        assert.equal(fundNum, 1, "Fund number does not match test number")
        assert.equal(feesCollected, payment, "Fees Collected does not match Fees Owed")
        assert.equal(eventEmitted, true, "Collecting Fees should emit an event")

        //Account Balance + Post-transaction Testing
        var managerBalanceAfter = await web3.eth.getBalance(manager).toNumber()
        assert.isBelow(managerBalanceAfter, managerBalanceBefore + feesCollected, "Manager account post-balance is incorrect")
    })

    it("should allow an investor to withdraw funds", async() => {
        //Deployed FundMarketplace
        const fundMarketplace = await FundMarketplace.deployed()

        //Set event emitted to be false
        var eventEmitted = false

        //Accounts
        var investorBalanceBefore = await web3.eth.getBalance(investor).toNumber()
        
        //local variables
        var _result = await fundMarketplace.getFundDetails2(fundNum, investor)
        var _balance = _result[1].toNumber()
        var _fees = _result[2].toNumber()
        var _amount = web3.toWei(1, "ether")

        //withdraw partial amount of funds
        const tx1 = await fundMarketplace.withdrawFunds(fundNum, _amount, {from: investor})

        if(tx1.logs[0].event === "FundsWithdrawn"){
            //fundNum, investor, investment, fees
            fundNum = tx1.logs[0].args.fundNum
            withdrawnInvestor = tx1.logs[0].args.investor
            withdrawnCapital = tx1.logs[0].args.investment
            withdrawnFees = tx1.logs[0].args.fees
            eventEmitted = true;
        }

        //Event Testing
        withdrawnCapital = withdrawnCapital.toNumber()
        withdrawnFees = withdrawnFees.toNumber()
        assert.equal(fundNum, 1, "Fund number does not match test number")
        assert.equal(withdrawnInvestor, investor, "Withdrawn investor is not correctly listed")
        assert.equal(withdrawnCapital, _amount, "Balance was not correctly withdrawn")
        assert.equal(withdrawnFees, 0, "Fees were not correctly withdrawn")
        assert.equal(eventEmitted, true, "Withdrawing fees should emit an event")

        //Account Testing
        var investorBalanceMiddle = await web3.eth.getBalance(investor).toNumber()
        //Not sure why equal in .sol file - might be which contract is paying gas costs - investigate more
        assert.isBelow(investorBalanceMiddle, investorBalanceBefore, "Investor middle balance should be equal to original balance")

        //Post-Transaction Testing
        //General fund details
        let resultFund = await fundMarketplace.getFundDetails(fundNum)
        //Fund Details for Investor
        let resultInv = await fundMarketplace.getFundDetails2(fundNum, investor)
        //fund Detials for Manager
        let resultMan = await fundMarketplace.getFundDetails2(fundNum, manager)
        assert.equal(resultFund[2].toNumber(), resultMan[1].toNumber() + resultInv[1].toNumber(), "Total Capital should be equal to sum of virtual balances")
        assert.equal(resultInv[0], true, "Investor should still be listed as an investor")
        assert.equal(resultInv[1].toNumber(), _balance - _amount, "Investor's virtual balance should be the initial balance - the amount withdrawn")
        assert.equal(resultInv[2].toNumber(), _fees, "Investor's fees should not change")

        //Withdraw Remainder of Funds
        _result = await fundMarketplace.getFundDetails2(fundNum, investor)
        //Update balance
        _balance = _result[1].toNumber()
        //Update fees- not necessary right now for current functionality
        _fees = _result[2].toNumber()
        //Set eventEmitted to false
        eventEmitted = false

        const tx2 = await fundMarketplace.withdrawFunds(fundNum, _amount, {from: investor})

        if(tx2.logs[0].event === "FundsWithdrawn"){
            //name, investor, investment, fees
            fundNum = tx2.logs[0].args.fundNum
            withdrawnInvestor = tx2.logs[0].args.investor
            withdrawnCapital = tx2.logs[0].args.investment
            withdrawnFees = tx2.logs[0].args.fees
            eventEmitted = true;
        }

        //Event Testing
        withdrawnCapital = withdrawnCapital.toNumber()
        withdrawnFees = withdrawnFees.toNumber()
        assert.equal(fundNum, 1, "Fund number does not match test number")
        assert.equal(withdrawnInvestor, investor, "Withdrawn investor is not correctly listed")
        assert.equal(withdrawnCapital, _amount, "Balance was not correctly withdrawn")
        assert.equal(withdrawnFees, _fees, "Fees were not correctly withdrawn")
        assert.equal(eventEmitted, true, "Withdrawing fees should emit an event")

        //Account Testing
        var investorBalanceAfter = await web3.eth.getBalance(investor).toNumber()
        assert.isBelow(investorBalanceAfter, investorBalanceBefore + withdrawnFees, "Investor post-balance should be slightly less than pre-balance + feesWithdrawn due to gas costs")

        //Post-transaction Testing
        //General fund details
        resultFund = await fundMarketplace.getFundDetails(fundNum)
        //Fund Details for Investor
        resultInv = await fundMarketplace.getFundDetails2(fundNum, investor)
        //fund Detials for Manager
        resultMan = await fundMarketplace.getFundDetails2(fundNum, manager)
        assert.equal(resultFund[2].toNumber(), resultMan[1].toNumber() + resultInv[1].toNumber(), "Total Capital should be equal to manager's capital contribution")
        assert.equal(resultInv[0], false, "Investor is incorrectly listed as active in fund")
        assert.equal(resultInv[1].toNumber(), 0, "Investor's virutal balance is not zeroed out")
        assert.equal(resultInv[2].toNumber(), 0, "Investor's fees are not zeroed out")
    })

    it("should allow a manager to close a fund", async() => {
        //Deployed FundMarketplace
        const fundMarketplace = await FundMarketplace.deployed()

        //Set event emitted to be false
        var eventEmitted = false

        //Accounts
        var investorBalanceBefore = await web3.eth.getBalance(investor).toNumber()
        
        //local variables
        var _result = await fundMarketplace.getFundDetails(fundNum)
        var _name = hex2string(_result[0])

        //Pre-Transaction Testing
        assert.equal(_name, name, "Fund Details are wrong");

        //Close Funds
        const tx = await fundMarketplace.closeFund(fundNum, {from: manager})

        if(tx.logs[0].event === "FundClosed"){
            //fundNum, investor, investment, fees
            eventFundNum = tx.logs[0].args.fundNum
            eventManager = tx.logs[0].args.manager
            eventEmitted = true;
        }

        //Event Testing
        assert.equal(eventFundNum, 1, "Wrong Fund was Cancelled");
        assert.equal(eventManager, manager, "Improper account cancellled fund")
        assert.equal(eventEmitted, true, "Withdrawing fees should emit an event")

        //local variables
        var _result = await fundMarketplace.getFundDetails(fundNum)
        var _name = hex2string(_result[0])

        //Post-Transaction Testing
        assert.equal(_name, 0, "Fund was not deleted");

    })

    it("should allow an admin to initiate a circuit breaker", async() => {
        //Deployed FundMarketplace
        const fundMarketplace = await FundMarketplace.deployed()

        //Initial variables
        let stopped = await fundMarketplace.stopped()

        //Pre-testing
        assert.equal(stopped,false,"Fund should be initialized with stopped equal to false")

        //Close Funds
        const tx = await fundMarketplace.setStopped( {from: owner} )

        //Update variables
        stopped = await fundMarketplace.stopped()
        //Post-Testing
        assert.equal(stopped,true,"Fund should be initialized with stopped equal to false")

    })
});