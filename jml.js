// Copyright (c) 2012 Johannes Zellner webmaster@nebulon.de - All Rights Reserved

"use strict";

/*
 **************************************************
 * Globals
 **************************************************
 */
var QuickJS = QuickJS || {};
QuickJS.jml = new Compiler();
QuickJS.utils = new Utils();

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
 * Compiler
 **************************************************
 */
function Compiler () {
	this._c = '';
	this._exp = '';
	this._i = 0;
	this._line = 1;
	this._tokens = [];
	// bindings table ["binding id" -> objectID.objectID.property][expression]
	this._bindings = [];
	this._elements = [];
}

Compiler.prototype.addFunction = function (type, expression) {
	if (expression == "")
		return;

	var name = expression.slice("function ".length, expression.indexOf('('));
	var func;

	try {
		func = eval("(" + expression.replace(name, "") + ")");
		window[type].prototype[name] = func;
	} catch (e) {
		this._compileError("cannot create member function " + name);
	}
}

Compiler.prototype.addProperty = function (element, property, initialValue) {
	var _value = initialValue;
	var _this = this;
	var _property = property;
	var _element = element;

	if (window[_element.type].prototype.setProperty !== undefined)
		window[_element.type].prototype.setProperty.call(_element, _property, _value);

	Object.defineProperty(_element, _property, {
		get: function() { return _value; },
		set: function(val) {
			if (_value == val)
				return;
			_value = val;
			if (window[_element.type].prototype.setProperty !== undefined)
				window[_element.type].prototype.setProperty.call(_element, _property, _value);
			_this._notifyPropertyChange(_element, _property);

// 			console.log("set property " + _property + " to value " + _value);
			      }
	});
}

Compiler.prototype.getElementById = function (id) {
	return this._elements[id];
}

/*
 * Print all elements on the console
 */
Compiler.prototype.dumpElements = function () {
	for (var element_id in this._elements)
		console.dir(this._elements[element_id]);
}

/*
 * Take all tokens and compile it to real elements with properties and bindings
 */
Compiler.prototype.compile = function (content, root) {
	if (!root) {
		console.log("Please specify a JML root element");
		return;
	}

	var tokenizer = new Tokenizer();
	this._tokens = tokenizer.parse(content);
// 	tokenizer.dumpTokens();

	root.style.visibility = "hidden";

// 	var elements = [];
	var element = undefined;
	var parent = {"elem": root};
	var property = "";
	var token_length = this._tokens.length;

	parent.children = [];

	for (var i = 0; i < token_length; i += 1) {
		var token = this._tokens[i];

		if (token["TOKEN"] === "ELEMENT") {
			var next_token = (i+1 < token_length) ? this._tokens[i+1] : undefined;
			if (next_token && next_token["TOKEN"] === "COLON") {
// 				console.log("new type found: " + token["DATA"]);
				i += 1;
				continue;
			} else {
// 				console.log("create type " + token["DATA"]);
// 				element = new window[token["DATA"]] ();
				element = {};
				element.type = token["DATA"];
				element.parent = parent;
				element.children = [];
				parent.children[parent.children.length] = element;
			}
		}

		if (token["TOKEN"] === "SCOPE_START") {
// 			elements.push(element);
			element.parent = parent;
			parent = element;
		}

		if (token["TOKEN"] === "SCOPE_END") {
// 			element = elements.pop();
			parent = element.parent;
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
				// TODO make sure id is a proper one
				element[property] = token["DATA"];
// 				if (property === "id") {
// 					var id = token["DATA"];
						this._compileError("error id " + id + " already used.", token["LINE"]);
// 						this._compileError("error id " + id + " already used.", token["LINE"]);
// 					this._elements[id] = element;
// 					if (window[element.type].prototype.setId)
// 						window[element.type].prototype.setId.call(element, id);
// 					element.id = id;
// 				} else {

//
// 					this._evalExpression(token["DATA"], element, property);
//
//
// 					TODO only if we dont find a binding, we need to eval the expression here
// 					     otherwise we evaluate it at the end of the compilation
// 					if (this._findAndAddBinding(token["DATA"], element, property) === false) {
// 						try {
// 							value = eval(token["DATA"]);
// 						} catch (e) {
// 							this._compileError("error evaluating expression: " + token["DATA"], token["LINE"]);
// 						}

// 						if (element[property] === undefined)
// 							this.addProperty(element, property, value);
// 						else
// 							element[property] = value;
// 					}
// 				}
				property = undefined;
			}
		}

		if (token["TOKEN"] === "FUNCTION")
			this.addFunction(element.type, token["DATA"]);
	}

	// create the actual elements such as the dom elements for example
	this._createElements(parent);

	// attach all objects which are in scope of each element
	this._attachObjectsInScope(parent);

	// run all bindings once
	for (var element_id in this._bindings) {
		var element = this._bindings[element_id];
		for (property in element) {
			for (var i = 0; i < element[property].length; ++i) {
				var binding = this._bindings[element_id][property][i];
				//binding[0][binding[1]] = binding[2].call(binding[0]);
			}
		}
	}

	root.style.visibility = "visible";
}

