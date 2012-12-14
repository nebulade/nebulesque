// Copyright (c) 2012 Johannes Zellner webmaster@nebulon.de - All Rights Reserved

"use strict";

/*
 **************************************************
 * Compiler
 **************************************************
 */

if (!Quick) {
    var Quick = {};
}

Quick.Compiler = (function () {
    var compiler = {};
    var output;
    var index;

    function addIndentation (additional) {
        var indentLevel = index + (additional ? additional : 0);

        for (var i = indentLevel; i; --i) {
            output += "    ";
        }
    };

    function renderBegin () {
        output += "(function() {\n";
    };

    function renderEnd () {
        addIndentation();
        // FIXME this should call initBindings only on the toplevel element
        output += "elem" + (index + 1) + ".initializeBindings();\n"
        output += "elem" + (index + 1) + ".render();\n"
        output += "}());\n";
    };

    function renderElement (name, id) {
        addIndentation();

        output += "var elem" + index + " = new " + name + "(";
        output += id ? "\"" + id + "\"" : "";
        output += ");\n";
    };

    function renderProperty (property, value) {
        // special case for ID
        if (property === "id") {
            return;
        }

        addIndentation();
        output += "elem" + index;
        output += ".addProperty(\"" + property + "\", ";
        output += "function () { \n";
        addIndentation(1);
        output += "return " + value + ";\n";
        addIndentation();
        output += "});\n"
    };

    /*
     * Take all tokens and compile it to real elements with properties and bindings
     */
    compiler.render = function (tokens) {
        var property;
        var token_length = tokens.length;
        var tokens = tokens;

        output = "";          // render output, is Javascript which needs to be evaled or sourced
        index = 0;            // index used for tracking the current element variable

        renderBegin();

        for (var i = 0; i < token_length; i += 1) {
            var token = tokens[i];

            if (token["TOKEN"] === "ELEMENT") {
                console.log("create type " + token["DATA"]);
                var tmpId;

                // FIXME stupid and unsave id search
                for (var j = i; j < token_length; ++j) {
                    var tmpToken = tokens[j];
                    if (tmpToken["TOKEN"] === "EXPRESSION" && tmpToken["DATA"] === "id") {
                        tmpId = tokens[j+2]["DATA"];
                    }
                }
                ++index;
                renderElement(token["DATA"], tmpId);
            }

            if (token["TOKEN"] === "SCOPE_START") {
                console.log("start element description");
            }
            if (token["TOKEN"] === "SCOPE_END") {
                console.log("end element description");
                --index;
            }

            if (token["TOKEN"] === "EXPRESSION") {
                if (!property) {
                    var next_token = (i+1 < token_length) ? tokens[i+1] : undefined;
                    if (next_token && next_token["TOKEN"] === "COLON") {
                        property = token["DATA"];
                        console.log("property found", property);
                        i += 1;
                        continue;
                    } else {
                        compileError("no property to assign value");
                    }
                } else {
                    console.log("right-hand-side expression found for property", property, token["DATA"]);
                    renderProperty(property, token["DATA"]);
                    property = undefined;
                }
            }
        }

        renderEnd();

        return output;
    }

    return compiler;
}());