// Copyright (c) 2012 Johannes Zellner webmaster@nebulon.de - All Rights Reserved

"use strict";

/*
 **************************************************
 * Globals
 **************************************************
 */
var QuickJS = QuickJS || {};
QuickJS.tokenizer = new Tokenizer();
QuickJS.utils = new Utils();
QuickJS.parser = new Parser();
QuickJS.engine = new Engine();

/*
 **************************************************
 * Utils
 **************************************************
 */
function Utils () {}

/* 
 * check if character is actual an alphanumeric one
*/
Utils.prototype.isAlphaNumeric = function (c) {
	return ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9'));
}

/*
 **************************************************
 * Tokenizer
 **************************************************
 */
function Tokenizer () {}

/* 
 * Parse the input string and create tokens
 */
Tokenizer.prototype.parse = function (input) {
	this._exp = input;
	this._i = -1;
	this._line = 1;
	this._tokens = [];
	this._c = undefined;//this._exp[this._i];
	this._bindings = [];
	this._colonOnLine = false;
	this._comment = false;
	
	while (this._advance()) {
		if (this._comment && this._c !== '\n')
			continue;
		
		// check for one line comments
		if (this._c === '/' && this._exp[this._i+1] === '/') {
			this._comment = true;
			continue;
		}
		
		if (this._c === '\n') {
			this._comment = false;
			this._colonOnLine = false;
			++this._line;
			continue;
		}
		
		// check for element name
		if (this._c >= 'A' && this._c <= 'Z') {
			this._addToken("ELEMENT", this._parseElementName());
			continue;
		}
		
		if (this._c >= 'a' && this._c <= 'z') {
			var tmp = this._parseFunction();
			if (tmp.isFunction) {
				this._addToken("FUNCTION", tmp.content);
				continue;
			}
		}
		
		if ((this._c >= 'a' && this._c <= 'z') || (this._c >= '0' && this._c <= '9') || this._c === '"' || this._c === '\'' || this._c === '(') {
			this._addToken("EXPRESSION", this._parseExpression());
			continue;
		}
		
		if (this._c === '{') {
			this._addToken("SCOPE_START");
			continue;
		}
		
		if (this._c === '}') {
			this._addToken("SCOPE_END");
			continue;
		}
		
		if (this._c === ':') {
			this._colonOnLine = true;
			this._addToken("COLON");
			continue;
		}
		
		if (this._c === ';') {
			this._colonOnLine = false;
			this._addToken("SEMICOLON");
			continue;
		}
	}
	
	return this._tokens;
}

/* 
 * add a found token to the token table
 */
Tokenizer.prototype._addToken = function (type, data) {
	this._tokens.push( {"TOKEN" : type, "DATA" : data, "LINE" : this._line} );
}

/* 
 * extract an element name
 */
Tokenizer.prototype._parseElementName = function () {
	var token = "";
	
	while (this._c) {
		if ((this._c >= 'A' && this._c <= 'Z') || (this._c >= 'a' && this._c <= 'z'))
			token += this._c;
		else
			break;
		
		this._advance();
	}
	
	return token;
}

/* 
 * extract a function
 */
Tokenizer.prototype._parseFunction = function () {
	var i_save = this._i;
	var token = "";
	var scope = 0;
	var ret = {};
	ret.isFunction = false;
	ret.content = "";
	
	while (this._c) {
		if (token === "function ") 
			ret.isFunction = true;
		
		if (ret.isFunction) {
			if (this._c === '{') {
				scope += 1;
			} else if (this._c === '}') {
				scope -= 1;
				if (!scope) {
					// consume last } and advance tokenizer before returning;
					token += this._c;
					this._advance();
					ret.content = token;
					return ret;
				}
			}
			token += this._c;
		} else {
			if (QuickJS.utils.isAlphaNumeric(this._c) || this._c === ' ')
				token += this._c;
			else
				break;
		}
		
		this._advance();
	}
	
	// no function found so restore 
	this._i = i_save-1;
	this._advance();
	
	return ret;
}

/* 
 * extract an expression, can be a property definition, function or right side expression after :
 */
Tokenizer.prototype._parseExpression = function () {
	var expression = "";
	
	while (this._c) {
		if (this._c === '\n' || this._c === ';') {
			this._i -= 1;
			break;
		}
		
		// only break if this is the first colon in that line
		if (!this._colonOnLine && this._c === ':') {
			this._i -= 1;
			break;
		}
		
		// ignore whitespace
		if ((this._c !== '\t' && this._c !== ' ') || expression === "function")
			expression += this._c;
		
		this._advance();
	}
	
	return expression;
}

/* 
 * Print all found tokens on the console 
 */
Tokenizer.prototype.dumpTokens = function () {
	for (var i = 0; i < this._tokens.length; ++i)
		console.log("TOKEN: " + this._tokens[i]["TOKEN"] + " " + (this._tokens[i]["DATA"] ? this._tokens[i]["DATA"] : ""));
}

/* 
 * Convenience function to advance the current tokenizer character
 */
Tokenizer.prototype._advance = function () {
	this._c = this._exp[++this._i];
	return (this._c);
}









/*
 **************************************************
 * Parser
 **************************************************
 */
function Parser () {}

/* 
 * Take all tokens and compile them to a object tree and return the root
 */
