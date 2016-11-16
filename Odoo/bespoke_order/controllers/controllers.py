# -*- coding: utf-8 -*-
from openerp import http
import openerp
import re
from openerp.http import request


#
class website_sale(openerp.addons.website_sale.controllers.main.website_sale):
    @http.route()
    def cart(self, **post):
        # Todo I need change this function is no good sorry the time is fast
        cr, uid, context, pool = request.cr, request.uid, request.context, request.registry
        order = request.website.sale_get_order()
        bki = None
        if order:
            from_currency = order.company_id.currency_id
            to_currency = order.pricelist_id.currency_id
            compute_currency = lambda price: pool['res.currency']._compute(cr, uid, from_currency, to_currency, price,
                                                                           context=context)
            bki = http.request.env['bespoke.kitchen_information'].search(
                [('active', '=', False), ('sale_order_id.id', '=', order.id)])

        else:
            compute_currency = lambda price: price

        values = {
            'website_sale_order': order,
            'compute_currency': compute_currency,
            'suggested_products': [],
            'bki': bki,
        }
        if order:
            _order = order
            if not context.get('pricelist'):
                _order = order.with_context(pricelist=order.pricelist_id.id)
            values['suggested_products'] = _order._cart_accessories()

        if post.get('type') == 'popover':
            return request.website.render("website_sale.cart_popover", values)

        if post.get('code_not_available'):
            values['code_not_available'] = post.get('code_not_available')

        return request.website.render("website_sale.cart", values)

    @http.route()
    def payment_confirmation(self, **post):
        request.session['post_email'] = None
        return super(website_sale, self).payment_confirmation(**post)

    def checkout_values(self, data=None):
        response = super(website_sale, self).checkout_values(data)

        post_email = request.session.get('post_email')
        if post_email:
            if 'checkout' in response:
                if 'shipping_zip':
                    response['checkout']['shipping_zip'] = post_email['postcode']
                else:
                    response['checkout']['zip'] = post_email['postcode']

                response['checkout']['email'] = post_email['email']

            response['email'] = post_email['email']
            response['zip'] = post_email['postcode']

        return response


class menus(http.Controller):
    @http.route('/Terms', auth='public', website=True)
    def term_condtions(self, **kw):
        return http.request.render('rebyc_strategies_theme.term_condtions')


