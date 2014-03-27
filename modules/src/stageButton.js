function init(url, col, row, meta, width, height) {

	var id = MKON.FNC.randomString(5)	
	var req = [''];


	// register a new module
	var mod = new MKON.module('STAGE', 'Button', id, req,

	function() {   

		// var t = $('#'+this.id);

		// var d = MKON.CONTENT.getVariable(req[1]);	

		// if (d == 'True') {
		// 	t.find('.button').removeClass('gray');
		
		// } else {
		// 	t.find('.button').addClass('gray');
	
		// }
	
	} );

	// content for insertion to gridster
	var content =   '<li id="' + id + '" data-row="1" data-col="1" data-link="' + url + '" data-sizex="1" data-sizey="1">\
					<div class="options"><div class="remove"><i class="fa fa-times"></i></div></div>\
					<div class="content blank"><a class="button lightText large square stage" data-defaultClass="stage">S</a></div></li>';

	content = { html: content, x: 1, y: 1, col: col, row: row };

	MKON.CONTENT.addModule(mod, content);

	MKON.CONTENT.addHook(id, 'space', function() { MKON.COMMS.command(com[0]); });
	// 
	// updateAPIString();
}