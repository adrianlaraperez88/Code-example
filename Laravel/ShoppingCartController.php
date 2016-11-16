<?php

namespace App\Http\Controllers;

use App\Order;
use App\OrderLine;
use App\Project;
use App\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Helpers\Helper;
use Validator;

use App\Http\Requests;

use DB;

class ShoppingCartController extends Controller
{
    /*Function that return all products in active order of
    * given user
    */
    public function productList(Request $request,$user){
        try{
           $result['lines']=  DB::table('order_lines')
                ->join('projects', 'order_lines.project_id', '=', 'projects.id')
                ->join('orders', 'order_lines.order_id', '=', 'orders.id')
                ->join('users', 'projects.owner_id', '=', 'users.id')
                ->where('users.id','=',$user)
                ->where('orders.status_id','=',1)//active order
                ->select('order_lines.*','projects.name AS project_name', 'projects.preview AS image','projects.hash_name')->get();

            $result['order'] =  DB::table('orders')
               ->where('orders.status_id','=',1)
               ->select('orders.total','orders.taxes','orders.discounts','orders.order_number')->get();
            return $result;
        }catch(\Exception $e){
            echo $e->getMessage();
            return new Response(Helper::globalMessage(),500);
        }
    }

    /*Function that empty the cart*/
    public function emptyCart(Request $request,$user){
        try{
            $ActiveOrder = User::find($user)->orders()->where('status_id', '1')->first();
            if($ActiveOrder instanceof Order){
                $ActiveOrder->orderLines()->each(function($line) {
                    $line->delete();
                });
            }
            $result['status'] = "success";
            $result['message'] = "Your car was emptied successfully.";
            return response()->json($result);
        }catch(\Exception $e){
            return new Response(Helper::globalMessage(),500);
        }
    }

    /*Function that add project to the cart
       * 0- Find the active order of the user if  not exist
       * create it
       * 1- Find the line of the product
       * 2- If existe make an update of the quantity of this line
       * and recalculate your attributes
       * 3- If not exist create a new line         *
       * This function receive three params (user:id of the user,project: id of project that users want to add the cart
       * quantity: quantity of element to add in the cart, action: actin know what action perform add o update line)
       * */
    public function addToCart(Request $request,$action=true){
        try{
            $data = $request->all();
            $validator = $this->validator($data);
            if ($validator->fails()) {
                $result['status'] = "failure";
                $result['message'] = $validator->errors()->getMessages();
                return response()->json($result);
            }
            if(isset($data['action'])) {
                $action = $data['action'];
            }
           $activeOrder = Order::firstOrCreate(['status_id' => 1,'user_id'=>$data['user']]);
           $line = $activeOrder->orderLines()->firstOrNew(['order_id' => $activeOrder->id,'project_id'=>$data['project']]);
           /*When action is true we increase the quantity of the line else only set the same quantity*/
           if($action){
               $line->quantity += $data['quantity'];
           }else{
               $line->quantity = $data['quantity'];
           }

           $line->price  = $line->project->price;
           $line->save();
           $result['status'] = "success";
           $result['message'] = "The item was added to cart successfully.";
           return response()->json($result);
        }catch(\Exception $e){
           echo $e->getMessage();
            return new Response(Helper::globalMessage(),500);
        }
    }

    public function removeProduct(Request $request,$user,$line_id){
        try{
            $ActiveOrder = User::find($user)->orders()->where('status_id', '1')->first();
            if($ActiveOrder instanceof Order){
               $line = $ActiveOrder->orderLines()->find($line_id);
                if($line instanceof OrderLine){
                    $line->delete();
                }
            }
            $result['status'] = "success";
            $result['message'] = "The project was removed successfully.";
            return response()->json($result);
        }catch(\Exception $e){
            // echo $e->getMessage();
            return new Response(Helper::globalMessage(),500);
        }
    }

    /**
     * Get a validator for an incoming project request.
     *
     * @param  array $data
     * @return \Illuminate\Contracts\Validation\Validator
     */
    protected function validator(array $data)
    {
        return Validator::make($data, [
            'user' => 'required|exists:users,id',
            'project'=>'required|exists:projects,id',
            'quantity'=>'required|Integer|Between:1,99',
        ]);
    }



}
