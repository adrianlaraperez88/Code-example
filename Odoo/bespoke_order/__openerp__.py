# -*- coding: utf-8 -*-
{
    'name': "bespoke_order",

    'summary': """
        Short (1 phrase/line) summary of the module's purpose, used as
        subtitle on modules listing or apps.openerp.com""",

    'description': """
        Long description of module's purpose
    """,

    'author': "My Company",
    'website': "http://www.yourcompany.com",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/master/openerp/addons/base/module/module_data.xml
    # for the full list
    'category': 'Uncategorized',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': ['web', 'website', 'bespoke', 'point_of_sale', 'website_sale'],

    # always loaded
	#'update_xml': [
    #    'views/bespoke_order_menu_templete.xml',
    #    'views/bespoke_order.xml',
    #    'security/ir.model.access.csv',
    #],

    'data': [
    #    'views/bespoke_order_menu_templete.xml',
        'views/bespoke_order.xml',
        'security/ir.model.access.csv',
    ],
    # only loaded in demonstration mode
    # 'demo': [
    #     'demo/demo.xml',
    # ],
}
