
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
		default: return "";
	}
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
		
		if (this._c >= 'a' && this._c <= 'z')
			this._addToken("PROPERTY", this._parseProperty());
		
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
	
	var elem = undefined;
	var parent = root;
	var property = "";
	
	for (i = 0; i < this._tokens.length; ++i) {
		var token = this._tokens[i];
		
		if (token["TOKEN"] == "ELEMENT") {
			elem = document.createElement("div");
			elem.parent = parent;
			elem.type = token["DATA"];
                        
			this._addProperty(elem, "x", 0);
			this._addProperty(elem, "y", 0);
			this._addProperty(elem, "width", 0);
			this._addProperty(elem, "height", 0);
			this._addProperty(elem, "color", "");
			this._addProperty(elem, "source", "");
			this._addProperty(elem, "position", "absolute");
		}
		
		if (token["TOKEN"] == "SCOPE_START")
			parent = elem;
		
		if (token["TOKEN"] == "SCOPE_END") {
			parent = elem.parent;
			parent.appendChild(elem);
		}
		
		if (token["TOKEN"] == "PROPERTY")
			property = token["DATA"];
		
		if (token["TOKEN"] == "EXPRESSION") {
			if (!property)
				this._compileError("no property to assign value");
			else {
				// TODO make sure id is a proper one
				if (property == "id") 
					elem.id = token["DATA"];
				else {
					var value = "";
					
					// TODO only if we dont find a binding, we need to eval the expression here
					//      otherwise we evaluate it at the end of the compilation
					this._findAndAddBinding(token["DATA"], elem.id, property);
					
					try {
						value = eval(token["DATA"]);
					} catch (e) {
						this._compileError("error evaluating expression: " + token["DATA"], token["LINE"]);
					}
					
					elem[property] = value;
				}
				property = undefined;
			}
		}
	}
	
	root.style.visibility = "visible";
}

/* 
 * Adds a JML property with custom setter/getter to intercept access
 */
JMLParser.prototype._addProperty = function (elem, property, initialValue) 
{
	var tmp = initialValue;
	var parser = this;
	
	// set initial value, ignore the source exception for now
	// maybe replaced by a "internal_setter", that does not perform the tmp == val check
	elem.style[propertyNameToCSS(property)] = tmp;
	
	Object.defineProperty(elem, property, {
		get: function() { return tmp; },
		set: function(val) {
			if (tmp == val)
				return;
			
			tmp = val;
			// TODO find a better way
			if (property == "source")
				this.style[propertyNameToCSS(property)] = "url(" + tmp + ")";
			else
				this.style[propertyNameToCSS(property)] = tmp;
			
			parser._notifyPropertyChange(this.id + "." + property);
		}
	});
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
JMLParser.prototype._notifyPropertyChange = function (binding_id) 
{
// 	console.log("notification for binding " + binding_id);
	
	if (this._bindings[binding_id] == undefined)
		return;

// 	for (var i = 0; i < this._bindings[binding_id].length; ++i)

// 	console.log("new value of bound property: " + eval(binding_id));
// 	console.log("eval expr: |" + this._bindings[binding_id] + "|");
	
	var foo = this._bindings[binding_id] + ";";
	eval(foo);
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
JMLParser.prototype._findAndAddBinding = function (expr, elemId, property) 
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
	
	// builds up an id for the binding table
	var binding_id = "";
	for (i = 0; i < elems.length; ++i)
		binding_id += elems[i] + ".";
	binding_id += tmpProperty;
	
	if (!this._bindings[binding_id])
		this._bindings[binding_id] = [];
	
	var final_expr = elemId + "." + property + "=" + expr;
	
	this._bindings[binding_id][this._bindings[binding_id].length] = final_expr;
	console.log("Add binding: " + binding_id + " with expression " + final_expr);
	
	return true;
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