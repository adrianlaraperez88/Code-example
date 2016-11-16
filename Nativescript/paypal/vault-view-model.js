var config = require("../../shared/config");
var fetchModule = require("fetch");
var Observable = require("data/observable").Observable;

function Vault(info) {
    
    info = info || {};
    
    var viewModel = new Observable({
        type:           info.type || "",
        number:         info.number || "",
        expire_month:   info.expire_month || "",
        expire_year:    info.expire_year || "",
        cvv2:           info.cvv2 || "",
        /*first_name:     info.first_name || "",
        last_name:      info.last_name || "",*/
        country_code:   info.country_code || "",
       /* state:          info.state || "",
        city:           info.city || "",
        line1:          info.line1 || "",*/
        postal_code:    info.postal_code || "",
    });
    
    
    viewModel.store_cc = function(user_id){
      console.log("entro al modelo");
        return fetchModule.fetch(config.apiUrl + "vault/user/"+user_id+"/create/card?api_token=" + config.guestApiToken, {
            method: "POST",
            body: JSON.stringify({
                type:           viewModel.get("type"),
                number:         viewModel.get("number"),
                expire_month:   viewModel.get("expire_month"),
                expire_year:    viewModel.get("expire_year"),
                cvv2:           viewModel.get("cvv2"),
                country_code:   viewModel.get("country_code"),
                postal_code:    viewModel.get("postal_code"),
                /*first_name:     viewModel.get("first_name"),
                last_name:      viewModel.get("last_name"),
                address:        viewModel.get("address"),*/
            }),
            headers: {
                "Content-Type": "application/json"
            }
        })
            .then(function (response) {
                if (!response.ok) {
                    console.log(response._bodyText);
                    throw Error(response._bodyText);
                }
                return response;
            })
            .then(function (response) {
                return response.json();
            })
            .then(function (result) {
                return result;
            });
    };
    /*
    *This function return a list of cards of the given user and the list of states of US
    * for not create another controller for
    * */
    viewModel.list_cc = function(user_id){
        return fetch(config.apiUrl + "vault/local/list/user/"+user_id+"/cards?api_token=" + config.user.api_token).then(response => { return response.json(); }).then(function(r) {
            return r;
            // Argument (r) is JSON object!
        }, function(e) {
            console.log("error listing local credit cards:" + e);
            throw Error(e);
        });
    }
    
    viewModel.getCardDetailsFromPaypal = function(user_id, card_id){
        return fetch(config.apiUrl+"vault/user/"+user_id+"/card/"+card_id+"/details?api_token=" + config.user.api_token+"&page="+page)
                .then(response => { return response.json(); }).then(function (r) {
            //console.log("retorno del modelo"+JSON.stringify(r));
            return r;
            // Argument (r) is JSON object!
        }, function (e) {
            console.log("error geting a card from paypal:"+e);
            throw Error(e);
        });
    };
    
    viewModel.getLocalCardDetails = function(user_id, card_id){
        return fetch(config.apiUrl+"vault/local/user/"+user_id+"/card/"+card_id+"/details?api_token=" + config.user.api_token+"&page="+page)
                .then(response => { return response.json(); }).then(function (r) {
            //console.log("retorno del modelo"+JSON.stringify(r));
            return r;
            // Argument (r) is JSON object!
        }, function (e) {
            console.log("error geting a local card data:"+e);
            throw Error(e);
        });
    };
    
    viewModel.deleteCard = function(user_id,card_id){
        return fetch(config.apiUrl+"vault/user/"+user_id+"/card/"+card_id+"/delete?api_token="+ config.user.api_token, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            }).then(r => { return r.json(); }).then(function (r) {
            return r;
        }, function (e) {
            console.log("error removing card:" + e);
            throw Error(e);
        });
        
    }
    return viewModel;
}
module.exports = Vault;