class BespokeOrder(http.Controller):
    # Validate Post code
    @http.route('/bespoke_order/validate_post_code', auth='public', methods=['POST'], type='json',
                website=True)
    def validate_post_code(self, **post):
        status = True
        error_field = []
        if 'postcode' not in post:
            error_field.append('postcode')
            status = False

        if 'email_from' not in post:
            error_field.append('email_from')
            status = False

        if not status:
            return {'error_fields': error_field, 'status': status}

        postcodes = ["N6", "N19", "N4", "N16", "N7", "N5", "N1", "N1c", "Nw3", "Nw5", "Nw8", "Nw1", "E5", "E8", "E9",
                     "E3", "E2", "E1", "E1w", "Ec3", "Ec2", "Ec1", "Ec4", "Wc1", "Wc2", "W1", "W2", "W11", "W8", "W14",
                     "Sw5", "Sw7", "Sw10", "Sw3", "Sw1", "Sw11", "Sw8", "Se11", "Se17", "Se1", "W7", "W13", "W5", "W3",
                     "W4", "W12", "W10", "W9", "W6", "Sw14", "Sw13", "Sw6", "Nw6", "Nw10", "Nw2", "Nw11"]
        flag = False
        for x in postcodes:
            if ((post['postcode'].upper()).find(x.upper()) == 0):
                flag = True
                break

        if not flag:
            error_field.append('postcode')
            status = False

        # if not kwargs['phone'].isdigit():
        #     error_field.append('phone');
        #     status = False

        if not re.match("[^@]+@[^@]+\.[^@]+", post['email_from']):
            error_field.append('email_from');
            status = False

        if status:
            request.session['post_email'] = {'postcode': post['postcode'], 'email': post['email_from']}
        else:
            request.session['post_email'] = None

        return {'error_fields': error_field, 'status': status}

    @http.route('/bespoke_order/cart_add_update', auth='public', methods=['POST'], type='json',
                website=True)
    def cart_add_update(self, **post):
        try:
            select = post['selection']

            order = request.website.sale_get_order(force_create=1)

            contract_day = http.request.env['bespoke.contracts'].search([('id', '=', select['contract'])]).days
            add_qty = select['meals_day']
            price_contrato = 0
            if contract_day:
                if 'price_day' in select:
                    order._pay_contract_bespoke(qty=(float(select['price_day']) * int(contract_day)))
                    add_qty *= contract_day

            automatic_extras = self.automatic_extras(meal_type=select['meal_type'], goal_cal=select['goal_calories'])

            value = {}
            if 'contract' in select:
                order.type_contract(int(select['contract']))

            bki_obj = http.request.env['bespoke.kitchen_information']
            bki = bki_obj.search([('active', '=', False), ('sale_order_id', '=', order.id)])

            set_element_order = set(self.getListidObj(http.request.env['sale.order.line'].search(
                [('order_id', '=', order.id), ('is_product_diet', '=', True)]), is_product=False, change=False))

            set_automatic_extras_protein = set([])
            set_automatic_extras_fat = set([])

            flag_fat = False
            flag_protein = False
            if automatic_extras:
                if 'prod_protein_ext' in automatic_extras:
                    set_automatic_extras_protein = set(self.getListidObj(automatic_extras['prod_protein_ext']))
                    flag_protein = True

                if 'prod_fat_ext' in automatic_extras:
                    set_automatic_extras_fat = set(self.getListidObj(automatic_extras['prod_fat_ext']))
                    flag_fat = True

            set_extras = set(self.getListidLD(select['extras']))
            set_exclusions = set(self.getListidLD(select['exclusions']))
            all_prod_selct = set_extras | set_exclusions | set_automatic_extras_protein | set_automatic_extras_fat

            # Delete
            act = []
            for x in list(set_element_order.difference(all_prod_selct)):
                obj_line = http.request.env['sale.order.line'].search(
                    [('order_id', '=', order.id), ('product_id', '=', x), ('is_product_diet', '=', True)])
                if len(obj_line) > 0:
                    act.append((2, obj_line.id, False))
            if len(act) > 0:
                order.write({
                    'order_line': act
                })

            # Extras

            extras = []
            if len(select['extras']) > 0:
                # Update
                for x in list(set_element_order.intersection(set_extras)):
                    self.cart(order, product_id=x, set_qty=add_qty)

                # Add
                for x in list(set_extras.difference(set_element_order)):
                    linea = self.cart(order, product_id=x, add_qty=add_qty)
                    self.change_msg(linea['line_id'], 'Extra / ' + select['meal_type'])
                    extras.append((0, 0, {'product_id': x, 'product_uom_qty': add_qty}))

            # Exclusions

            exclusions = []
            if len(select['exclusions']) > 0:
                # Update
                for x in list(set_element_order.intersection(set_exclusions)):
                    linea = self.cart(order, product_id=x, set_qty=add_qty)
                    # self.change_price(linea['line_id'], 0.0)

                # Add
                for x in list(set_exclusions.difference(set_element_order)):
                    linea = self.cart(order, product_id=x, add_qty=add_qty)
                    self.change_msg(linea['line_id'], 'Exclusion / ' + select['meal_type'])
                    exclusions.append((0, 0, {'product_id': x, 'product_uom_qty': add_qty}))

            # Automatic Protein

            protein = []
            if flag_protein:
                if len(automatic_extras['prod_protein_ext']) > 0:
                    # Update
                    for x in list(set_element_order.intersection(set_automatic_extras_protein)):
                        self.cart(order, product_id=x, set_qty=add_qty * automatic_extras['protein'])

                    # Add
                    for x in list(set_automatic_extras_protein.difference(set_element_order)):
                        linea = self.cart(order, product_id=x, add_qty=add_qty * automatic_extras['protein'])
                        self.change_msg(linea['line_id'], 'Automatic Extra / ' + select['meal_type'])
                        extras.append(
                            (0, 0, {'product_id': x, 'product_uom_qty': add_qty * automatic_extras['protein']}))

            # Automatic FAT

            fat = []
            if flag_fat:
                if len(automatic_extras['prod_fat_ext']) > 0:
                    # Update
                    for x in list(set_element_order.intersection(set_automatic_extras_fat)):
                        self.cart(order, product_id=x, set_qty=add_qty * automatic_extras['fat'])

                    # Add
                    for x in list(set_automatic_extras_fat.difference(set_element_order)):
                        linea = self.cart(order, product_id=x, add_qty=add_qty * automatic_extras['fat'])
                        self.change_msg(linea['line_id'], 'Automatic Extra / ' + select['meal_type'])
                        extras.append((0, 0, {'product_id': x, 'product_uom_qty': add_qty * automatic_extras['fat']}))

            if select['qty_extra_pay'] != 0:
                order.pay_exclusion(select['qty_extra_pay'])

            pos = http.request.env['pos.category'].search([('name', '=', select['meal_type'])])
            body_fat_percentage = ""

            if 'body_fat_percentage' in select:
                body_fat_percentage = select['body_fat_percentage']

            k = {
                'type_plan_id': select['goal_plan'],
                'protein': select['macros_protein'],
                'carb': select['macros_carbs'],
                # 'tdee': select['tdee'],
                # 'bmr': select['bmr'],
                'fat': select['macros_fat'],
                'juice_cleanse': select['juice_cleanse'],
                'activity_level': select['activity_level'],
                'meal_type_id': pos.id,
                'exclusions_ids': exclusions,
                'extras_ids': extras + fat + protein,
                # 'goal_calories': select['goal_calories'],
                'meal_number_id': select['feed_day_id'],
                'dpw': select['meals_week'],
                'body_fat_percentage': body_fat_percentage,
                'delivery_day': select['meals_week'],
                'age': select['date_birth'],
                'gender': select['sex'],
                'weight': select['weight'],
                'height': select['height'],
            }

            if len(bki) == 1:
                bki.write(k)
            else:
                k['sale_order_id'] = order.id
                bki_obj.create(k)

            return value
        except:
            if request.httprequest.headers and request.httprequest.headers.get('Referer'):
                return request.redirect(str(request.httprequest.headers.get('Referer')))
            return request.redirect('/shop')

    def change_msg(self, linea, msg):
        http.request.env['sale.order.line'].search([('id', '=', linea)]).write({
            'msg_card': msg
        })

    # Function that make return all stats and recomended products
    @http.route('/bespoke_order/calculate_stats', auth='public', methods=['POST'], type='json',
                website=True)
    def calculate_stats(self, **post):

        result = {}

        age = int(post['date_birth'])

        body_fat_percentage = ''

        if 'body_fat_percentage' in post:
            body_fat_percentage = post['body_fat_percentage']

        if body_fat_percentage == '' or body_fat_percentage == '0':
            body_fat_percentage = 0
        else:
            body_fat_percentage = float(body_fat_percentage)

        bki = http.request.env['bespoke.kitchen_information']

        result['_bmr'] = bki.calc_bmr(body_fat_percentage, float(post['weight']), float(post['height']), post['sex'],
                                      age)
        result['_tdee'] = bki.calc_tdee(float(post['activity_level']), result['_bmr'])

        goal_calories = 0

        if post['goal_calories'] > 0 and (
                            post['macros_carbs'] > 0 or post['macros_protein'] > 0 or post['macros_fat'] > 0):
            goal_calories = post['goal_calories']

        result['_goal_calories'] = bki.getGoalCalories(float(goal_calories), str(post['goal_plan']),
                                                       result['_tdee'],
                                                       float(post['weight']))

        pos_category = http.request.env['pos.category'].search([('name', '=', post['meal_type'])])

        max = 0
        id = 0
        obj = http.request.env['bespoke.feeds_day']
        objs = obj.search([('pos_category_ids', 'in', pos_category.id)])
        if len(objs) > 0:
            for day in objs:
                if day.max > max:
                    max = day.max
                    id = day.id
                if day.min <= result['_goal_calories'] and day.max >= result['_goal_calories']:
                    id = day.id
                    break

            tmp = obj.search([('id', '=', id)])
            result['day'] = tmp.feeds_day
            result['price'] = tmp.pay_feeds_day
            result['feed_day_id'] = tmp.id
        else:
            result['day'] = False
            result['price'] = False

        products = http.request.env['product.template'].search(
            [('sale_ok', '=', True), ('pos_categ_id.parent_id', '=', False),
             ('pos_categ_id.name', '=', post['meal_type']), ('mxd', '=', result['day']),
             ('mxw', '=', int(post['meals_week']))])

        result['_products'] = self.getProductArray(products)

        result['_contract'] = self.getContractArray(self.getContract())

        return result

    # call ajax function get Extras , exclusions, max free extra
    @http.route('/bespoke_order/load_extras_exclusions', auth='public', website=True, type='json')
    def load_extras_exclusions(self, **kw):
        cr, uid, context, pool = request.cr, request.uid, request.context, request.registry
        product_obj = pool.get('product.template')
        extras_ids = product_obj.search(cr, uid, [('sale_ok', '=', True), ('pos_categ_id.name', '=', 'Extra'),
                                                  ('pos_categ_id.parent_id.name', '=', kw['cat'])], context=context)
        extras = product_obj.browse(cr, uid, extras_ids, context=context)

        exclusions_ids = product_obj.search(cr, uid, [('sale_ok', '=', True), ('pos_categ_id.name', '=', 'Exclusion'),
                                                      ('pos_categ_id.parent_id.name', '=', kw['cat'])], context=context)
        exclusions = product_obj.browse(cr, uid, exclusions_ids, context=context)

        max_free_extras = http.request.env['bespoke.free_exclusion'].search([('in_use', '=', True)])
        result = {}
        result['Extras'] = self.getProductArray(extras)
        result['Exclusions'] = self.getProductArray(exclusions)
        result['Max_Free_Extras'] = max_free_extras.max_free_exclusions
        result['Charge'] = max_free_extras.charge
        # $result = array('Extras' = > array(), 'Exclusions' = > array(), 'Max_Free_Extras' = > 0, 'Charge' = > 0);
        return result

    # Get kitchen information
    def get_bki(self, order, state=False):

        bki_obj = http.request.env['bespoke.kitchen_information']
        bki = bki_obj.search([('active', '=', state), ('sale_order_id', '=', order.id)])
        return bki

    # Function select order for wizard
    @http.route('/bespoke_order/data_wizard', auth='public', methods=['POST'], type='json', website=True)
    def data_wizard(self, **post):
        order = request.website.sale_get_order()
        if order:
            bki = self.get_bki(order)
            resp = self.getInformationKitchenArray(bki)
            resp['order_id'] = order.id
            return resp
        return ({})

    # Get type_plan and category for dthe view
    @http.route('/order_tool', auth='public', website=True)
    def order_tool(self, **kw):
        cr, uid, context, pool = request.cr, request.uid, request.context, request.registry

        post_email = request.session.get('post_email')
        if post_email:
            if request.session['post_email'] != None:
                pos_cate = pool.get('pos.category')
                pos_cate_ids = pos_cate.search(cr, uid, [('parent_id', '=', False), ('meal_type', '=', True),
                                                         ('name', 'not in', ['Automatic protein', 'Automatic fat'])],
                                               context=context)
                category = pos_cate.browse(cr, uid, pos_cate_ids, context=context)


                type_plan_obj = pool.get('bespoke.type_plan')
                type_plan_ids = type_plan_obj.search(cr, uid, [], context=context)
                type_plan = type_plan_obj.browse(cr, uid, type_plan_ids, context=context)


                return http.request.render('bespoke_order.order_templete', {
                    'type_plan': type_plan,
                    'category': category
                })

        return http.request.render('bespoke_order.order')

    # Get type_plan and category for dthe view
    @http.route('/order', auth='public', website=True)
    def order(self, **kw):
        post_email = request.session.get('post_email')
        if post_email:
            return request.redirect('/order_tool')
        else:
            return http.request.render('bespoke_order.order')

    # Convert  product object odoo to array
    def getInformationKitchenArray(self, bki):
        temp = {}

        # 'exclusions_ids': exclusions,
        # 'products_ids': products,
        # 'extras_ids': extras,

        for obj in bki:

            pos = http.request.env['pos.category'].search([('id', '=', obj.meal_type_id.id)])

            if len(pos) > 0:
                temp['meal_type'] = pos.name
            temp['goal_plan'] = obj.type_plan_id.id
            temp['sex'] = obj.gender
            temp['activity_level'] = obj.activity_level
            temp['meals_week'] = obj.delivery_day
            temp['juice_cleanse'] = obj.juice_cleanse
            temp['goal_calories'] = obj.goal_calories
            temp['body_fat_percentage'] = obj.body_fat_percentage
            temp['weight'] = obj.weight
            temp['height'] = obj.height
            temp['date_birth'] = obj.age
            temp['macros_carbs'] = obj.carb
            temp['macros_protein'] = obj.protein
            temp['macros_fat'] = obj.fat
            temp['extras'] = [{'id': x.product_id.product_tmpl_id.id} for x in obj.extras_ids]
            temp['exclusions'] = [{'id': x.product_id.product_tmpl_id.id} for x in obj.exclusions_ids]
            # temp['recomended_products'] = [{'id': x.product_id.product_tmpl_id.id} for x in obj.products_ids]

        return temp

    # Convert  product object odoo to array
    def getProductArray(self, products):
        salida = []
        for product in products:
            temp = {}
            temp['title'] = product.name
            temp['id'] = product.id
            # temp['regular_price'] = product.standard_price
            temp['sale_price'] = product.list_price
            temp['image'] = product.image_small
            temp['price'] = product.list_price
            temp['mpd'] = product.mxd
            salida.append(temp)
        return salida

    # Convert  contract object odoo to array
    def getContractArray(self, contracts):
        salida = []
        for contract in contracts:
            temp = {}
            temp['name'] = contract.name
            temp['id'] = contract.id
            temp['days'] = contract.days
            temp['discount_contract'] = contract.discount_contract
            temp['checked'] = contract.checked

            salida.append(temp)
        return salida

    # Function get contract active
    def getContract(self):
        cr, uid, context, pool = request.cr, request.uid, request.context, request.registry
        contract_obj = pool.get('bespoke.contracts')
        contract_ids = contract_obj.search(cr, uid, [('in_use', '=', True)], context=context)

        return contract_obj.browse(cr, uid, contract_ids, context=context)

    def delete_sale_order_line(self, product, order, is_product_diet=True):
        act = []
        for prod in product:
            # product_prod = http.request.env['product.product'].search([('product_tmpl_id', '=', prod.product_id.id)])
            for line in order.order_line:
                trash = line.search(
                    [('is_product_diet', '=', is_product_diet), ('product_id.id', '=', prod.product_id.id)])
                if len(trash) > 0:
                    act.append((2, trash.id, False))
                    break
        if len(act) > 0:
            order.write({
                'order_line': act
            })

    def getListidObj(self, objs, is_product=True, change=True):
        resp = []
        for obj in objs:
            if is_product and change:
                product_prod = http.request.env['product.product'].search([('product_tmpl_id', '=', obj.id)])
                resp.append(product_prod.id)
            else:
                resp.append(obj.product_id.id)
        return resp

    def getListidLD(self, select, is_product=True, change=True):
        resp = []
        for obj in select:
            if is_product and change:
                product_prod = http.request.env['product.product'].search([('product_tmpl_id', '=', obj['id'])])
                resp.append(product_prod.id)
            else:
                resp.append(obj['id'])
        return resp

    def cart(self, order, product_id, add_qty=0, set_qty=0):
        cr, uid, context = request.cr, request.uid, request.context
        # print context
        add_qty = float(add_qty)
        set_qty = float(set_qty)

        if order:
            return order._cart_update(product_id=int(product_id), add_qty=add_qty, set_qty=set_qty,
                                      is_product_diet=True)

    # Get Automatic Extras
    def automatic_extras(self, meal_type, goal_cal):
        cr, uid, context, pool = request.cr, request.uid, request.context, request.registry

        obj = http.request.env['bespoke.meal_type_cal']
        objs = obj.search([('pos_category_id.name', '=', meal_type)])
        need_extras = objs._need_extras(goal_cal)

        product_obj = pool.get('product.template')

        if not need_extras:
            return need_extras

        if 'protein' in need_extras:
            ids = product_obj.search(cr, uid,
                                     [('sale_ok', '=', True), ('pos_categ_id.name', '=', 'Automatic protein')],
                                     context=context)
            need_extras['prod_protein_ext'] = product_obj.browse(cr, uid, ids, context=context)

        if 'fat' in need_extras:
            ids = product_obj.search(cr, uid,
                                     [('sale_ok', '=', True), ('pos_categ_id.name', '=', 'Automatic fat')],
                                     context=context)

            need_extras['prod_fat_ext'] = product_obj.browse(cr, uid, ids, context=context)

        return need_extras
