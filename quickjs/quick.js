
function Quick() {
    this.magicBindingState = false;
    this.getterCalled = [];
};

Quick.prototype.enterMagicBindingState = function () {
    this.getterCalled = [];
    this.magicBindingState = true;
};

Quick.prototype.exitMagicBindingState = function () {
    this.magicBindingState = false;

    for (var getter in this.getterCalled) {
        console.log("getter", this.getterCalled[getter], "called");
    }

    return this.getterCalled;
};

var quick = new Quick();

function Element (id, element, parent) {
    this.id = id;
    this.element = element;
    this.parent = parent;

    this.properties = [];
    this.connections = {};
    this.children = [];

    if (this.parent) {
        this.parent.addChild(this);
    }
};

Element.prototype.addChild = function (child) {
    console.log("addChild", child.id, "to", this.id);
    this.children[this.children.length] = child;
    console.log(this.children);

    // adds child id to the namespace
    this[child.id] = child;

    // add child to all children scope and vice versa
    for (var i in this.children) {
        this.children[i][child.id] = child;
        child[this.children[i].id] = this.children[i];
    }
}

Element.prototype.render = function () {
    console.log("render()");

    if (this.element) {
        for (p in this.properties) {
            var property = this.properties[p];
            console.log("update property", property, this[property], this.element.style[property]);
            this.element.style[property] = this[property];
        }
    }

    for (var child in this.children) {
        console.log("render child", this.children[child]);
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
    console.log("addBinding", name);

    var that = this;

    quick.enterMagicBindingState();
    this[name] = value();
    var getters = quick.exitMagicBindingState();

    for (var getter in getters) {
        console.log("binding found", getters[getter]);
        var tmp = getters[getter];
        tmp.element.addChanged(tmp.property, function() {
            that[name] = value();
        });
    }
};

Element.prototype.addProperty = function (name, value) {
    var that = this;
    var valueStore;

    // register property
    this.properties[this.properties.length] = name;

    Object.defineProperty(this, name, {
        get: function() {
            console.log("getter: ", that.id, name);
            if (quick.magicBindingState) {
                console.log("######")
                quick.getterCalled[that.id + '.' + name] = { element: that, property: name };
            }

            if (typeof valueStore === 'function')
                return valueStore();
            else
                return valueStore;
        },
        set: function(val) {
            console.log("setter: ", that.id, name, val);
            if (valueStore === val)
                return;

            valueStore = val;

            // connections are called like the properties
            that.emit(name);
        }
    });

    // initial set
    this.addBinding(name, function() { return eval("(function() { return value; }).apply(scope.elem1)"); });
};

Element.prototype.emit = function (signal) {
    if (signal in this.connections) {
        console.log("signal has connections", signal);
        for (var slot in this.connections[signal]) {
            console.log("### execute slot");
            this.connections[signal][slot]();
        }
    }
};
