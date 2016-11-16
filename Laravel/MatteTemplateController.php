<?php

namespace App\Http\Controllers;

use App\MatteTemplate;
use Illuminate\Http\Request;
use App\Helpers\Helper;
use Illuminate\Http\Response;
use Validator;
use App\Http\Requests;


class MatteTemplateController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {

        try{
            $orientation=$request->get('orientation');
            $size = $request->get('size');
            $qb=MatteTemplate::query();
            if($orientation){
                $qb->where('orientation', '=', $orientation);
            }
            if($size){
                $qb->where('size_id', '=', $size);
            }

            return $qb->orderBy('id','desc')->simplePaginate(10);
        }catch(\Exception $e){
            return new Response(Helper::globalMessage(),500);
        }
    }

    /*
     * Display all specifications related with this mattetemplate
     * EngravedPlates, ImgTemplates
     * */
    public function specifications(Request $request,$mattetemplate){
        try{
            $entity =MatteTemplate::find($mattetemplate);
            if(!$entity instanceof MatteTemplate){
                $result['status'] = "failure";
                $result['message'] = "The matte template specified is not currently available!";
                return response()->json($result);
            }
            return response()->json($entity->getSpecifications());
        }catch(\Exception $e){
            return new Response(Helper::globalMessage(),500);
        }
    }
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function pullToRefresh(Request $request,$lmt)
    {
        try{
            $orientation=$request->get('orientation');
            $size = $request->get('size');
            $qb=MatteTemplate::query();
            if($orientation){
                $qb->where('orientation', '=', $orientation);
            }
            if($size){
                $qb->where('size_id', '=', $size);
            }
            return $qb->where('id','>',$lmt)->orderBy('id')->simplePaginate(5);
        }catch(\Exception $e){
            return new Response(Helper::globalMessage(),500);
        }
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }
}
