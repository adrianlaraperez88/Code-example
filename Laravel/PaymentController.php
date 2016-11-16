<?php

namespace App\Http\Controllers;

use App\Country;
use App\Helpers\Helper;
use App\Order;
use App\CreditCard as RCC;
use App\State;
use App\Status;
use App\Transaction as RoccoTransactions;
use App\Project;
use Illuminate\Http\Request;


use Netshell\Paypal\Facades\Paypal;
use PayPal\Api\Address;

use PayPal\Api\PayerInfo;
use PayPal\Api\RelatedResources;
use PayPal\Api\Sale;
use PayPal\Exception\PayPalConfigurationException;
use PayPal\Exception\PayPalConnectionException;
use Validator;
use App\User;

use PayPal\Api\Amount;
use PayPal\Api\CreditCardToken;
use PayPal\Api\CreditCard;
use PayPal\Api\Details;
use PayPal\Api\FundingInstrument;
use PayPal\Api\Item;
use PayPal\Api\ItemList;
use PayPal\Api\Payer;
use PayPal\Api\Payment;
use PayPal\Api\Transaction;
use PayPal\Api\RedirectUrls;



class PaymentController extends Controller
{
    private $_apiContext;

    public function __construct()
    {

        $this->_apiContext = PayPal::ApiContext(
            config('services.paypal.client_id'),
            config('services.paypal.secret'));

        $this->_apiContext->setConfig(array(
            'mode' => 'sandbox',
            'service.EndPoint' => 'https://api.sandbox.paypal.com',
            'http.ConnectionTimeOut' => 30,
            'log.LogEnabled' => true,
            'log.FileName' => storage_path('logs/paypal.log'),
            'log.LogLevel' => 'FINE'
        ));

    }
    /*********************************************************Payments********************************************/

    /*
     * Function to create a payment with sotred CC
     * */
    public function storedCreditCardPayment(Request $request,$user_id,$card_id)
    {
        try {
            $rcc = RCC::find($card_id);
            if (!($rcc instanceof RCC)) {
                $result['status'] = "failure";
                $result['message'] = "We don't have this card in our records, plese review in your payment profile.";
                return response()->json($result);
            }
            $user = User::find($user_id);
            if (!($user instanceof User)) {
                $result['status'] = "failure";
                $result['message'] = "We don't have this user in ur records.";
                return response()->json($result);
            }
            $creditCardToken = new CreditCardToken();
            $creditCardToken->setCreditCardId($rcc->localizator);

            $fi = new FundingInstrument();
            $fi->setCreditCardToken($creditCardToken);

            /*Payer information*/
            $payer = new Payer();
            $payer->setPaymentMethod("credit_card")
                ->setFundingInstruments(array($fi));

            $itemList = new ItemList();
            /*Find and add all items of the cart to the payment*/
            $ActiveOrder = User::find($user_id)->orders()->where('status_id', '1')->first();
            if ($ActiveOrder instanceof Order && $ActiveOrder->total > 0) {

                foreach ($ActiveOrder->orderLines as $line) {
                    $item = new Item();
                    $p = Project::where('id', $line->project_id)->first();
                    if (!($p instanceof Project)) {
                        $result['status'] = "failure";
                        $result['message'] = "One of the products in your cart is not vailable now. Please review your cart.";
                        return response()->json($result);
                    }
                    $item->setName($p->name)
                        ->setDescription($p->getDescripcion())
                        ->setCurrency('USD')
                        ->setQuantity($line->quantity)
                        ->setTax($line->tax)
                        ->setPrice($line->price);
                    $itemList->addItem($item);
                }


                /*Payment Details*/
                $details = new Details();
                $details->setShipping(0)
                    ->setTax(0)
                    ->setSubtotal($ActiveOrder->total);

                /*Payment Amount*/
                $amount = new Amount();
                $amount->setCurrency("USD")
                    ->setTotal($ActiveOrder->total)
                    ->setDetails($details);

                /*Payment Transaction*/
                $transaction = new Transaction();
                $transaction->setAmount($amount)
                    ->setItemList($itemList)
                    ->setDescription("Payment for order :" . $ActiveOrder->order_number)
                    ->setInvoiceNumber(uniqid());

                /*Payment*/
                $payment = new Payment();
                $payment->setIntent("sale")
                    ->setPayer($payer)
                    ->setTransactions(array($transaction));
                $payment->create($this->_apiContext);

                $payment_state = $payment->getState();
                $payment_id = $payment->getId();

                $Transaction = $payment->getTransactions()[0] instanceof Transaction ? $payment->getTransactions()[0] : null;
                $invoice_number = $Transaction ? $Transaction->invoice_number : null;
                $relatedResource = $Transaction->related_resources[0] instanceof RelatedResources ? $Transaction->related_resources[0] : null;
                $sale = $relatedResource->getSale() instanceof Sale ? $relatedResource->getSale() : null;
                $sale_id = $sale ? $sale->getId() : null;
                $sale_state = $sale ? $sale->getState() : null;

                if ($payment_state === "approved") {
                    $paidStatus = Status::where('name', 'Paid')->first();
                    if (!($paidStatus instanceof Status)) {
                        $result['status'] = "failure";
                        $result['message'] = "Status 'Paid' not exist in Database, please contact our support.";
                        return response()->json($result);
                    }
                    $ActiveOrder->status_id = 2;//Paid status
                }
                $transaction = new RoccoTransactions();
                $transaction->payment_id = $payment_id;
                $transaction->payment_status = $payment_state;
                $transaction->invoice_number = $invoice_number;
                $transaction->sale_id = $sale_id;
                $transaction->sale_state = $sale_state;
                $ActiveOrder->transactions()->save($transaction);
                $ActiveOrder->save();

                $result['status'] = "success";
                $result['data'] = $transaction;
                return $result;
            }
            $result['status'] = "failure";
            $result['message'] = "You don't have any product in your cart.";
            return response()->json($result);
        }catch (\Exception $e) {
            $exception['status'] = "failure";
            $exception['exception_type'] = get_class($e);
            $exception['code'] = $e->getCode();
            $exception['message'] = $e->getMessage();
            if ($e instanceof PayPalConnectionException || $e instanceof PayPalConfigurationException) {
                $exception['data'] = $e->getData();
            }
            $exception['file'] = $e->getFile();
            $exception['line'] = $e->getLine();
            return $exception;
            }

    }

