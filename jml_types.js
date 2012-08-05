// Copyright (c) 2012 Johannes Zellner webmaster@nebulon.de - All Rights Reserved

"use strict";

/* 
 * Convert JML property names to css names
 */
function propertyNameToCSS (name) 
{
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
function Item ()
{
	this.elem = document.createElement("div");
	this.id = undefined;
	
	this.type = "Item";
	
	QuickJS.jml.addProperty(this, "x", 0);
	QuickJS.jml.addProperty(this, "y", 0);
	QuickJS.jml.addProperty(this, "width", 0);
	QuickJS.jml.addProperty(this, "height", 0);
	QuickJS.jml.addProperty(this, "position", "absolute");
	QuickJS.jml.addProperty(this, "opacity", 1);
}

Item.prototype.setParent = function (parent)
{
	this.parent = parent;
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

// Basic Rectangle element
function Rectangle ()
{
	QuickJS.jml.addProperty(this, "color", "white");
	QuickJS.jml.addProperty(this, "border-color", "black");
	QuickJS.jml.addProperty(this, "border-width", "1");
	QuickJS.jml.addProperty(this, "border-style", "solid");
}
Rectangle.prototype = new Item;


// Basic Text element
function Text ()
{
	this.textElem = document.createTextNode("No Text");
	this.elem.appendChild(this.textElem);
	
	QuickJS.jml.addProperty(this, "color", "white");
	QuickJS.jml.addProperty(this, "text", "");
}
Text.prototype = new Item;

Text.prototype.setProperty = function (property, value)
{
	if (property === "color") {
		this.elem.style["text-color"] = value;
	} else if (property === "text") {
		console.log("setText " + value + " old value " + this.textElem.data);
		this.textElem.data = value;
	} else {
		this.elem.style[propertyNameToCSS(property)] = value;
	}
}

// Basic MouseArea element
function MouseArea ()
{
	QuickJS.jml.addProperty(this, "containsMouse", false);
	QuickJS.jml.addProperty(this, "onMouseOver", function() { this.containsMouse = true; });
	QuickJS.jml.addProperty(this, "onMouseOut", function() { this.containsMouse = false; });
}
MouseArea.prototype = new Item;
