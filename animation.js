// Copyright (c) 2012 Johannes Zellner webmaster@nebulon.de - All Rights Reserved

function NumberAnimation(element, property, from, to, duration, loops) {
	this.element = element;
	this.property = property;
	this.from = parseFloat(from);
	this.to = parseFloat(to);
	this.reverse = this.to > this.from ? false : true;
	this.value = this.from;
	this.duration = duration ? parseInt(duration) : 250;
	this.distance = this.reverse ? this.from - this.to : this.to - this.from;
	this.step = 16;
        this.loops = loops;
        this.stop_requested = false;
}

NumberAnimation.prototype = {
	advance : function advance() {
		var _this = this;
                
                if (this.reverse) {
			if (this.value <= this.to) {
                                if (this.loops === -1) {
                                        this.value = this.from;
                                        window.setTimeout(function () { _this.start(); }, this.step);
                                }
				return;
                        }
			this.value -= this.distance/(this.duration/this.step) * 1.0;
		} else { 
			if (this.value >= this.to) {
                                if (this.loops === -1){
                                        this.value = this.from;
                                        window.setTimeout(function () { _this.start(); }, this.step);
                                }
				return;
                        }
			this.value += this.distance/(this.duration/this.step) * 1.0;
		}
		
		this.element[this.property] = this.value;
		
                if (!this.stop_requested)
                        window.setTimeout(function () { _this.advance(); }, this.step);
	},
	
	start : function start() {
                this.stop_requested = false;
		this.element[this.property] = this.value;
		this.advance();
	},
        
        stop : function stop() {
                this.stop_requested = true;
        }
}
