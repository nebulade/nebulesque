
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
	
	this._advance();
	
	while (this._c) {
		// check for element name
		if (this._c >= 'A' && this._c <= 'Z')
			this._addToken("ELEMENT", this._parseElementName());
		
		if (this._c >= '0' && this._c <= '9')
			this._addToken("NUMBER", this._parseNumber());
		
		if (this._c == '{')
			this._addToken("SCOPE_START");
		
		if (this._c == '}')
			this._addToken("SCOPE_END");
		
		if (this._c == ':')
			this._addToken("COLON");
		
		if (this._c == ';')
			this._addToken("SEMICOLON");
		
		if (this._c == '+')
			this._addToken("PLUS");
		
		if (this._c == '-')
			this._addToken("MINUS");
		
		if (this._c == '"') {
			var string = this._parseString();
			
			if (this._c == '"')
				this._addToken("STRING", string);
			else
				this._error("Missing closing '\"'");
		}
		
		if (this._c == '\n')
			++this._line;
	
		this._advance();
	}
	
	
}

JMLParser.prototype._advance = function () {
	this._c = this._exp[++this._i];
}

JMLParser.prototype._addToken = function (type, data) {
	this._tokens.push( {"TOKEN" : type, "DATA" : data} );
}

JMLParser.prototype._error = function (message) {
	console.log("Syntax error on line " + this._line + ": " + message);
}

JMLParser.prototype.dumpTokens = function () {
	for (i = 0; i < this._tokens.length; ++i)
		console.log("TOKEN: " + this._tokens[i]["TOKEN"] + " " + (this._tokens[i]["DATA"] ? this._tokens[i]["DATA"] : ""));
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
