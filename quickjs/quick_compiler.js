// Copyright (c) 2012 Johannes Zellner webmaster@nebulon.de - All Rights Reserved

"use strict";

/*
 **************************************************
 * Compiler
 **************************************************
 */
function Compiler () {}

Compiler.prototype._addIndentation = function (additional) {
    var indentLevel = this._index + (additional ? additional : 0);

    for (var i = indentLevel; i; --i) {
        this._output += "    ";
    }
};

Compiler.prototype._renderBegin = function () {
    this._output += "(function() {\n";
};

Compiler.prototype._renderEnd = function () {
    this._addIndentation();
    // FIXME this should call initBindings only on the toplevel element
    this._output += "elem" + (this._index + 1) + ".initializeBindings();\n"
    this._output += "elem" + (this._index + 1) + ".render();\n"
    this._output += "}());\n";
};

Compiler.prototype._renderElement = function (name, id) {
    this._addIndentation();

    this._output += "var elem" + this._index + " = new " + name + "(";
    this._output += id ? "\"" + id + "\"" : "";
    this._output += ");\n";
};

Compiler.prototype._renderProperty = function (property, value) {
    // special case for ID
    if (property === "id") {
        return;
    }

    this._addIndentation();
    this._output += "elem" + this._index;
    this._output += ".addProperty(\"" + property + "\", ";
    this._output += "function () { \n";
    this._addIndentation(1);
    this._output += "return " + value + ";\n";
    this._addIndentation();
    this._output += "});\n"
};

/*
 * Take all tokens and compile it to real elements with properties and bindings
 */
Compiler.prototype.render = function (tokens) {
    var property;
    var token_length = tokens.length;

    this._tokens = tokens;
    this._output = "";          // render output, is Javascript which needs to be evaled or sourced
    this._index = 0;            // index used for tracking the current element variable

    this._renderBegin();

    for (var i = 0; i < token_length; i += 1) {
        var token = this._tokens[i];

        if (token["TOKEN"] === "ELEMENT") {
            console.log("create type " + token["DATA"]);
            var tmpId;

            // FIXME stupid and unsave id search
            for (var j = i; j < token_length; ++j) {
                var tmpToken = this._tokens[j];
                if (tmpToken["TOKEN"] === "EXPRESSION" && tmpToken["DATA"] === "id") {
                    tmpId = this._tokens[j+2]["DATA"];
                }
            }
            ++this._index;
            this._renderElement(token["DATA"], tmpId);
        }

        if (token["TOKEN"] === "SCOPE_START") {
            console.log("start element description");
        }
        if (token["TOKEN"] === "SCOPE_END") {
            console.log("end element description");
            --this._index;
        }

        if (token["TOKEN"] === "EXPRESSION") {
            if (!property) {
                var next_token = (i+1 < token_length) ? this._tokens[i+1] : undefined;
                if (next_token && next_token["TOKEN"] === "COLON") {
                    property = token["DATA"];
                    console.log("property found", property);
                    i += 1;
                    continue;
                } else {
                    this._compileError("no property to assign value");
                }
            } else {
                console.log("right-hand-side expression found for property", property, token["DATA"]);
                this._renderProperty(property, token["DATA"]);
                property = undefined;
            }
        }
    }

    this._renderEnd();

    return this._output;
}
