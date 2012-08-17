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
function Parser () {
	this._i = 0;
	this._line = 1;
	this._tokens = [];
}

/* 
 * Take all tokens and compile them to a object tree and return the root
 */
Parser.prototype.parse = function (tokens) {
	this._i = 0;
	this._line = 1;
	this._tokens = tokens;
	
	var element = undefined;
	var parent = {};
	var property = "";
	
	// just cache the token count
	var token_length = this._tokens.length;

	parent.children = [];
	
	for (var i = 0; i < token_length; i += 1) {
		var token = this._tokens[i];
		
		if (token["TOKEN"] === "ELEMENT") {
			var next_token = (i+1 < token_length) ? this._tokens[i+1] : undefined;
			if (next_token && next_token["TOKEN"] === "COLON") {
				console.log("new type found: " + token["DATA"]);
				i += 1;
				continue;
			} else {
				console.log("create type " + token["DATA"]);
				element = {};
				element.type = token["DATA"];
				element.parent = parent;
				element.children = [];
				parent.children[parent.children.length] = element;
			}
		}
		
		if (token["TOKEN"] === "SCOPE_START") {
			element.parent = parent;
			parent = element;
		}
		
		if (token["TOKEN"] === "SCOPE_END") {
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
				element[property] = token["DATA"];
				property = undefined;
			}
		}
		
		if (token["TOKEN"] === "FUNCTION")
			console.log("hit a funcion, not implemented yet: " + token["DATA"]);
	}
	
	return parent;
}
