"use strict";

/* 
 * Convert JML property names to css names
 */
function propertyNameToCSS (name) 
{
	switch (name) {
		case "id"	: return "id";
		case "width"	: return "width";
		case "height"	: return "height";
		case "x"	: return "left";
		case "y"	: return "top";
		case "color"	: return "background-color";
		case "source"	: return "background-image";
		case "position" : return "position";
		case "opacity"  : return "opacity";
		default: return "";
	}
}

/*
 * Main JML HTML Item
 */
function Item (jml, parent)
{
	this.elem = document.createElement("div");
	this.id = undefined;
	this.jml = jml;
	
	this.parent = parent;
	this.type = "Item";
	
	jml.addProperty(this, "x", 0);
	jml.addProperty(this, "y", 0);
	jml.addProperty(this, "width", 0);
	jml.addProperty(this, "height", 0);
	jml.addProperty(this, "color", "");
	jml.addProperty(this, "position", "absolute");
	jml.addProperty(this, "opacity", 1);
	
	if (parent && parent.elem)
		parent.elem.appendChild(this.elem);
}

Item.prototype.setId = function (id)
{
	this.id = id;
	this.elem.id = id;
}

Item.prototype.delete = function ()
{
	this.parent.elem.removeChild(this.elem);
}

Item.prototype.setProperty = function (property, value)
{
	if (property == "onclick") {
		try {
			var func = eval("(function () {" + value + "})");
			this.elem.onclick = func;
		} catch (e) {
			console.log("compile error for onclick handler: " + e);
		}
	} else {
		this.elem.style[propertyNameToCSS(property)] = value;
	}
}