    /*
     * Function to create payment against paypal platform
     * */
    public function creditCardPayment(Request $request, $user_id)
    {

        try {
            $data = $request->all();
            $validator = $this->validatorCC($data);
            if ($validator->fails()) {
                $result['status'] = "failure";
                $result['message'] = $validator->errors()->getMessages();
                return response()->json($result);
            }
            /*Create address for card*/
            $addr = new Address();
            $addr->setCountryCode($data["address"]["country_code"])
                ->setPostalCode($data["address"]["postal_code"])
                ->setState($data["address"]["state"])
                ->setCity($data["address"]["city"])
                ->setLine1($data["address"]["line1"]);

            $card = new CreditCard();
            $card->setType($data["type"])
                ->setNumber($data["number"])
                ->setExpireMonth($data["expire_month"])
                ->setExpireYear($data["expire_year"])
                ->setCvv2($data["cvv2"])
                ->setFirstName($data["first_name"])
                ->setLastName($data["last_name"])
                ->setBillingAddress($addr);



            /*Funding Instrument*/
            $fi = new FundingInstrument();
            $fi->setCreditCard($card);

            /*Payer information*/
            $payer = new Payer();
            $payer->setPaymentMethod("credit_card")
                ->setFundingInstruments(array($fi));

            $itemList = new ItemList();
            /*Find and add all items of the cart to the payment*/
            $ActiveOrder = User::find($user_id)->orders()->where('status_id', '1')->first();
            if ($ActiveOrder instanceof Order && $ActiveOrder->total > 0) {

                foreach ($ActiveOrder->orderLines as $line) {
                    $item = new Item();
                    $p = Project::where('id', $line->project_id)->first();
                    if (!($p instanceof Project)) {
                        $result['status'] = "failure";
                        $result['message'] = "One of the products in your cart is not vailable now. Please review your cart.";
                        return response()->json($result);
                    }
                    $item->setName($p->name)
                        ->setDescription($p->getDescripcion())
                        ->setCurrency('USD')
                        ->setQuantity($line->quantity)
                        ->setTax($line->tax)
                        ->setPrice($line->price);
                    $itemList->addItem($item);
                }


                /*Payment Details*/
                $details = new Details();
                $details->setShipping(0)
                    ->setTax(0)
                    ->setSubtotal($ActiveOrder->total);

                /*Payment Amount*/
                $amount = new Amount();
                $amount->setCurrency("USD")
                    ->setTotal($ActiveOrder->total)
                    ->setDetails($details);

                /*Payment Transaction*/
                $transaction = new Transaction();
                $transaction->setAmount($amount)
                    ->setItemList($itemList)
                    ->setDescription("Payment for order :" . $ActiveOrder->order_number)
                    ->setInvoiceNumber(uniqid());

                /*Payment*/
                $payment = new Payment();
                $payment->setIntent("sale")
                    ->setPayer($payer)
                    ->setTransactions(array($transaction));
                $payment->create($this->_apiContext);

                $payment_state = $payment->getState();
                $payment_id = $payment->getId();

                $Transaction = $payment->getTransactions()[0] instanceof Transaction ? $payment->getTransactions()[0] : null;
                $invoice_number = $Transaction ? $Transaction->invoice_number : null;
                $relatedResource = $Transaction->related_resources[0] instanceof RelatedResources ? $Transaction->related_resources[0] : null;
                $sale = $relatedResource->getSale() instanceof Sale ? $relatedResource->getSale() : null;
                $sale_id = $sale ? $sale->getId() : null;
                $sale_state = $sale ? $sale->getState() : null;

                if ($payment_state === "approved") {
                    $paidStatus = Status::where('name', 'Paid')->first();
                    if (!($paidStatus instanceof Status)) {
                        $result['status'] = "failure";
                        $result['message'] = "Status 'Paid' not exist in Database, please contact our support.";
                        return response()->json($result);
                    }
                    $ActiveOrder->status_id = 2;//Paid status
                }
                $transaction = new RoccoTransactions();
                $transaction->payment_id = $payment_id;
                $transaction->payment_status = $payment_state;
                $transaction->invoice_number = $invoice_number;
                $transaction->sale_id = $sale_id;
                $transaction->sale_state = $sale_state;
                $ActiveOrder->transactions()->save($transaction);
                $ActiveOrder->save();

                $result['status'] = "success";
                $result['data']=$transaction;
                return $result;
            }
            $result['status'] = "failure";
            $result['message'] = "You don't have any product in your cart.";
            return response()->json($result);

        } catch (\Exception $e) {
            $exception['status'] = "failure";
            $exception['exception_type'] = get_class($e);
            $exception['code'] = $e->getCode();
            $exception['message'] = $e->getMessage();
            if ($e instanceof PayPalConnectionException || $e instanceof PayPalConfigurationException) {
                $exception['data'] = $e->getData();
            }
            $exception['file'] = $e->getFile();
            $exception['line'] = $e->getLine();
            return $exception;
        }
    }


