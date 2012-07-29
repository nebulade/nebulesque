
var jml = new JMLParser();

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
function Item (parser, parent)
{
	this.parser = parser;
	this.elem = document.createElement("div");
	this.id = undefined;
	
	this.parent = parent;
	this.type = "Item";
	
	this.addProperty("x", 0);
	this.addProperty("y", 0);
	this.addProperty("width", 0);
	this.addProperty("height", 0);
	this.addProperty("color", "");
	this.addProperty("source", "");
	this.addProperty("position", "absolute");
	this.addProperty("opacity", 1);
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

Item.prototype.addProperty = function (property, initialValue) 
{
	var tmp = initialValue;
	
	// set initial value, ignore the source exception for now
	// maybe replaced by a "internal_setter", that does not perform the tmp == val check
	this.elem.style[propertyNameToCSS(property)] = tmp;
	
	Object.defineProperty(this, property, {
		get: function() { return tmp; },
		set: function(val) {
			if (tmp == val)
				return;
			
			tmp = val;
			// TODO find a better way
			if (property == "source")
				this.elem.style[propertyNameToCSS(property)] = "url(" + tmp + ")";
			else
				this.elem.style[propertyNameToCSS(property)] = tmp;
			
// 			console.log("notify property change: " + this.id + "." + property);
			this.parser._notifyPropertyChange(this, property);
		}
	});
}

Item.prototype.addFunction = function (expression)
{
	if (expression == "")
		return;
	
	var i = 0;
	var c = expression[i];
	var name = "";
	
	while (c) {
		if (c == '(')
			break;
		
		if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||  (c >= '0' && c <= '9'))
			name += c;
		
		c = expression[++i];
	}
	
	console.log("add function: " + name + "\n" + expression);
	
	var func = eval("(function " + expression.replace(name, "") + ")");
	Object.defineProperty(this, name, {value : func});
}

/* 
 * JMLParser constructor
 */
function JMLParser () 
{
	this._c = '';
	this._exp = '';
	this._i = 0;
	this._line = 1;
	this._tokens = [];
	// bindings table ["binding id" -> objectID.objectID.property][expression]
	this._bindings = [];
	this._elements = [];
}

JMLParser.prototype.getElementById = function (id)
{
	return this._elements[id];
}

/* 
 * Parse the input string and create tokens
 */
JMLParser.prototype.parse = function (jml) 
{
	this._exp = jml;
	this._i = 0;
	this._line = 1;
	this._tokens = [];
	this._c = this._exp[this._i];
	this._bindings = [];
	
	while (this._c) {
		// check for element name
		if (this._c >= 'A' && this._c <= 'Z')
			this._addToken("ELEMENT", this._parseElementName());
		
		if (this._c >= 'a' && this._c <= 'z') {
			var tmp = this._parseProperty();
			if (tmp == "function")
				this._addToken("FUNCTION", this._parseFunction());
			else
				this._addToken("PROPERTY", tmp);
		}
		
		if (this._c == '{')
			this._addToken("SCOPE_START");
		
		if (this._c == '}')
			this._addToken("SCOPE_END");
		
		if (this._c == ':') {
			this._addToken("COLON");
			this._tokenizerAdvance();
			// we found a colon so everything until \n or ; is an expression
			this._addToken("EXPRESSION", this._parseExpression());
		}
		
		if (this._c == '#')
			this._addToken("TYPE");
		
		if (this._c == ';')
			this._addToken("SEMICOLON");

		if (this._c == '\n')
			++this._line;
	
		this._tokenizerAdvance();
	}
	
	
}

/* 
 * Print all found tokens on the console 
 */
JMLParser.prototype.dumpTokens = function () 
{
	for (i = 0; i < this._tokens.length; ++i)
		console.log("TOKEN: " + this._tokens[i]["TOKEN"] + " " + (this._tokens[i]["DATA"] ? this._tokens[i]["DATA"] : ""));
}

/* 
 * Take all tokens and compile it to real elements with properties and bindings
 *  TODO cannot handle nested elements...very easy to add I just didn't bother
 */
JMLParser.prototype.compile = function (root) {
	if (!root) {
		console.log("Please specify a JML root element");
		return;
	}
	
	root.style.visibility = "hidden";
	
	var elements = [];
	var element = undefined;
	var parent = {"elem": root};
	var property = "";
	
	for (i = 0; i < this._tokens.length; ++i) {
		var token = this._tokens[i];
		
		if (token["TOKEN"] == "ELEMENT")
			element = new Item (this, parent.elem);
		
		if (token["TOKEN"] == "SCOPE_START") {
			elements.push(element);
			element.parent = parent;
			parent = element;
		}
		
		if (token["TOKEN"] == "SCOPE_END") {
			element = elements.pop();
			parent = element.parent;
			parent.elem.appendChild(element.elem);
		}
		
		if (token["TOKEN"] == "PROPERTY")
			property = token["DATA"];
		
		if (token["TOKEN"] == "EXPRESSION") {
			if (!property)
				this._compileError("no property to assign value");
			else {
				// TODO make sure id is a proper one
				if (property == "id") {
					var id = token["DATA"];
					if (this._elements[id])
						this._compileError("error id " + id + " already used.", token["LINE"]); 
					this._elements[id] = element;
					element.setId(id);
				} else {
					var value = "";
					
					// TODO only if we dont find a binding, we need to eval the expression here
					//      otherwise we evaluate it at the end of the compilation
					if (this._findAndAddBinding(token["DATA"], element, property) === false) {
						try {
							value = eval(token["DATA"]);
						} catch (e) {
							this._compileError("error evaluating expression: " + token["DATA"], token["LINE"]);
						}
						
						if (element[property] === undefined)
							element.addProperty(property, value);
						else
							element[property] = value;
					}
				}
				property = undefined;
			}
		}
		
		if (token["TOKEN"] == "FUNCTION")
			element.addFunction(token["DATA"]);
	}
	
	// run all bindings once
	for (element_id in this._bindings) {
		var element = this._bindings[element_id];
		for (property in element) {
			for (var i = 0; i < element[property].length; ++i) {
				var binding = this._bindings[element_id][property][i];
				try {
					binding[0][binding[1]] = eval(binding[2]);
				} catch (e) {
					this._compileError("error evaluating binding expression: " + e, -1);
				}
			}
		}
	}
	
	root.style.visibility = "visible";
}

