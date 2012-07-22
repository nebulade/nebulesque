
function Element (id) {
    this.id = id;
    this.elem = null; 
    this.x = 0;
    this.xAnimation = null;
}

Element.prototype = {
    _this : null,

    setX : function setX(x) {
        if (this.elem == null)
            this.setId(this.id);
        this.x = x;
        
        // check if we have an animation attached to x
        if (this.xAnimation)
            this.xAnimation.start();
        else
            this.elem.style.left = this.x;
    },

    setXAnimation : function setXAnimation(animation) {
        _this = this;
        this.xAnimation = animation;
        // TODO
        animation.callback = function(x) { _this.elem.style.left = x; }; 
    },

    setId : function setId(id) {
        this.id = id;
        _this = this;
        this.elem = document.getElementById(id);
    },
}

function NumberAnimation(callback, from, to, duration) {
    this.callback = callback;
    this.from = from;
    this.to = to;
    this.value = from;
    this.t;
    this.duration = duration ? duration : 250;
    this.distance = to - from;
    this.step = 16;
}

NumberAnimation.prototype = {
    advance : function advance() {
        if (this.value < this.to) {
            this.value += this.distance/(this.duration/this.step);
            this.callback(this.value);

            var closure = this.Bind(this.advance);
            window.setTimeout(closure, this.step);
        }
    },

    start : function start() {
        this.callback(this.from);
        this.advance();
    },

    Bind : function(method) {
        var _this = this;
        return (
                function() {
                    return (method.apply(_this, arguments));
                }
               );
    }
}