    /***********************************************Cards***************************************************/
    /*
     * Function that return a list of card of given user
     */
    public function getCardList( $user_id){
        try{
            $user = User::find($user_id);
            if(!($user instanceof  User)){
                $result['status'] = "failure";
                $result['message'] = "We don't have this user in our records, please call for support.";
                return response()->json($result);
            }
            $us = Country::where('code','US')->first();
            if(!($us instanceof  Country)){
                $result['status'] = "failure";
                $result['message'] = "The application settings are incorrect, we are trying to restablish. Please come back later.";
                return response()->json($result);
            }
            $result['status'] = "success";
            $result['message'] = "Cards listed successfully.";
            $result['data']['cards'] = $user->creditcards()->select("id","number","type","expire_month","expire_year","country_code","postal_code")->get();
            //$result['data']['states'] = array_column($us->states()->select('code')->get()->toArray(),"code");
            return response()->json($result);
        }catch(\Exception $e){
            $exception['status'] = "failure";
            $exception['exception_type'] = get_class($e);
            $exception['code'] = $e->getCode();
            $exception['message'] = $e->getMessage();
            $exception['file'] = $e->getFile();
            $exception['line'] = $e->getLine();
            return $exception;
        }
    }
    /*
     * Function to store card on paypal
     * */
    public function createCard(Request $request, $user_id)
    {
        try {
            $user = User::find($user_id);
            if (!($user instanceof User)) {
                $result['status'] = "failure";
                $result['message'] = "This user not exist in our records, please contact our support.";
                return response()->json($result);
            }
            $data = $request->all();
            //dd($data);
            $validator = $this->validatorCC($data);
            if ($validator->fails()) {
                $result['status'] = "failure";
                $result['message'] = $validator->errors()->getMessages();
                return response()->json($result);
            }

            $entity = RCC::where('expire_year', '=', $data["expire_year"])
                ->where('expire_month', '=', $data["expire_month"])
                ->where('type', '=', $data["type"])
                ->where('number', 'like', '%' . substr($data["number"], -4))
                ->first();

            if ($entity instanceof RCC) {
                $result['status'] = "failure";
                $result['message'] = "This card is already in our records.";
                return response()->json($result);
            }
            /*Create address for card*/
            /*$addr = new Address();
            $addr->setCountryCode($data["address"]["country_code"])
                ->setPostalCode($data["address"]["postal_code"])
                ->setState($data["address"]["state"])
                ->setCity($data["address"]["city"])
                ->setLine1($data["address"]["line1"]);*/
            /*Validation against paypal*/
            $card = new CreditCard();
            $card->setType($data["type"])
                ->setNumber($data["number"])
                ->setExpireMonth($data["expire_month"])
                ->setExpireYear($data["expire_year"])
                ->setCvv2($data["cvv2"])
                ->setFirstName($data["first_name"])
                ->setLastName($data["last_name"])
                ->setMerchantId(config('services.paypal.client_id'))
                ->setExternalCardId(uniqid())
                //->setBillingAddress($addr)
                ->setExternalCustomerId($user->email);
            $card->create($this->_apiContext);

            if ($card->getState() != "ok") {
                $result['status'] = "failure";
                $result['message'] = "We have an error saving your payment method, please try again.";
                return response()->json($result);
            }

            $entity = new RCC();
            $entity->fill($card->toArray());
            $entity->country_code=$data['country_code'];
            $entity->postal_code=$data['postal_code'];
            $entity->localizator = $card->id;
            $entity->user()->associate($user);
            $entity->save();
            $result['status'] = "success";
            $result['message'] = "Payment method registered successfully.";
            return response()->json($result);

        } catch (\Exception $e) {
            $exception['status'] = "failure";
            $exception['exception_type'] = get_class($e);
            $exception['code'] = $e->getCode();
            $exception['message'] = $e->getMessage();
            if ($e instanceof PayPalConnectionException || $e instanceof PayPalConfigurationException) {
                $exception['data'] = $e->getData();
            }
            $exception['file'] = $e->getFile();
            $exception['line'] = $e->getLine();

            return $exception;
        }
    }

