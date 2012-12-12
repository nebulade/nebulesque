// Copyright (c) 2012 Johannes Zellner webmaster@nebulon.de - All Rights Reserved

"use strict";

/*
 **************************************************
 * Compiler
 **************************************************
 */
function Compiler () {}

/*
 * Take all tokens and compile it to real elements with properties and bindings
 */
Compiler.prototype.compile = function (tokens) {
    var property;
    var token_length = tokens.length;

    this._tokens = tokens;
    this._output = "";

    for (var i = 0; i < token_length; i += 1) {
        var token = this._tokens[i];

        if (token["TOKEN"] === "ELEMENT") {
            console.log("create type " + token["DATA"]);
        }

        if (token["TOKEN"] === "SCOPE_START") {
            console.log("start element description");
        }

        if (token["TOKEN"] === "SCOPE_END") {
            console.log("end element description");
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
                property = undefined;
            }
        }
    }

    return this._output;
}
