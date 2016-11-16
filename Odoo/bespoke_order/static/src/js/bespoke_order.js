/**
 * Created by lara on 10/3/16.
 */

odoo.define('bespoke.bespoke_order_tool', function (require) {
    "use strict";
    var website = require('website.website');
    var ajax = require('web.ajax');
    var core = require('web.core');
    var csrf_token = core.csrf_token;
    var act = 1;
    var act_wizard = 1;

    /*Array to store global extra products*/
    var Extras = [];
    /*Array to store global exclusions products*/
    var Exclusions = [];

    var selections = {
        "order_id": "",
        "meal_type": "",
        "goal_plan": "",
        "sex": "",
        "activity_level": "",
        "meals_day": 0,
        "meals_week": 5,
        // "week_days": [],
        "juice_cleanse": false,
        "goal_calories": 0,
        "weight": 0,
        "height": 0,
        "date_birth": "",
        "body_fat_percentage": "",
        "extras": [],
        "exclusions": [],
        "total_price": 0,
        "max_free_exclusions": 0,
        "charge_extra_exclusions": 0,
        // "recomended_products": [],
        "macros_carbs": 0,
        "macros_protein": 0,
        "macros_fat": 0,
        "post_code": "",
        'qty_extra_pay': 0,
        'tdee': 0,
        'bmr': 0,
        'contract': "",
        'feed_day_id': 0,
        'price_day': 0,
        // 'contract_name': ""
    };

    jQuery(document).ready(function () {
        buildWizard();
    });

    /***********************************************INIT FUNCTION *************************************/
    function init() {

        jQuery('div#container_steps .slide').removeClass('hide');
        jQuery('div#container_steps .slide').hide();
        jQuery('div.macros').hide();
        jQuery('div#step2 #ikmacros').prop('checked', false);
        jQuery('#step1').show();
        jQuery('#step1').fadeIn("slow", function () {
            // Animation complete
        });
        // selections.goal_calories=0;

    }


    $('#send_email_postcode').on('click', function (e) {
        e.preventDefault();
        $('#error_msg_pos_email').empty();

        $('#postcode').removeClass('has-error');
        $('#email_from').removeClass('has-error');


        ajax.jsonRpc('/bespoke_order/validate_post_code', 'call', {
            postcode: $('#postcode').val(),
            email_from: $('#email_from').val(),
        }).then(function (result) {
            if (result.status) {
                $('#postcode').removeClass('has-error');
                $('#email_from').removeClass('has-error');
                $('#error_msg_pos_email').addClass('hide');
                location.href = "/order_tool";
            } else {

                $('#error_msg_pos_email').removeClass('hide');

                jQuery.each(result.error_fields, function (k, field) {
                    $('#' + field).addClass('has-error');
                });

                $('#error_msg_pos_email').append("<span>Apologies. We do not deliver to this postcode at this time. Watch this space for Bespoke Fitness Fuel in your area!</span>");
            }
        }).fail(function () {
            $('#error_msg_pos_email').removeClass('hide');
            $('#error_msg_pos_email').append("<span>Apologies. We do not deliver to this postcode at this time. Watch this space for Bespoke Fitness Fuel in your area!</span>");
        });

    });


    /*Terms*/
    jQuery("#terms[type=checkbox]").on("click", function (event) {
        if (jQuery("#terms").is(':checked')) {
            jQuery("a.a-submit").removeClass('disabled');
            jQuery("p.termsconditions").parent().removeClass('has-error');
        } else {
            var $terms = jQuery("a.a-submit");
            if (!$terms.hasClass('disabled')) {
                $terms.addClass('disabled');
                jQuery("p.termsconditions").parent().addClass('has-error');
            }
        }
    });
    $('.oe_website_sale .a-submit#gotopayment').off('click').on('click', function (event) {
        if (jQuery("#terms").is(':checked')) {
            jQuery("a.a-submit#gotopayment").removeClass('disabled');
            jQuery("p.termsconditions").parent().removeClass('has-error');
            if (!event.isDefaultPrevented() && !$(this).is(".disabled")) {
                $(this).closest('form').submit();
            }
        } else {
            var $terms = jQuery("a.a-submit#gotopayment");
            if (!$terms.hasClass('disabled')) {
                $terms.addClass('disabled');
                jQuery("p.termsconditions").parent().addClass('has-error');
            }
            event.preventDefault();
        }


    });
    $('div#step2 :input').val('');
    $('#wrapwrap > footer').css("display", "none");

    jQuery("div#step2 input#db").keyup(function () {
        if (this.value != "") {
            // alert('ok');
            selections.date_birth = jQuery("div#step2 input#db").val();
        } else {
            selections.date_birth = 0;
        }

    });


    /*Function to show and hide macros*/
    jQuery("div#step2 #ikmacros[type=checkbox]").on("click", function () {
        if (jQuery("#ikmacros").is(':checked')) {
            jQuery('div.macros').fadeIn("slow", function () {
                // Animation complete
            });
            selections.goal_calories = jQuery("#totalMacros").val();
        } else {
            jQuery('div.macros').fadeOut("slow", function () {
                // Animation complete
            });
            jQuery("div#step2 input#protein").val("");
            jQuery("div#step2 input#carbs").val("");
            jQuery("div#step2 input#fat").val("");
            jQuery("div#step2 input#totalMacros").val("");
            selections.goal_calories = 0;
            selections.macros_fat = 0;
            selections.macros_carbs = 0;
            selections.macros_protein = 0;
        }
    });
    /************************************************************************************/
    /*Function that handle totalize macros */
    jQuery("div#step2 input#protein,div#step2 input#carbs,div#step2 input#fat").keyup(function () {

        var $total = jQuery("div#step2 input#totalMacros");
        var $protein = jQuery("div#step2 input#protein");
        var $carbs = jQuery("div#step2 input#carbs");
        var $fat = jQuery("div#step2 input#fat");
        var $proteinVal = 0;
        var $fatVal = 0;
        var $carbsVal = 0;

        if (!$protein.val()) {
            $proteinVal = 0;
        } else {
            $proteinVal = parseFloat($protein.val());
        }
        if (!$fat.val()) {
            $fatVal = 0;
        } else {
            $fatVal = parseFloat($fat.val())
        }
        if (!$carbs.val()) {
            $carbsVal = 0;
        } else {
            $carbsVal = parseFloat($carbs.val())
        }
        $total.val("");

        var $totalVal = ($proteinVal * 4) + ($fatVal * 9) + ($carbsVal * 4);
        $total.val($totalVal != 0 ? $totalVal.toFixed(2) : "");
        selections.goal_calories = parseFloat($totalVal);
        selections.macros_fat = $fat.val();
        selections.macros_protein = $protein.val();
        selections.macros_carbs = $carbs.val();
    });

    /**************************************************************************************/
    /*Function to validate only numbers*/
    jQuery('div#step2 .number').keypress(function (event) {
        var $this = jQuery(this);
        if ((event.which != 46 || $this.val().indexOf('.') != -1) &&
            ((event.which < 48 || event.which > 57) &&
            (event.which != 0 && event.which != 8))) {
            event.preventDefault();
        }

        var text = jQuery(this).val();
        if ((event.which == 46) && (text.indexOf('.') == -1)) {
            setTimeout(function () {
                if ($this.val().substring($this.val().indexOf('.')).length > 3) {
                    $this.val($this.val().substring(0, $this.val().indexOf('.') + 3));
                }
            }, 1);
        }

        if ((text.indexOf('.') != -1) &&
            (text.substring(text.indexOf('.')).length > 2) &&   //Decimals after a comma
            (event.which != 0 && event.which != 8) &&
            (jQuery(this)[0].selectionStart >= text.length - 2)) {
            event.preventDefault();
        }
    });

    /******************** Function that handle totalice pounds weight *********/

    /*Function that handle totalize pounds and stones in weight*/
    jQuery("div#step2 input#stones,div#step2 input#pounds").keyup(function () {

        var $total = jQuery("div#step2 input#weight");
        var $stones = jQuery("div#step2 input#stones");
        var $pounds = jQuery("div#step2 input#pounds");
        var $poundsVal = 0;
        var $stonesVal = 0;
        if (!$pounds.val()) {
            $poundsVal = 0;
        } else {
            $poundsVal = parseFloat($pounds.val());
        }
        if (!$stones.val()) {
            $stonesVal = 0;
        } else {
            $stonesVal = parseFloat($stones.val())
        }
        $total.val("");
        var $totalVal = ($stonesVal * 6.35029) + ($poundsVal * 0.453592);
        $total.val($totalVal != 0 ? $totalVal.toFixed(2) : "");
        selections.weight = parseFloat($totalVal);

    });
    /*Function that handle weight write keyup*/
    jQuery("div#step2 input#weight").keyup(function () {
        jQuery("div#step2 input#stones,div#step2 input#pounds").val("");
        if (this.value) {
            selections.weight = parseFloat(jQuery("div#step2 input#weight").val());
        } else {
            selections.weight = 0;
        }
    });
    /********************** Function that handle totalize feets and inches in height *****/
    jQuery("div#step2 input#feets,div#step2 input#inches").keyup(function () {

        var $total = jQuery("div#step2 input#height");
        var $feets = jQuery("div#step2 input#feets");
        var $inches = jQuery("div#step2 input#inches");
        var $inchesVal = 0;
        var $feetsVal = 0;
        if (!$inches.val()) {
            $inchesVal = 0;
        } else {
            $inchesVal = parseFloat($inches.val());
        }
        if (!$feets.val()) {
            $feetsVal = 0;
        } else {
            $feetsVal = parseFloat($feets.val())
        }
        $total.val("");
        var $totalVal = ($feetsVal * 30.48) + ($inchesVal * 2.54);
        $total.val($totalVal != 0 ? $totalVal.toFixed(2) : "");
        selections.height = parseFloat($totalVal);
    });
    /*Function that handle height write keyup*/
    jQuery("div#step2 input#height").keyup(function () {
        jQuery("div#step2 input#feets,div#step2 input#inches").val("");
        if (this.value != "") {
            selections.height = parseFloat(jQuery("div#step2 input#height").val());
        } else {
            selections.height = 0;
        }

    });

    /*Function that update activity level on selections*/
    jQuery("div#step2 select#actLevel").on('change', function () {

        if (this.value != "") {
            selections.activity_level = this.value;
        } else {
            selections.activity_level = 0;
        }

    });
    /*Function that update body fat perentage in selections*/
    jQuery("div#step2 input#bfp").keyup(function () {
        if (this.value != "") {
            selections.body_fat_percentage = this.value;
        } else {
            selections.body_fat_percentage = 0;
        }
    });


    /************************************* To show Next Slide **********************************/
    /*Funtion used by Continue btn to navigate to specific slide*/

    $('div#next_btn #toShowNext').on('click', function () {
        $('#error_msg').addClass('hide');
        var flag = true;


        if (act_wizard != act) {
            act = act_wizard;
        }
        var $grandpa = $("#step" + act);

        switch (act) {
            case 1:
                $('#error_msg').empty();
                if (selections.sex == "") {
                    $('#error_msg').removeClass('hide');

                    $('#error_msg').append("<span>Please select your gender</span>");
                    flag = false;
                } else if (selections.meal_type == "") {
                    $('#error_msg').removeClass('hide');
                    $('#error_msg').append('<span>Please select your meal type</span>');
                    flag = false;
                } else if (selections.goal_plan == "") {
                    $('#error_msg').removeClass('hide');
                    $('#error_msg').append("<span>Please select your plan</span>");
                    flag = false;
                }
                break;
            case 2:
                flag = validateMacroSlide($grandpa);
                break;
            case 3:
                if (selections.meals_day == 0) {
                    flag = false
                }
                var elem_contract = $('input:radio[name=contract]:checked');
                selections.contract = elem_contract.attr('for');
                jQuery("div#step4 td#contract").text(elem_contract.data('title'));
                jQuery("div#step4 td#meal_per_day").text(selections.meals_day);
                jQuery("div#step4 td#total_pay").text("\u00A3" + selections.price_day * elem_contract.data('day'));
                jQuery("div#step4 td#price_per_day").text("\u00A3" + selections.price_day);

                if (flag) {
                    $('#next_btn').addClass('hide');
                }
                break;
            default:
                break;
        }
        if (flag) {


            if ($grandpa) {
                $grandpa.hide();
                $('#wizard-a-step' + act).removeClass('active');
            }
            act += 1;
            act_wizard = act;
            var $next = $("#step" + act);


            if ($next) {
                $next.removeClass('hide');
                $next.fadeIn("slow", function () {
                    // Animation complete
                });
                $('#wizard-a-step' + act).addClass('active');

                /*Call the function to get coincidences*/
                if ($next.attr('id') == "step4") {
                    renderExtras();
                    renderExclusions();
                }
                if ($next.attr('id') == "step3") {
                    calc();
                }
            }
            writeSummary();
        }
    });


    $("div#step3 div#exclusions ").on("click", 'a#excl_btnscheduleclick', function (e) {
        btnScheduleClick($(this));

    });

    $("div.containerExtras").on("click", "a#ext_btnscheduleclick", function () {
        btnScheduleClick($(this));
    });

    $('div#step3 #meal_day_btnscheduleclick').on('click', function (e) {
        btnScheduleClick($(this));
    });


    $('div#step1 #btnclick_single').on('click', function (e) {
        btnClick($(this));
    });

    $('div#step4 #addtocart').on('click', function (e) {
        addToCart();
    });

    $('div#step4 #printorder').on('click', function (e) {
        PrintOrder();
    });

    $('div#step1 #btnclick_single_tpl').on('click', function (e) {
        btnClick($(this));
    });
    $('div#step1 #btnclick_single_cat').on('click', function (e) {
        btnClick($(this));
    });


    /*Function that print the html element passed*/
    function PrintOrder() {
        jQuery("div.summaryOrder").printThis({
            debug: false,
            importCSS: true,
            importStyle: true,
            printContainer: true,
            /*pageTitle: "Your Order",*/
            removeInline: false,
            printDelay: 333,
            header: null,
            formValues: true
        });

    }


    /***********************************btn Shedule Click**************************************************************/
    function btnScheduleClick($btn) {
        var $grandpa = $btn.parent().parent().parent();
        /*Set values to global array*/
        switch ($btn.data('factor-name')) {
            case 'meals_day':
                selections.meals_day = $btn.data('factor-value');
                if (jQuery('div.mpd').hasClass('error-class')) {
                    jQuery('div.mpd').removeClass('error-class');
                }
                break;
            case 'extras':
                if (findElementInArrayByKey($btn.data('factor-value'), selections.extras) == -1) {
                    selections.extras.push({id: $btn.data('factor-value')});
                } else {
                    removeByIndex(selections.extras, findElementInArrayByKey($btn.data('factor-value'), selections.extras));
                }
                break;
            case 'exclusion':
                if (findElementInArrayByKey($btn.data('factor-value'), selections.exclusions) == -1) {
                    selections.exclusions.push({id: $btn.data('factor-value')});
                } else {
                    removeByIndex(selections.exclusions, findElementInArrayByKey($btn.data('factor-value'), selections.exclusions));
                }
                break;
            default:
                break;
        }
        if ($btn.data('selection-type') == 'single') {
            jQuery('#' + $grandpa.attr('id') + ' .buttonPlan[data-selection-type="single"]').removeClass('active');
            $btn.addClass('active');
        }
        else if ($btn.data('selection-type') == 'multiple') {
            $btn.toggleClass('active');

        }
    }

    /***************************************************************************************/
    /*Function that handle the search in array by id*/
    function findElementInArrayByKey($id, $array) {
        for (var i = 0; i < $array.length; i++) {
            if ($array[i].id == $id) {
                return i;
            }
        }
        return -1;
    }

    /***************************************************************************************/
    /*Function that handle the action to remove an element in array*/
    function removeByIndex(arr, index) {
        arr.splice(index, 1);
    }

    /******************* Function that Paint all Extras & Exclusions in it's Slide *********/

    /**************** Validate Slide for Enter or Calculate your macros*********************/
    function validateMacroSlide($btn) {
        var countB = 0;

        jQuery("div.stats").find('input[data-rule-required=true]').each(function () {
            if (!jQuery(this).val() || jQuery(this).val() == -1) {
                jQuery(this).css('border-color', '#bb2a2a');
                jQuery(this).prev().css('color', '#bb2a2a');
                countB++;
            } else {
                jQuery(this).css('border-color', '#cccccc')
                jQuery(this).prev().css('color', '#777777');
            }
        })
        jQuery("div.activity").find('select[data-rule-required=true]').each(function () {
            if (!jQuery(this).val() || jQuery(this).val() == -1) {
                jQuery(this).css('border-color', '#bb2a2a');
                jQuery(this).prev().css('color', '#bb2a2a');
                countB++;
            } else {
                jQuery(this).css('border-color', '#cccccc')
                jQuery(this).prev().css('color', '#777777');
            }
        })
        if (jQuery("#ikmacros").is(':checked')) {
            jQuery("div.macros input[data-rule-required=true]").each(function () {
                if (!jQuery(this).val() || jQuery(this).val() == -1) {
                    jQuery(this).css('border-color', '#bb2a2a');
                    jQuery(this).prev().css('color', '#bb2a2a');
                    countB++;
                } else {
                    jQuery(this).css('border-color', '#cccccc')
                    jQuery(this).prev().css('color', '#777777');
                }
            });
        }
        if (parseFloat($('#db').val()) > 100 || parseFloat($('#db').val()) < 1) {
            $('#db').css('border-color', '#bb2a2a');

            countB++;
        }

        if (countB == 0) {
            return true;
        } else {
            return false;
        }
    }

    /*Listener to show specific slide*/
    $('.toshowSlide').on('click', function () {
        var targetslide = $(this).data('slide');
        var step = $("div#" + targetslide).attr('id');
        if (step.substr(step.length - 1) <= act_wizard && act_wizard <= act) {
            $('#next_btn').removeClass('hide');
            jQuery('a[data-wizard-a=step-wizard]').removeClass('active');
            $('#wizard-a-step' + parseInt(step.substr(step.length - 1))).addClass('active');
            jQuery('div#container_steps .slide').hide();
            $("div#" + targetslide).fadeIn("slow", function () {
                // Animation complete
            });
            act_wizard = parseInt(step.substr(step.length - 1));
        }
    });


    /******************* Function that Paint all Extras & Exclusions in it's Slide *********/
    function paintExtrasExclusions() {

        var $extraContainer = jQuery("div.containerExtras");
        var $exclusionContainer = jQuery("div.containerExclusions");
        var $urlImg = '/bespoke_order/static/src/img/add.png';

        $extraContainer.empty();
        selections.extras = [];
        // jQuery("select#pickData").empty();
        // jQuery("select#pickListResult").empty();
        $exclusionContainer.empty();
        selections.exclusions = [];

        /*If not exist nothing extra and nothing exclusion i need remove summary item
         and hide the slide*/
        if (Extras.length == 0 && Exclusions.length == 0) {
            jQuery("div#step3").fadeOut("slow", function () {
            });
            jQuery("a[data-factor-name=extra_exclusion].btnSummary").fadeOut("slow", function () {
            });
        }
        // if (Extras.length > 0) {
        //     $extraContainer.prev().show();
        // } else {
        //     $extraContainer.prev().hide();
        // }
        //
        // if (Exclusions.length > 0) {
        //     $exclusionContainer.prev().show();
        //     // jQuery("div.containerExclusions").show();
        // } else {
        //     $exclusionContainer.prev().hide();
        //     // jQuery("div.containerExclusions").hide();
        // }


        Extras.forEach(function ($item) {
            var $price = 0;
            if ($item.price != "") {
                $price = $item.price;
            }
            var $ext =
                '<a class="buttonAction extra"  id ="ext_btnscheduleclick" data-selection-type="multiple"  data-factor-name="extras" data-factor-title="' + $item.title + '" data-factor-value="' + $item.id + '" href="#" role="button">' +
                '<span>' +
                '<img src="data:image/png;base64,' + $item.image + '" alt="' + $item.name + '">' +
                '<h5 class="extras">&pound; ' + $price + '</h5>' +
                '<p class="title_extras">' + $item.title + '</p>' +
                /*'<img src="'+$urlImg+'" alt="Calendar">'+*/

                '</span>' +

                '</a>';
            $extraContainer.append($ext);

        });


        Exclusions.forEach(function ($excl) {
            var $price = 0;
            if ($excl.price != "") {
                $price = $excl.price;
            }
            var $extc =
                '<a class="buttonAction extra" id ="excl_btnscheduleclick" data-selection-type="multiple" data-factor-name="exclusion" data-factor-title="' + $excl.title + '" data-factor-value="' + $excl.id + '" href="#" role="button">' +
                '<span>' +
                '<img src="data:image/png;base64,' + $excl.image + '" alt="' + $excl.name + '">' +
                '<h5 class="extras">&pound; ' + $price + '</h5>' +
                '<p class="title_extras">' + $excl.title + '</p>' +


                '</span>' +

                '</a>';
            $exclusionContainer.append($extc);
        });
    }

    /*********************************************************************************************/
    /*Function that show specific slide*/
    function toShowSlide($idSlide, $btn) {


        var step = $($idSlide).attr('id');
        if (step.substr(step.length - 1) <= act_wizard && act_wizard <= act) {
            $('#next_btn').removeClass('hide');
            jQuery('a[data-wizard-a=step-wizard]').removeClass('active');
            // }
            $('#wizard-a-step' + parseInt(step.substr(step.length - 1))).addClass('active');
            jQuery('div#container_steps .slide').hide();
            jQuery($idSlide).fadeIn("slow", function () {
                // Animation complete
            });
            act_wizard = parseInt(step.substr(step.length - 1));
        }

    }


    /********************************** Load Extras & Exclusions ****************************/
    function loadExtrasExclusions() {
        jQuery("div#loader").removeClass('hide');
        jQuery("div#loader").fadeIn("slow", function () {
        });

        ajax.jsonRpc('/bespoke_order/load_extras_exclusions', 'call', {
            cat: selections.meal_type
        }).then(function (result) {
            jQuery("div#loader").fadeOut("slow", function () {
            });

            Extras = result.Extras;
            Exclusions = result.Exclusions;
            selections.charge_extra_exclusions = result.Charge;
            selections.max_free_exclusions = result.Max_Free_Extras;
            /*To update the exclusion aditional charge*/
            jQuery("span.notification").remove();
            if (selections.max_free_exclusions > 0 && selections.charge_extra_exclusions > 0) {
                jQuery("div.notificationChargesExclusions").append(
                    '<span class="notification">All extra exclusion after <b style="color: red;">' + selections.max_free_exclusions + '</b> has an  <b style="color: red;"">&pound;' + selections.charge_extra_exclusions + '</b> aditional charge.</span>'
                );
            } else if (selections.max_free_exclusions == 0 && selections.charge_extra_exclusions > 0) {
                jQuery("div.notificationChargesExclusions").append(
                    '<span class="notification">All extra exclusion has an  <b style="color: red;"">&pound;' + selections.charge_extra_exclusions + '</b> aditional charge.</span>'
                );
            }
            paintExtrasExclusions();

        }).fail(function (jqXHR, textStatus, errorThrown) {
            jQuery("div#loader").fadeOut("slow", function () {
            });
            jQuery("div#loader").addClass('hide');
            Extras = Exclusions = [];
            selections.charge_extra_exclusions = 0;
            selections.max_free_exclusions = 0;
        });
    }

    /********************************** btn click for single and multiple selections ***************************/

    /*Function that handle the action when the user press single selection boton*/
    function btnClick($btn) {
        /*Set values to global array*/
        switch ($btn.data('factor-name')) {
            case 'meal_type':
                selections.meal_type = $btn.data('factor-value');
                loadExtrasExclusions();

                jQuery("td#meal_type").text($btn.data('invoice-title'));//update  in visual order
                break;
            case 'goal_plan':
                selections.goal_plan = $btn.data('factor-value');
                jQuery("td#goal_plan").text($btn.data('invoice-title'));//update  in visual order
                break;
            case 'sex':
                selections.sex = $btn.data('factor-value');
                break;
            case 'activity_level':
                selections.activity_level = $btn.data('factor-value');
                break;
            case 'meals_week':
                selections.meals_week = $btn.data('factor-value');
                break;
            default:
                break;
        }
        if ($btn.data('selection-type') == 'single') {
            // }
            jQuery('a[data-selection-type="single"][data-factor-name="' + $btn.data('factor-name') + '"]').removeClass('active');
            $btn.addClass('active');
        }
    }

    /*************************Write in sumary block******************/
    function writeSummary() {
        var $targetSlide = "step" + act;
        switch (act) {
            case 1:
                var $text_goal = $("a.buttonPlan[data-factor-value=" + selections.goal_plan + "]").data("invoice-title");
                $("div#goal p.value").text($text_goal);
                $("div#mealtype p.value").text(selections.meal_type);
                break;
            case 2:
                if (selections.goal_calories != "") {

                    $("div#calories p.value").text(selections.goal_calories);

                    $("div#macros span.first_header").text("PROTEIN");
                    $("div#macros span.first").text(selections.macros_protein);

                    $("div#macros span.second_header").text("FAT");
                    $("div#macros span.second").text(selections.macros_fat);

                    $("div#macros span.third_header").text("CARBS");
                    $("div#macros span.third").text(selections.macros_carbs);
                } else if (selections.body_fat_percentage != "") {
                    $("div#calories p.value").text("--");

                    $("div#macros span.first_header").text("BODY FAT PERCENTAGE");
                    $("div#macros span.first").text(selections.body_fat_percentage + "%");
                    $("div#macros span.second_header").text("");
                    $("div#macros span.second").text("");

                    $("div#macros span.third_header").text("");
                    $("div#macros span.third").text("");
                } else {
                    $("div#calories p.value").text("--");

                    $("div#macros span.first_header").text("WEIGHT");
                    $("div#macros span.first").text(selections.weight.toFixed(2));

                    $("div#macros span.second_header").text("HEIGHT");
                    $("div#macros span.second").text(selections.height.toFixed(2));

                    $("div#macros span.third_header").text("AGE");
                    $("div#macros span.third").text(selections.date_birth);
                }
                break;
            case 3:
                if (selections.exclusions.length > 0) {
                    $("div#exclusions p.value").text(selections.exclusions.length);
                } else {
                    $("div#exclusions p.value").text("NO");
                }
                $("div#numberofmeals p.value").text(selections.meals_day);
                break;
            case 4:
                var $text = "Cuarto slide";
                var $label = "Resume";
                break;
            default:
                break;
        }
    }

    /*Function that render all products that have a match*/
    // function renderRecomended(products) {
    //     if (products.length > 0) {
    //         jQuery("table.recomended-products").removeClass('hide');
    //         var $subTotal = 0;
    //         jQuery("tr.rencomended-product").remove();
    //         var $body = jQuery("table.recomended-products tbody");
    //         selections.recomended_products = [];
    //         products.forEach(function ($item) {
    //             /*Set to global seections*/
    //             selections.recomended_products.push({
    //                 id: $item.id,
    //                 title: $item.title,
    //                 price: $item.price,
    //                 link: $item.link
    //             });
    //             var $price = !$item.price ? 0 : $item.price;
    //             var $tr =
    //                 '<tr class="rencomended-product">' +
    //                 '<td class="text-left">' + $item.title + '</td>' +
    //                 '<td class="text-center">' + $item.mpd + '</td>' +
    //                 '<td class="text-center">' + selections.meals_week + '</td>' +
    //                 '<td class="text-center">' + $item.price + '</td>' +
    //                 '<td class="text-center">1</td>' +
    //                 '<td class="text-right">' + (parseFloat($price) * parseFloat(selections.meals_day) * parseFloat(selections.meals_week)).toFixed(2) + '</td> ' +
    //                 '</tr>';
    //             $body.append($tr);
    //             $subTotal += parseFloat($price) * parseFloat(selections.meals_day) * parseFloat(selections.meals_week);
    //         });
    //
    //         $body.append(
    //             '<tr class="rencomended-product">' +
    //             '<td class="highrow"></td>' +
    //             '<td class="highrow"></td>' +
    //             '<td class="highrow"></td>' +
    //             '<td class="highrow"></td>' +
    //             '<td class="highrow text-center"><strong>Subtotal</strong></td>' +
    //             '<td class="highrow text-right">&pound; ' + $subTotal.toFixed(2) + '</td>' +
    //             '</tr>'
    //         )
    //     } else {
    //         jQuery("table.recomended-products").addClass('hide');
    //     }
    //
    // }

    /*Function that handle renderization of macros*/
    function renderMacros($tdee, $bmr, $goal_calories) {
        selections.goal_calories = Math.round($goal_calories * 100) / 100;
        selections.tdee = Math.round($tdee * 100) / 100;
        selections.bmr = Math.round($bmr * 100) / 100;
        // convertCaloriesMacro(selections.goal_calories);
        var $body = jQuery("table.your-macros tbody");
        jQuery("tr.row-your-macros").remove()
        var $tr =
            '<tr class="row-your-macros">' +
            '<td>' + selections.goal_calories + '</td>' +
            '<td class="text-center">' + (selections.macros_protein * 4) + '</td>' +
            '<td class="text-center">' + (selections.macros_fat * 9 ) + '</td>' +
            '<td class="text-center">' + (selections.macros_carbs * 4) + '</td>' +
            '<td class="text-center">' + selections.tdee + '</td>' +
            '<td class="text-center">' + selections.bmr + '</td>' +
            '</tr>';
        $body.append($tr);
    }

    /*Function that render all extra prodcts in summary*/
    function renderExtras() {
        if (selections.extras.length > 0) {
            jQuery("table.extra-products").removeClass('hide');
            var $subTotal = 0;
            jQuery("tr.extra-product").remove();
            var $body = jQuery("table.extra-products tbody");
            Extras.forEach(function ($item) {
                if (findElementInArrayByKey($item.id, selections.extras) != -1) {
                    var $price = !$item.price ? 0 : $item.price;
                    var $tr =
                        '<tr class="extra-product">' +
                        '<td class="text-left">' + $item.title + '</td>' +
                        '<td class="text-center">' + 1 + '</td>' +
                        '<td class="text-center">' + selections.meals_day + '</td>' +
                        '<td class="text-center">' + selections.meals_week + '</td>' +
                        '<td class="text-center">&pound; ' + $price + '</td>' +
                        '<td class="text-right">&pound;  ' + (parseFloat($price) * parseFloat(selections.meals_day) * parseFloat(selections.meals_week)).toFixed(2) + '</td> ' +
                        '</tr>';
                    $body.append($tr);
                    $subTotal += parseFloat($price) * parseFloat(selections.meals_week) * parseFloat(selections.meals_day);
                }
            });
            $body.append(
                '<tr class="extra-product">' +
                '<td class="highrow"></td>' +
                '<td class="highrow"></td>' +
                '<td class="highrow"></td>' +
                '<td class="highrow"></td>' +
                '<td class="highrow text-center"><strong>Subtotal</strong></td>' +
                '<td class="highrow text-right">&pound; ' + $subTotal.toFixed(2) + '</td>' +
                '</tr>'
            )
        } else {
            jQuery("table.extra-products").addClass('hide');
        }
    }

    /*Function that render all exclusions selected*/
    function renderExclusions() {
        if (selections.exclusions.length > 0) {
            jQuery("table.exclusions-products").removeClass('hide');
            var $subTotal = 0;
            jQuery("tr.exclusion-product").remove();
            var $body = jQuery("table.exclusions-products tbody");
            var $count = 1;
            selections.qty_extra_pay = 0;
            Exclusions.forEach(function ($item) {
                if (findElementInArrayByKey($item.id, selections.exclusions) != -1) {
                    var $price = !$item.price ? 0 : $item.price;
                    var $charge = 0;
                    if ($count > selections.max_free_exclusions) {
                        $charge = parseFloat(selections.charge_extra_exclusions);
                        selections.qty_extra_pay += 1;
                    }
                    var $tr =
                        '<tr class="exclusion-product">' +
                        '<td class="text-left">' + $item.title + '</td>' +
                        '<td class="text-center">' + 1 + '</td>' +
                        '<td class="text-center">' + selections.meals_day + '</td>' +
                        '<td class="text-center">' + selections.meals_week + '</td>' +
                        '<td class="text-center">&pound; ' + $charge + '</td>' +
                        '<td class="text-right">&pound; ' + parseFloat($charge) * parseFloat(selections.meals_week) * parseFloat(selections.meals_day) + '</td> ' +
                        '</tr>';
                    $body.append($tr);
                    $subTotal += $charge * (parseFloat(selections.meals_week) * parseFloat(selections.meals_day));
                    $count++;
                }
            });
            $body.append(
                '<tr class="exclusion-product">' +
                '<td class="highrow"></td>' +
                '<td class="highrow"></td>' +
                '<td class="highrow"></td>' +
                '<td class="highrow"></td>' +
                '<td class="highrow text-center"><strong>Subtotal</strong></td>' +
                '<td class="highrow text-right">&pound; ' + $subTotal.toFixed(2) + '</td>' +
                '</tr>'
            )
        } else {
            jQuery("table.exclusions-products").addClass('hide');
        }
    }


    /*Function that handle Ajax request */
    function calc() {
        var post_id = jQuery(this).data('id');

        ajax.jsonRpc('/bespoke_order/calculate_stats', 'call', {

            macros_carbs: selections.macros_carbs,
            macros_protein: selections.macros_protein,
            macros_fat: selections.macros_fat,
            meal_type: selections.meal_type,
            goal_plan: selections.goal_plan,
            sex: selections.sex,
            activity_level: selections.activity_level,
            meals_day: selections.meals_day,
            meals_week: selections.meals_week,
            goal_calories: selections.goal_calories,
            tdee: selections.tdee,
            bmr: selections.bmr,
            weight: selections.weight,
            height: selections.height,
            date_birth: selections.date_birth,
            body_fat_percentage: selections.body_fat_percentage

        }).then(function (result) {
            // selections.recomended_products = result._products;
            selections.goal_calories = result._goal_calories;
            $("div#calories p.value").text("");
            $("div#calories p.value").text(result._goal_calories);
            // renderRecomended(result._products);
            renderMacros(result._tdee, result._bmr, result._goal_calories);
            renderdays_price(result.day, result.price, result.feed_day_id);
            renderContract(result._contract, result.price);
            // renderExtras();
            // renderExclusions();
            jQuery("div.loader-container").addClass('hide');
            jQuery("div.summaryOrder").removeClass('hide');
        }).fail(function (error) {
            // selections.recomended_products = [];
            jQuery("div.loader-container").addClass('hide');
            jQuery("div#step4 div.barButton").hide();
            jQuery("div#step4").append('<h3 class="error-class">sorry we currently have communication problems with the server, please try later</h3>');
        });

    }


    /*Function render contract and informaction the this contract*/

    function renderContract(obj_contract, price) {
        // function renderContract(obj_contract, day, price) {

        $('div#step3 div#contracts').empty();

        obj_contract.forEach(function ($item) {
            var input = '<input type="radio" data-day="' + $item.days + '" name="contract" value="' + $item.id + '" for="' + $item.id + '"data-title="' + $item.name + '"checked="' + $item.checked + '"/>';
            // var label_text = $item.name + " / Price: " + $item.days * day * price + " / Discount: " + $item.discount_contract;
            var label_text = $item.name + " / Price: \u00A3 " + $item.days * price + " / Discount: \u00A3 " + $item.discount_contract;
            var label = '<label for="' + $item.id + '">' + label_text + '</label>';
            $('div#step3 div#contracts').append(input);
            $('div#step3 div#contracts').append(" ");
            $('div#step3 div#contracts').append(label);
            $('div#step3 div#contracts').append(" ");
        });

    }

    /*Function render cant day and price per day*/
    function renderdays_price(day, price, feed_day_id) {
        $('div#day_meals').empty();
        var $meal =
            // '<a class="buttonPlan large" id="meal_day_btnscheduleclick" data-selection-type="single" data-factor-name="meals_day" data-factor-title="' + $excl.title + '" data-factor-value="' + $excl.id + '" href="#" role="button">' +
            '<span>' +
            '<p class="text-btn">' + day + ' Meals a days</p>' +
            '<h5 class="extras">&pound; ' + price + ' a day</h5>' +

            '</span>';

        // '</a>';
        selections.meals_day = day;
        selections.price_day = price;
        selections.feed_day_id = feed_day_id
        $('div#day_meals').append($meal);
    }


    /*Function that build  the wizard from cookies or initialize empty*/
    function buildWizard() {
        var url = (document.location.href).split('//')[1].split("/")[1];
        if ($.inArray(url, ["order_tool", "order_tool#"]) == -1) {
            init();
        } else {

            readOrder();
        }

    }

    /*Function that catch GET params from url*/
    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    /*Function that add products to cart and redirect to this*/
    /*If the selections array not has a order number set to coockies else udate the coockie*/
    function addToCart() {
        jQuery("div#step4 div.barButton").hide();

        ajax.jsonRpc('/bespoke_order/cart_add_update', 'call', {
            'selection': selections
        }).then(function (result) {
            window.location.href = '/shop/cart';
            return true;
        }).fail(function () {
            jQuery("div#step4 div.barButton").hide();
            jQuery("div#step4").append('<h3 class="error-class">sorry we currently have communication problems with the server, please try later</h3>');
        });

    }


    /*Function that read specific order from cookies*/
    function readOrder() {
        /*Show Mask To prepare wizard*/
        jQuery("div#loaderPrincipal").removeClass("hide");
        ajax.jsonRpc('/bespoke_order/data_wizard', 'call', {}).then(function (result) {
            if (!jQuery.isEmptyObject(result)) {
                paintFromOrderData(result);

            } else {
                /*Call init function to show slides*/
                init();
            }
            /*Remove mask*/
            jQuery("div#loaderPrincipal").addClass("hide");
            /*Show first slide*/
            jQuery('div#container_steps .slide').removeClass('hide');
            jQuery('div#container_steps .slide').hide();
            jQuery('#step1').show();
            jQuery('#step1').fadeIn("slow", function () {
                // Animation complete
            });
        }).fail(function () {
            /*Remove mask*/
            jQuery("div#loaderPrincipal").addClass("hide");
            /*Call init function to show slides*/
            init();
        });

    }

    /*
     Function convert Goal calories in protein, fat and carbs, save conversion in selections
     */

    function convertCaloriesMacro(goal_calories) {
        selections.macros_protein = (((goal_calories * 40) / 100) / 4).toFixed(2);
        selections.macros_fat = (((goal_calories * 30) / 100) / 9).toFixed(2);
        selections.macros_carbs = (((goal_calories * 30) / 100) / 4).toFixed(2);

    }

    /*Function that paint all selections from $order in wizard*/
    function paintFromOrderData(response) {
        /*Step1*/
        jQuery("div#step1 a[data-factor-value='" + response.sex + "'].buttonAction").click();
        jQuery("div#step1 a[data-factor-value='" + response.goal_plan + "'].buttonPlan").click();
        jQuery("div#step1 a[data-factor-value='" + response.meal_type + "'].buttonPlan").click();
        selections.order_id = response.order_id;


        /*Step2*/

        jQuery("div#step2 input#weight").val(response.weight);
        selections.weight = response.weight;
        jQuery("div#step2 input#height").val(response.height);
        selections.height = response.height;
        jQuery("div#step2 input#db").val(response.date_birth);
        selections.date_birth = response.date_birth;
        jQuery("div#step2 select#actLevel ").val(response.activity_level);

        $("div#step2 select#actLevel > option[value='" + response.activity_level + "']").attr('selected', 'selected');

        selections.activity_level = response.activity_level;
        jQuery("div#step2 input#bfp").val(response.body_fat_percentage);
        selections.body_fat_percentage = response.body_fat_percentage;

        if (response.goal_calories > 0) {

            if (response.macros_protein == 0 & response.macros_fat == 0 & response.macros_carbs == 0) {
                convertCaloriesMacro(response.goal_calories)
            }

            jQuery("div#step2 input#protein").val(response.macros_protein.toFixed(2));
            selections.macros_protein = response.macros_protein;
            jQuery("div#step2 input#carbs").val(response.macros_carbs.toFixed(2));
            selections.macros_carbs = response.macros_carbs;
            jQuery("div#step2 input#fat").val(response.macros_fat.toFixed(2));
            selections.macros_fat = response.macros_fat;
            jQuery("div#step2 input#totalMacros").val(response.goal_calories);
            selections.goal_calories = response.goal_calories;
            jQuery("#ikmacros").prop('checked', true);
        } else {
            jQuery("#ikmacros").prop('checked', false);
            jQuery("div#step2 div.macros").hide();
        }
        jQuery("div#step2 div.barButton a[data-resume-name='Diet Requirements']").click();

        /*Step3*/

        // jQuery("div#step3 a[data-factor-name='meals_day'][data-factor-value='" + response.meals_day + "'].buttonPlan").click();

        // if (!jQuery.isEmptyObject(response.extras)) {
        //     response.extras.forEach(function ($ext) {
        //         $('div#step3 div.containerExclusions').find("a[data-factor-name=extras][data-factor-value='" + $ext.id + "'].buttonAction").click();
        //
        //         // $(this).closest("div").find(".inputField").click();
        //         // jQuery("div#step3 a[data-factor-name=extras][data-factor-value='" + $ext.id + "'].buttonAction").click();
        //     });
        // }
        //
        // if (!jQuery.isEmptyObject(response.exclusions)) {
        //     response.exclusions.forEach(function ($excl) {
        //         $('div.containerExclusions').find("a[data-factor-name=exclusion][data-factor-value='" + $excl.id + "'].buttonAction").click();
        //         // jQuery("div#step3 a[data-factor-name=exclusion][data-factor-value='" + $excl.id + "'].buttonAction").click();
        //     });
        // }


    }
});
