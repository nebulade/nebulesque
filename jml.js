
function propertyNameToCSS (name) {
	switch (name) {
		case "id"	: return "id";
		case "width"	: return "width";
		case "height"	: return "height";
		case "x"	: return "left";
		case "y"	: return "top";
		case "color"	: return "background-color";
		case "source"	: return "background-image";
		default: return "";
	}
}

function JMLParser () {
	this._c = '';
	this._exp = '';
	this._i = 0;
	this._line = 1;
	this._tokens = [];
}

JMLParser.prototype.parse = function (jml) {
	this._exp = jml;
	this._i = 0;
	this._line = 1;
	this._tokens = [];
	this._c = this._exp[this._i];
	
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
			this._advance();
			// we found a colon so everything until \n or ; is an expression
			var expression = this._parseExpression();
			console.log("EXP: " + expression);
			this._addToken("EXPRESSION", expression);
		}
		
		// not allowed here
// 		if (this._c == '+')
// 			this._addToken("PLUS");
// 		
// 		if (this._c == '-')
// 			this._addToken("MINUS");
// 		
// 		if (this._c >= '0' && this._c <= '9')
// 			this._addToken("NUMBER", this._parseNumber());
// 		
// 		if (this._c == '"') {
// 			var string = this._parseString();
// 			
// 			if (this._c == '"')
// 				this._addToken("STRING", string);
// 			else
// 				this._error("Missing closing '\"'");
// 		}
				
		if (this._c == ';')
			this._addToken("SEMICOLON");

		if (this._c == '\n')
			++this._line;
	
		this._advance();
	}
	
	
}

JMLParser.prototype.dumpTokens = function () {
	for (i = 0; i < this._tokens.length; ++i)
		console.log("TOKEN: " + this._tokens[i]["TOKEN"] + " " + (this._tokens[i]["DATA"] ? this._tokens[i]["DATA"] : ""));
}

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
			elem.style.position = "absolute";
			elem.parent = parent;
			elem.type = token["DATA"];
                        
			this._addProperty(elem, "x", 0);
			this._addProperty(elem, "y", 0);
			this._addProperty(elem, "width", 0);
			this._addProperty(elem, "height", 0);
			
// 			if (elem.type == "Image") {
// 				var img = document.createElement("img");
// 				elem.appendChild(img);
// 			}
		}
		
		if (token["TOKEN"] == "SCOPE_START")
			parent = elem;
		
		if (token["TOKEN"] == "SCOPE_END") {
			parent = elem.parent;
			parent.appendChild(elem);
		}
		
		if (token["TOKEN"] == "PROPERTY")
			property = propertyNameToCSS(token["DATA"]);
		
		if (token["TOKEN"] == "EXPRESSION") {
			if (!property)
				this._compileError("no property to assign value");
			else {
				// TODO make sure id is a proper one
				if (property == "id") 
					elem.id = token["DATA"];
				else {
					var value = "";
					
					try {
						value = eval(token["DATA"]);
					} catch (e) {
						this._compileError("error evaluating expression: " + token["DATA"], token["LINE"]);
					}
					
					if (property == "background-image")
						elem.style[property] = "url(" + value + ")";
					else
						elem.style[property] = value;
				}
				property = undefined;
			}
		}
	}
	
	root.style.visibility = "visible";
}

JMLParser.prototype._addProperty = function (elem, property, value) {
	// TODO scope of tmp???
	var tmp = value;
	Object.defineProperty(elem, property, {
		get: function() { return tmp; },
		set: function(val) { tmp = val; this.style[propertyNameToCSS(property)] = tmp; }
	});
}

JMLParser.prototype._advance = function () {
	this._c = this._exp[++this._i];
}

JMLParser.prototype._addToken = function (type, data) {
	this._tokens.push( {"TOKEN" : type, "DATA" : data, "LINE" : this._line} );
}

JMLParser.prototype._error = function (message) {
	console.log("Syntax error on line " + this._line + ": " + message);
}

JMLParser.prototype._compileError = function (message, l) {
	console.log("Compile error on line " + l + ": " + message);
}

JMLParser.prototype._parseElementName = function () {
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

JMLParser.prototype._parseProperty = function () {
	var token = "";
	
	while (this._c) {
		if ((this._c >= 'A' && this._c <= 'Z') || (this._c >= 'a' && this._c <= 'z') || (this._c >= '0' && this._c <= '9'))
			token += this._c;
		else
			break;
		
		this._advance();
	}
	
	return token;
}

JMLParser.prototype._parseString = function () {
	var token = "";
	
	if (this._c == '"')
		this._advance();
	
	while (this._c) {
		if (this._c != '"' && this._c != '\n')
			token += this._c;
		else
			break;
		
		this._advance();
	}
	
	return token;
}

JMLParser.prototype._parseNumber = function () {
	var number = 0;
	
	while (this._c) {
		if (this._c >= '0' && this._c <= '9') {
			number *= 10;
			number += parseInt(this._c);
		} else {
			break;
		}
		
		this._advance();
	}
	
	return number;
}

JMLParser.prototype._parseExpression = function () {
	var expression = "";
	
	while (this._c) {
		if (this._c == '\n' || this._c == ';')
			break;
		
		// ignore whitespace
		if (this._c != '\t' && this._c != ' ')
			expression += this._c;
		
		this._advance();
	}
	
	return expression;
}