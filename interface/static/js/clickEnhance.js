var clickHandler = function(elem) {
	this.elem = elem;
	this.init();
};

clickHandler.prototype.init = function() {
	this.elem.addEventListener("click", this.handleClick.bind(this));

	const poll = this.elem.attributes["data-poll"];
	if (poll && poll.value) {
		this.timeout = setInterval(this.pollEvent.bind(this), poll.value);
	}
};

clickHandler.prototype.pollEvent = function() {
	this.handleClick(null);
};

clickHandler.prototype.handleClick = function(event) {
	if (event) {
		event.preventDefault();
		event.stopPropagation();
		event.cancelBubble = true;
	}

	//load the response
	const href = this.elem.attributes["href"];
	window.axios.get(`${location.pathname}${href.value}`, {
		withCredentials : true
	}).then((response) => {
		this.handleResponse(response);
	});

	return false;
};

clickHandler.prototype.handleResponse = function(response) {
	if (response.request && response.request.responseURL && location.href !== response.request.responseURL) {
		//need to rewrite the location
		history.pushState({}, '', response.request.responseURL);
	}

	var newMap = createDOMMap(stringToHTML(response.data));
	var domMap = createDOMMap(document.querySelector("html"));
	diff(newMap[1].children, domMap, document.querySelector("html"));

	enhanceForms();
	enhanceLinks();
};

var enhanceLinks = function() {
	var elems = document.querySelectorAll("a[href^=\"?event\"], area[href^=\"?event\"]");
	var handlers = [];
	for (var i = 0; i < elems.length; i++) {
		if (!elems[i].attributes["_clickEnhanced"]) {
			elems[i].attributes["_clickEnhanced"] = 1;
			handlers.push(new clickHandler(elems[i]));
		}
	}
};

document.addEventListener("DOMContentLoaded", function() {
	enhanceLinks();
});