/* 
 * clears internal objects
 *  TODO: check if elements are not referenced anymore?
 */
JMLParser.prototype.clear = function ()
{
	for (element in this._elements)
		this._elements[element].delete();

	this._elements = [];
}

/* 
 * Tokenizer: Convenience function to advance the current tokenizer character
 */
JMLParser.prototype._tokenizerAdvance = function () 
{
	this._c = this._exp[++this._i];
}

/* 
 * Slot to handle a property change and evaluate the associated bindings
 *  TODO: there might be multiple bindings to the property
 */
JMLParser.prototype._notifyPropertyChange = function (elem, property) 
{
// 	console.log("notification for binding " + elem.id + " property " + property);
	
	if (this._bindings[elem.id] == undefined)
		return;

	if (this._bindings[elem.id][property] == undefined)
		return;
	
	// run over all assigned bindings
	for (var i = 0; i < this._bindings[elem.id][property].length; ++i) {
		var binding = this._bindings[elem.id][property][i];
		binding[0][binding[1]] = eval(binding[2]);
		// console.log("eval expr: |" + binding[2] + "|");
	}
}

/* 
 * Tokenizer: add a found token to the token table
 */
JMLParser.prototype._addToken = function (type, data) 
{
	this._tokens.push( {"TOKEN" : type, "DATA" : data, "LINE" : this._line} );
}

/* 
 * Tokenizer: check if character is actual an alphanumeric one
 */
JMLParser.prototype._checkAlphaNumberic = function (c)
{
	return ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9'));
}

/* 
 * print syntax error
 */
JMLParser.prototype._syntaxError = function (message) 
{
	console.log("Syntax error on line " + this._line + ": " + message);
}

/* 
 * print compile error
 */
JMLParser.prototype._compileError = function (message, l) 
{
	console.log("Compile error on line " + l + ": " + message);
}

/* 
 * Find a binding in a expression token 
 *  TODO: This currently only handles single bindings without complex expressions
 */
JMLParser.prototype._findAndAddBinding = function (expr, elem, property) 
{
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
		} else if (this._checkAlphaNumberic(expr[i])) {
			tmpProperty += expr[i];
		} else {
			break;
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
	
	var final_expr = expr.replace(elems[0], "jml.getElementById(\""+elems[0]+"\")");
	
	var tmp_binding = [elem, property, final_expr];
	this._bindings[object_id][tmpProperty][this._bindings[object_id][tmpProperty].length] = tmp_binding;
	
// 	console.log("Add binding: " + elem.id + "." + property + " with expression " + final_expr + " binding count " + this._bindings[object_id][tmpProperty].length);
	
	return true;
}

JMLParser.prototype._parseFunction = function ()
{
	var value = "";
	
	while (this._c) {
		value += this._c;
		
		if (this._c == '}') {
			this._tokenizerAdvance();
			break;
		}
		
		this._tokenizerAdvance();
	}
	
	return value;
}

/* 
 * Tokenizer: extract an element name
 */
JMLParser.prototype._parseElementName = function () 
{
	var token = "";
	
	while (this._c) {
		if ((this._c >= 'A' && this._c <= 'Z') || (this._c >= 'a' && this._c <= 'z'))
			token += this._c;
		else
			break;
		
		this._tokenizerAdvance();
	}
	
	return token;
}

/* 
 * Tokenizer: extract a property name
 */
JMLParser.prototype._parseProperty = function () 
{
	var token = "";
	
	while (this._c) {
		if (this._checkAlphaNumberic(this._c))
			token += this._c;
		else
			break;
		
		this._tokenizerAdvance();
	}
	
	return token;
}

/* 
 * Tokenizer: extract a string based on double quotes
 *  TODO: handle single quotes?
 */
JMLParser.prototype._parseString = function () 
{
	var token = "";
	
	if (this._c == '"')
		this._tokenizerAdvance();
	
	while (this._c) {
		if (this._c != '"' && this._c != '\n')
			token += this._c;
		else
			break;
		
		this._tokenizerAdvance();
	}
	
	return token;
}

/* 
 * Tokenizer: extract a Number
 *  TODO: handle doubles, negative and such
 */
JMLParser.prototype._parseNumber = function () 
{
	var number = 0;
	
	while (this._c) {
		if (this._c >= '0' && this._c <= '9') {
			number *= 10;
			number += parseInt(this._c);
		} else {
			break;
		}
		
		this._tokenizerAdvance();
	}
	
	return number;
}

/* 
 * Tokenizer: extract an right side expression, called after COLON token found
 */
JMLParser.prototype._parseExpression = function () 
{
	var expression = "";
	
	while (this._c) {
		if (this._c == '\n' || this._c == ';')
			break;
		
		// ignore whitespace
		if (this._c != '\t' && this._c != ' ')
			expression += this._c;
		
		this._tokenizerAdvance();
	}
	
	return expression;
}