Parser.prototype.parse = function (tokens) {
	this._i = 0;
	this._line = 1;
	this._tokens = tokens;
	
	var element = undefined;
	var parent = {};
	// magic root type
	parent.type = "root";
	parent.children = [];
	var property = "";
	
	// just cache the token count
	var token_length = this._tokens.length;
	
	for (var i = 0; i < token_length; i += 1) {
		var token = this._tokens[i];
		
		if (token["TOKEN"] === "ELEMENT") {
			var next_token = (i+1 < token_length) ? this._tokens[i+1] : undefined;
			if (next_token && next_token["TOKEN"] === "COLON") {
				console.log("new type found: " + token["DATA"]);
				i += 1;
				continue;
			} else {
// 				console.log("create type " + token["DATA"]);
				element = {};
				element.type = token["DATA"];
				element.parent = parent;
				element.children = [];
				parent.children[parent.children.length] = element;
			}
		}
		
		if (token["TOKEN"] === "SCOPE_START") {
// 			console.log("scope start, old parent " + parent.type + " new parent " + element.type);
			element.parent = parent;
			parent = element;
		}
		
		if (token["TOKEN"] === "SCOPE_END") {
// 			console.log("scope end, old parent " + parent.type + " new parent " + element.parent.type);
			parent = element.parent;
			element = element.parent;
		}
		
		if (token["TOKEN"] === "EXPRESSION") {
			if (!property) {
				var next_token = (i+1 < token_length) ? this._tokens[i+1] : undefined;
				if (next_token && next_token["TOKEN"] === "COLON") {
					property = token["DATA"];
					i += 1;
					continue;
				} else {
					this._compileError("no property to assign value");
				}
			} else {
				element[property] = token["DATA"];
				property = undefined;
			}
		}
		
		if (token["TOKEN"] === "FUNCTION")
			console.log("hit a funcion, not implemented yet: " + token["DATA"]);
	}
	
	return parent;
}






/*
 **************************************************
 * Engine
 **************************************************
 */
function Engine () {}

Engine.prototype.createElements = function (object_tree, root_element) {
	if (object_tree === undefined || object_tree.type === undefined || object_tree.type !== "root") {
		console.log("not a valid object tree...first element must be of type 'root'");
		return;
	}
	
	if (root_element.children === undefined)
		root_element.children = [];
	
	if (object_tree.type === "root") {
		for (var i = 0; i < object_tree.children.length; ++i) {
			root_element.children[root_element.children.length] = this._createElementsTreeFromObjectTree(object_tree.children[i], root_element);
		}
	} else {
		this._createElementsTreeFromObjectTree(object_tree, root_element);
	}
}

Engine.prototype._createElementsTreeFromObjectTree = function (object_tree, parent) {
	// TODO use actual uuids if no id is specified
	if (object_tree.id === undefined)
		object_tree.id = "Item"+Math.random();
	
// 	console.dir(object_tree);
	
	var element = this.createElement(object_tree.type, object_tree.id, parent);
	
	if (element.children === undefined)
		element.children = [];
	
	for (var property in object_tree) {
		if (!object_tree.hasOwnProperty(property))
			continue;
		if (property === "id" || property === "parent" || property === "children" || property === "type")
			continue;
		
		if (element[property] === undefined)
			this.addProperty(element, property, object_tree[property]);
		else
			element[property] = object_tree[property];
	}
	
	for (var i = 0; i < object_tree.children.length; ++i) {
		element.children[element.children.length] = this._createElementsTreeFromObjectTree(object_tree.children[i], element);
	}
	
	return element;
}

Engine.prototype._evalValuesFromElementTree = function (element) {
	if (element === undefined)
		return;
	
	console.log("eval inital values for element '" + element.id + "'");
	
	this._evalInitialValuesAndDetectPotentialBindings(element);
	
	// eval initial value assigned
	for (var i = 0; i < element.children.length; ++i) {
		this._evalValuesFromElementTree(element.children[i]);
	}
}

Engine.prototype._evalInitialValuesAndDetectPotentialBindings = function (element) {
	for (var property in element) {
		if (!element.hasOwnProperty(property))
			continue;
		if (property === "id" || property === "parent" || property === "children" || property === "type")
			continue;
		
		console.log("eval for property: '" + property + "'");
		
		try {
			var func = eval("(function() { " + element[property] + "})");
			var value = func.call(element);
			element[property] = value;
		} catch (e) {
			console.log("cannot eval expression '" + element[property] + "' maybe a binding");
		}
	}
}

Engine.prototype.createElement = function (type, id, parent) {
	console.log("create element: '" + id + "' with type '" + type + "'");
	
	// TODO namespace window??
	var element = new window[type];
	element.setId(id);
	element.setParent(parent);
	
	return element;
}

Engine.prototype.addProperty = function (element, property, value) {
	if (element === undefined || property === undefined)
		return;
	
	var _value = value;
	var _this = this;
	var _property = property;
	var _element = element;
	
	console.log("add property '" + property + "' to '" + element.id + "' with value '" + value + "'");
	
	// call custom value setter for the initial value
	if (window[_element.type].prototype.setProperty !== undefined)
		window[_element.type].prototype.setProperty.call(_element, _property, _value);
	
	Object.defineProperty(_element, _property, {
		get: function() { return _value; },
		set: function(val) {
			if (_value == val)
				return;
			_value = val;
			
			// call custom value setter
			if (window[_element.type].prototype.setProperty !== undefined)
				window[_element.type].prototype.setProperty.call(_element, _property, _value);
			
// 			_this._notifyPropertyChange(_element, _property);
			console.log("set property " + _property + " to value " + _value);
		}
	});
}
