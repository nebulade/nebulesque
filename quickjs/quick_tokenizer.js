// Copyright (c) 2012 Johannes Zellner webmaster@nebulon.de - All Rights Reserved

"use strict";

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
 * Convenience function to advance the current tokenizer character
 */
Tokenizer.prototype._advance = function () {
    this._c = this._exp[++this._i];
    return (this._c);
}

/*
 * Print all found tokens on the console
 */
Tokenizer.prototype.dumpTokens = function () {
    for (var i = 0; i < this._tokens.length; ++i)
        console.log("TOKEN: " + this._tokens[i]["TOKEN"] + " " + (this._tokens[i]["DATA"] ? this._tokens[i]["DATA"] : ""));
}