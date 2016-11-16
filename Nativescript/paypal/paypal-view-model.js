/**
 * Created by antonio on 10/31/16.
 */
"use strict";
var config = require("../../shared/config");
var fetchModule = require("fetch");
var Observable = require("data/observable").Observable;



function PayPal(info) {
    var viewModel = new Observable();
    
    viewModel.init= function(){
        paypal.configure({//Config test
            'mode': 'sandbox', //sandbox or live
            'client_id': '',
            'client_secret': '',
            'headers' : {
                'custom': 'header'
            }
        });
    }
    
    viewModel.create_payment_cc = function(payer,transactions){
        var create_payment_json = {
            "intent": "sale",
            "payer": payer,
            "transactions": transactions //Array
        };
    
        paypal.payment.create(create_payment_json, function (error, payment) {
            if (error) {
                console.log("Error Creating Payment with cc: " + error);
                throw error;
            } else {
                console.log("Create Payment Response");
                console.log(payment);
            }
        });
    }
    
    viewModel.create_payment_stored_cc = function(cc_token,transactions){
        var savedCard = {
            "intent": "sale",
            "payer": {
                "payment_method": "credit_card",
                "funding_instruments": [{
                    "credit_card_token": {
                        "credit_card_id": cc_token
                    }
                }]
            },
            "transactions": transactions
        };
        paypal.payment.create(savedCard, function (error, payment) {
            if (error) {
                console.log("Error Creating Payment with stored cc_token: " + error);
                throw error;
            } else {
                console.log("Pay with stored card Response");
                console.log(JSON.stringify(payment));
            }
        
        });
    }
    
    
    
    
}
module.exports = PayPal;