    /*
     * Function to get card from paypal by $id
     * */
    public function getCardDetailsFromPaypal(Request $request, $user_id, $card_id)
    {
        try {
            $user = User::find($user_id);
            if (!($user instanceof User)) {
                $result['status'] = "failure";
                $result['message'] = "This user not exist in our records, please contact our support.";
                return response()->json($result);
            }
            $card = RCC::where([
                ['user_id', $user_id],
                ['id', $card_id]
            ])->first();
            if (!($card instanceof RCC)) {
                $result['status'] = "failure";
                $result['message'] = "You don't have this credit card associated with you, please call for support.";
                return response()->json($result);
            }
            $result['status'] = "success";
            $result['message'] = "Crad details listed successfully from PayPal.";
            $result['data'] =  CreditCard::get($card->localizator, $this->_apiContext)->toArray();
            return response()->json($result);
        } catch (\Exception $e) {
                $exception['status'] = "failure";
                $exception['exception_type'] = get_class($e);
                $exception['code'] = $e->getCode();
                $exception['message'] = $e->getMessage();
                if ($e instanceof PayPalConnectionException || $e instanceof PayPalConfigurationException) {
                    $exception['data'] = $e->getData();
                }
                $exception['file'] = $e->getFile();
                $exception['line'] = $e->getLine();

            return $exception;
        }

    }

