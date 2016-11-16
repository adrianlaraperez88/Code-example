var config = require("../../shared/config");
var fetchModule = require("fetch");
var Observable = require("data/observable").Observable;
var validator = require("email-validator");

function ShoppingCart(info) {
    info = info || {};

    var viewModel = new Observable({
        project_id: info.project_id || "",
        quantity: info.quantity || ""
    });
    viewModel.productList = function(user) {
        return fetch(config.apiUrl + "shoppingcart/user/"+user+"/products?api_token=" + config.user.api_token).then(response => { return response.json(); }).then(function(r) {
            return r;
            // Argument (r) is JSON object!
        }, function(e) {
            console.log("error:" + e);
            throw Error(e);
        });
    }

    viewModel.emptyCart = function(user) {
        return fetch(config.apiUrl+"shoppingcart/user/"+user+"/emptycart?api_token="+ config.user.api_token, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            }).then(r => { return r.json(); }).then(function (r) {
            return r;
        }, function (e) {
            console.log("error emptying the cart:" + e);
            throw Error(e);
        });
    };

    viewModel.removeItem = function(user,line_id) {
        return fetch(config.apiUrl+"shoppingcart/user/"+user+"/remove/product/"+line_id+"?api_token="+ config.user.api_token, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            }).then(r => { return r.json(); }).then(function (r) {
            return r;
        }, function (e) {
            console.log("error removing item:" + e);
            throw Error(e);
        });
    };

    viewModel.addToCart = function(action){
       return fetch(config.apiUrl+"shoppingcart/addproduct?api_token="+ config.user.api_token, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user: config.user.id,
                project: viewModel.get("project_id"),
                quantity:viewModel.get("quantity"),
                action :action
            })
        }).then(r => { return r.json(); }).then(function (r) {
            return r;
        }, function (e) {
            console.log("error adding item to the cart:" + e);
            throw Error(e);
        });
    }

    return viewModel;
}


module.exports = ShoppingCart;