Compiler.prototype._createElements = function (element) {
	for (var i = 0; i < element.children.length; ++i) {
		var child = element.children[i];
		var elem = new window[child.type]();

		for (var property in child) {
			if (!child.hasOwnProperty(property))
				continue;
			if (property === "parent" || property === "children" || property === "type")
				continue;

			if (elem[property] === undefined)
				this.addProperty(elem, property, undefined);

			this._evalExpression(child[property], elem, property);
		}

		this._createElements (child);
		elem.setParent(element);

		console.dir(elem);
	}
}

Compiler.prototype._attachObjectsInScope = function (element) {
//	console.log("attach objects for: " + element.id);

	// add parents
	var elem = element;
	while(elem.parent !== undefined && elem.parent.id !== undefined) {
//		console.log("attach parent " + elem.parent.id + " for: " + element.id);
		element[elem.parent.id] = elem.parent;
		elem = elem.parent;
	}

	// add siblings
	for (var i = 0; i < element.children.length; ++i) {
		for (var j = 0; j < element.children.length; ++j) {
			if (element.children[j] === element.children[i])
				continue;

			element.children[i][element.children[j].id] = element.children[j];
		}
		Compiler.prototype._attachObjectsInScope(element.children[i]);
	}
}

/*
 * clears internal objects
 *  TODO: check if elements are not referenced anymore?
 */
Compiler.prototype.clear = function () {
	for (var element_id in this._elements) {
		console.log(element_id);
		var element = this._elements[element_id];
		if (window[element.type].prototype.delete)
			window[element.type].prototype.delete.call(element);
	}

	this._elements = [];
}

/*
 * Slot to handle a property change and evaluate the associated bindings
 *  TODO: there might be multiple bindings to the property
 */
Compiler.prototype._notifyPropertyChange = function (elem, property) {
// 	console.log("notification for binding " + elem.id + " property " + property);

	if (this._bindings[elem.id] == undefined)
		return;

	if (this._bindings[elem.id][property] == undefined)
		return;

	// run over all assigned bindings
	for (var i = 0; i < this._bindings[elem.id][property].length; ++i) {
		var binding = this._bindings[elem.id][property][i];
                binding[0][binding[1]] = binding[2].call(elem);
		// console.log("eval expr: |" + binding[2] + "|");
	}
}

/*
 * print syntax error
 */
Compiler.prototype._syntaxError = function (message) {
	console.log("Syntax error on line " + this._line + ": " + message);
}

/*
 * print compile error
 */
Compiler.prototype._compileError = function (message, l) {
	console.log("Compile error on line " + l + ": " + message);
}

Compiler.prototype._evalExpression = function (expr, elem, property) {
	try {
		var final_expr = expr.replace(/\$/g, "this.");

		console.log("expression to evaluate is: " + final_expr);

		var func = eval("(function() { " + final_expr + "})");
		var value = func.call(elem);
		elem[property] = value;
	} catch (e) {
		this._compileError("error evaluating expression: " + expr);
	}
}

/*
 * Find a binding in a expression token
 *  TODO: This currently only handles single bindings without complex expressions
 */
Compiler.prototype._findAndAddBinding = function (expr, elem, property) {
	if (expr.length == 0)
		return false;

	if (expr[0] == '"' || (expr[0] >= '0' && expr[0] <= '9'))
		return false;

	// extract object ids and property name
	var elems = [];
	var tmpProperty = "";
	for (var i = 0; i < expr.length; ++i) {
		if (expr[i] == '.' ) {
			elems[elems.length] = tmpProperty;
			tmpProperty = "";
		} else if (QuickJS.utils.isAlphaNumeric(expr[i])) {
			tmpProperty += expr[i];
		} else {
            if (tmpProperty != "")
                break
		}
	}

	// FIXME: only able to resolve the first found id
	var object_id = "";
	if (elems.length === 0)
		object_id = elem.id;
	else
		object_id = elems[0];

	if (!this._bindings[object_id])
		this._bindings[object_id] = [];

	if (!this._bindings[object_id][tmpProperty])
		this._bindings[object_id][tmpProperty] = [];

	//var final_expr = expr.replace(elems[0], "QuickJS.jml.getElementById(\""+elems[0]+"\")");
	var final_expr = expr.replace(/\$/g, "this.");

	console.log("Add binding: " + elem.id + "." + property + " with expression " + final_expr + " binding count " + this._bindings[object_id][tmpProperty].length);

	try {
		//var func = eval("(function() { var tmp = "+final_expr+"; return tmp; })");
		var func = eval("(function() { " + final_expr + "})");

		var tmp_binding = [elem, property, func];
		this._bindings[object_id][tmpProperty][this._bindings[object_id][tmpProperty].length] = tmp_binding;
	} catch (e) {
		console.log("cannot create function pointer for binding" + e);
	}

	return true;
}