    /*
     * Function that reuturn a local details of specific cards
     *
     * */
    public function getLocalCardDetails(Request $request, $user_id, $card_id)
    {
        try {
            $user = User::find($user_id);
            if (!($user instanceof User)) {
                $result['status'] = "failure";
                $result['message'] = "This user not exist in our records, please contact our support.";
                return response()->json($result);
            }
            $card = RCC::where([
                ['user_id', $user_id],
                ['id', $card_id]
            ])->first();
            if (!($card instanceof RCC)) {
                $result['status'] = "failure";
                $result['message'] = "You don't have this credit card associated with you, please call for support.";
                return response()->json($result);
            }
            $result['status'] = "success";
            $result['message'] = "Crad details listed successfully.";
            $result['data'] = $card;
            return response()->json($result);
        } catch (\Exception $e) {
            $exception['status'] = "failure";
            $exception['exception_type'] = get_class($e);
            $exception['code'] = $e->getCode();
            $exception['message'] = $e->getMessage();
            if ($e instanceof PayPalConnectionException || $e instanceof PayPalConfigurationException) {
                $exception['data'] = $e->getData();
            }
            $exception['file'] = $e->getFile();
            $exception['line'] = $e->getLine();

            return $exception;
        }

    }
    /*
     * Function to remove card previously stored on paypal by $id
     * Paypal currently return only true or false if card was deleted or not
     * */
    public function deleteCard(Request $request, $user_id, $card_id)
    {
        try {
            $user = User::find($user_id);
            if (!($user instanceof User)) {
                $result['status'] = "failure";
                $result['message'] = "This user not exist in our records, please contact our support.";
                return response()->json($result);
            }
            $card = RCC::where([
                ['user_id', $user_id],
                ['id', $card_id]
            ])->first();
            if (!($card instanceof RCC)) {
                $result['status'] = "failure";
                $result['message'] = "You don't have this credit card associated with you, please call for support.";
                return response()->json($result);
            }
            $vaultCard = CreditCard::get($card->localizator, $this->_apiContext);
            if ($vaultCard->delete($this->_apiContext)) {
                $card->delete();
                $result['status'] = "success";
                $result['message'] = "Your card was deleted successfully.";
                return response()->json($result);
            }
            $result['status'] = "failure";
            $result['message'] = "There was an error when we are trying to delete your card.";
            return response()->json($result);
        } catch (\Exception $e) {
            $exception['status'] = "failure";
            $exception['exception_type'] = get_class($e);
            $exception['code'] = $e->getCode();
            $exception['message'] = $e->getMessage();
            if ($e instanceof PayPalConnectionException || $e instanceof PayPalConfigurationException) {
                $exception['data'] = $e->getData();
            }
            $exception['file'] = $e->getFile();
            $exception['line'] = $e->getLine();

            return $exception;
        }
    }



    /**********************************************Sales******************************************************/
    /*
     * Function to retrieve get Sale Details by $saleId
     * */
    public function getSaleFromPaypal(Request $request, $transaction_id)
    {
        try{

            $trans = RoccoTransactions::find($transaction_id);
            if(!($trans instanceof RoccoTransactions)){
                $result['status'] = "failure";
                $result['message'] = "We don't have any transaction in our records that math with you selection. Please browse in your paypal account.";
                return response()->json($result);
            }
            $sale = Sale::get($trans->sale_id, $this->_apiContext);
            $result['status'] = "success";
            $result['data'] = $sale;
            return response()->json($result);
        }catch (\Exception $e) {
            $exception['status'] = "failure";
            $exception['exception_type'] = get_class($e);
            $exception['code'] = $e->getCode();
            $exception['message'] = $e->getMessage();
            if ($e instanceof PayPalConnectionException || $e instanceof PayPalConfigurationException) {
                $exception['data'] = $e->getData();
            }
            $exception['file'] = $e->getFile();
            $exception['line'] = $e->getLine();

            return $exception;
        }
    }





    /**
     * Get a validator for an incoming project request.
     *
     * @param  array $data
     * @return \Illuminate\Contracts\Validation\Validator
     */
    protected function validatorCC(array $data)
    {
        $messages = [
            'in'      => 'The :attribute must be one of the following types: :values',
        ];
        return Validator::make($data, [
            'number' => 'required|regex:/^[0-9]{12,19}$/',
            'type' => 'required|in:visa,mastercard,amex,discover,maestro',
            'expire_month' => 'required|regex:/^[0-9]{2}$/',
            'expire_year' => 'required|regex:/^[0-9]{4}$/',
            'cvv2' => 'required|regex:/^[0-9]{3,4}$/',
            'first_name' => 'required|max:25',
            'postal_code'=> 'required',
            'country_code'=> 'required',
            /*'city'=> 'required',
            'state'=> 'required',
            'line1'=> 'required'*/
        ],$messages);
    }
}
