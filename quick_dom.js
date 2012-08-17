// Copyright (c) 2012 Johannes Zellner webmaster@nebulon.de - All Rights Reserved

"use strict";

/* 
 * Convert JML property names to css names
 */
function propertyNameToCSS (name) {
	switch (name) {
		case "x"	: return "left";
		case "y"	: return "top";
		case "color"	: return "background-color";
		case "source"	: return "background-image";
		default: return name;
	}
}

/*
 * Main JML HTML Item
 */
function Item () {
	this.elem = document.createElement("div");
	this.id = undefined;
	
	this.type = "Item";
	
	QuickJS.engine.addProperty(this, "x", 0);
	QuickJS.engine.addProperty(this, "y", 0);
	QuickJS.engine.addProperty(this, "width", 0);
	QuickJS.engine.addProperty(this, "height", 0);
	QuickJS.engine.addProperty(this, "position", "absolute");
	QuickJS.engine.addProperty(this, "opacity", 1);
}

Item.prototype.setParent = function (parent) {
	if (parent === undefined)
		return;
	
	this.parent = parent;
// 	console.log("setParent " + parent.id);
	
	if (parent.elem)
		parent.elem.appendChild(this.elem);
	else
		parent.appendChild(this.elem);
}

Item.prototype.setId = function (id) {
	this.id = id;
	this.elem.id = id;
}

Item.prototype.delete = function ()
{
	this.parent.elem.removeChild(this.elem);
}

Item.prototype.setProperty = function (property, value) {
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


// Basic MouseArea element
function MouseArea () {
	QuickJS.engine.addProperty(this, "containsMouse", false);
	QuickJS.engine.addProperty(this, "pressed", false);
	QuickJS.engine.addProperty(this, "changed", false);
	
	var _this = this;
	this.elem.onmouseover = function () { _this.containsMouse = true; _this.changed = !_this.changed; };
	this.elem.onmouseout = function () { _this.containsMouse = false; _this.changed = !_this.changed; };
	this.elem.onmousedown = function () { _this.pressed = true; _this.changed = !_this.changed; };
	this.elem.onmouseup = function () { _this.pressed = false; _this.changed = !_this.changed; };
}
MouseArea.prototype = new Item;

MouseArea.prototype.setProperty = function (property, value) {
//	console.log("Mousearea set property " + property);
	if (property === "x" || property === "y" || property === "width" || property === "height" ) {
		this.elem.style[propertyNameToCSS(property)] = value;
	} else {
		this.elem[property] = value;
	}
}

