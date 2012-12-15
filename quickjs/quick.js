// Copyright (c) 2012 Johannes Zellner webmaster@nebulon.de - All Rights Reserved

"use strict";

/*
 **************************************************
 * Singleton engine
 **************************************************
 *
 * Handles mainly toplevel elements and detects bindings.
 * This should contain as less as possible!
 *
 */

 if (!Quick) {
    var Quick = {};
 }

// create main singleton object
if (!Quick.Engine) {
    Quick.Engine = (function () {
        function Engine() {
            this.magicBindingState = false;
            this.getterCalled = [];
            this.toplevelElements = [];

            // try to create a renderer backend, currently on DOM supported
            var renderer;
            try {
                renderer = new QuickRendererDOM();
            } catch (e) {
                console.log("Cannot create DOM renderer")    ;
            }

            // if we have a renderer, setup hooks for elements
            if (renderer) {
                this.createElement = renderer.createElement;
                this.addElement = renderer.addElement;
                this.renderElement = renderer.renderElement;
            } else {
                this.createElement = function() {};
                this.addElement = function() {};
                this.renderElement = function() {};
            }
        };

        // begin binding detection
        Engine.prototype.enterMagicBindingState = function () {
            this.getterCalled = [];
            this.magicBindingState = true;
        };

        // end binding detection
        Engine.prototype.exitMagicBindingState = function () {
            this.magicBindingState = false;
            return this.getterCalled;
        };

        // make sure we get a handle of toplevel elements
        // non toplevel elements are tracked by parent/child
        Engine.prototype.addTopLevelElement = function (elem) {
            this.toplevelElements[elem.id] = elem;
        };

        // getter for toplevel elements by id
        Engine.prototype.getTopLevelElement = function (id) {
            return this.toplevelElements[id];
        };

        return new Engine();
    }());
}


/*
 **************************************************
 * Basic Element
 **************************************************
 *
 * The main element, which handles its connections
 * and properties. It also calls into the renderer
 * by using render hooks.
 *
 */
function Element (id, parent) {
    this.id = id;
    this.element = Quick.Engine.createElement('item');
    this.parent = parent;

    this.properties = [];
    this.connections = {};
    this.children = [];

    if (this.parent) {
        this[this.parent.id] = this.parent;
        this.parent.addChild(this);
    } else {
        Quick.Engine.addTopLevelElement(this);
    }

    Quick.Engine.addElement(this, parent);
};

Element.prototype.addChild = function (child) {
    // console.log("addChild", child.id, "to", this.id);

    // add child to all children scope and vice versa
    for (var i in this.children) {
        this.children[i][child.id] = child;
        child[this.children[i].id] = this.children[i];
    }

    // adds child id to the namespace
    this[child.id] = child;

    this.children[this.children.length] = child;
    console.log(this.children);
}

Element.prototype.render = function () {
    // console.log("render()");

    Quick.Engine.renderElement(this);

    for (var child in this.children) {
        // console.log("render child", this.children[child]);
        this.children[child].render();
    }
};

Element.prototype.addChanged = function (signal, callback) {
    if (!(signal in this.connections)) {
        this.connections[signal] = [];
    }

    this.connections[signal][this.connections[signal].length] = callback;
};

Element.prototype.addBinding = function (name, value) {
    // console.log("addBinding", name);

    var that = this;
    var hasBinding = false;

    Quick.Engine.enterMagicBindingState();
    var val = value.apply(this);
    console.log("addBinding result", name, val);
    var getters = Quick.Engine.exitMagicBindingState();

    for (var getter in getters) {
        hasBinding = true;
        console.log("binding found", getters[getter]);
        var tmp = getters[getter];
        tmp.element.addChanged(tmp.property, function() {
            that[name] = value.apply(that);
        });
    }

    return hasBinding;
};

Element.prototype.addProperty = function (name, value) {
    var that = this;
    var valueStore;

    // register property
    this.properties[this.properties.length] = { name: name, value: value };

    Object.defineProperty(this, name, {
        get: function() {
            // console.log("getter: ", that.id, name);
            if (Quick.Engine.magicBindingState) {
                Quick.Engine.getterCalled[that.id + '.' + name] = { element: that, property: name };
            }

            if (typeof valueStore === 'function')
                return valueStore.apply(that);
            else
                return valueStore;
        },
        set: function(val) {
            // console.log("setter: ", that.id, name, val);
            if (valueStore === val)
                return;

            valueStore = val;

            // connections are called like the properties
            that.emit(name);
        }
    });
};

// initial set of all properties and binding evaluation
// should only be called once
Element.prototype.initializeBindings = function () {
    for (var i in this.properties) {
        var name = this. properties[i].name;
        var value = this.properties[i].value;

        console.log("Element.initializeBindings()", name, value);

        // initial set and binding discovery
        if (typeof value === 'function') {
            if (this.addBinding(name, value)) {
                // console.log("addProperty:", this.id, name, "binding found, so add function pointer");
                this[name] = value;
            } else {
                // console.log("addProperty:", this.id, name, "no binding, so add as simple value");
                this[name] = value.apply(this);
            }
        } else {
            // console.log("addProperty:", this.id, name, "simple value passed in");
            this[name] = value;
        }
    }

    for (var child in this.children) {
        this.children[child].initializeBindings();
    }
};

Element.prototype.emit = function (signal) {
    if (signal in this.connections) {
        // console.log("signal has connections", signal);
        for (var slot in this.connections[signal]) {
            // console.log("### execute slot");
            this.connections[signal][slot]();
        }
    }
};
