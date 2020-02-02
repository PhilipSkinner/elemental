const _websitesEditorController = function(page) {
	this._page = page;
	this.website = {};
	this.routes = [];
	this.tags = [];
	this.mainVisible = true;
	this.viewEditorVisible = false;
	this.controllerEditorVisible = false;
	this.resources = {};

	this.editor = null;
};

_websitesEditorController.prototype.getData = function() {
	return {
		website 				: this.website,
		routes 					: this.routes,
		tags 					: this.tags,
		mainVisible 			: this.mainVisible,
		viewEditorVisible 		: this.viewEditorVisible,
		controllerEditorVisible : this.controllerEditorVisible,
		showAlert 				: false,
	};
};

_websitesEditorController.prototype.initEditor = function(elem, type, value) {
	//set our editor up
	this.editor = ace.edit(document.getElementById(elem), {
		mode : 'ace/mode/' + type,
		selectionStyle : 'text'
	});
	this.editor.commands.addCommand({
		name : 'save',
		bindKey : {
			win: "Ctrl-S",
			mac: "Cmd-S"
		},
		exec : () => {
			this.saveAll();
		}
	});
	this.editor.setTheme('ace/theme/twilight');
	this.editor.setValue(value);
};

_websitesEditorController.prototype.saveResource = function(path, value) {
	return new Promise((resolve, reject) => {
		return axios
			.post(`http://localhost:8001/websites/${this.website.name}/resource?path=${path}`, {
				resource : value
			})
			.then((response) => {
				return resolve();
			});
	});
};

_websitesEditorController.prototype.saveWebsite = function() {
	return new Promise((resolve, reject) => {

		//update our website object
		this.website.routes = this.routes.reduce((s, a) => {
			s[a.route] = {
				controller : a.controller,
				view : a.view
			};
			return s;
		}, {});
		this.website.tags = this.tags;

		return axios
			.put(`http://localhost:8001/websites/${this.website.name}`, this.website)
			.then((response) => {
				return resolve();
			});
	});
};

_websitesEditorController.prototype.saveAll = function() {
	//save the website object
	return this.saveWebsite().then(() => {
		//make sure our active resource is set
		this.resources[this.activeResource] = this.editor.getValue();

		return Promise.all(Object.keys(this.resources).map((k) => {
			return this.saveResource(k, this.resources[k]);
		}));
	}).then(() => {
		this.showSaveMessage();
	});
};

_websitesEditorController.prototype.refreshState = function() {
	this.caller.website = this.website;
	this.caller.routes = this.routes;
	this.caller.mainVisible = this.mainVisible;
	this.caller.viewEditorVisible = this.viewEditorVisible;
	this.caller.controllerEditorVisible = this.controllerEditorVisible;
	this.caller.tags = this.tags;
	this.caller.$forceUpdate();
};

_websitesEditorController.prototype.loadResource = function(path) {
	if (this.resources[path]) {
		return Promise.resolve(this.resources[path]);
	}

	return new Promise((resolve, reject) => {
		axios
			.get(`http://localhost:8001/websites/${this.website.name}/resource?path=${path}`)
			.then((response) => {
				this.resources[path] = response.data;

				return resolve(this.resources[path]);
			});
	});
};

_websitesEditorController.prototype.editView = function(path) {
	this.activeResource = path;
	this.loadResource(path).then((resource) => {
		this.mainVisible = false;
		this.viewEditorVisible = true;
		this.controllerEditorVisible = false;
		this.refreshState();
		var rawResource = resource;

		if (typeof(resource) === 'object') {
			rawResource = JSON.stringify(resource, null, 4);
		}

		setTimeout(() => {
			this.initEditor('viewEditor', 'json', rawResource);
		}, 10);
	});
};

_websitesEditorController.prototype.editController = function(path) {
	this.activeResource = path;
	this.loadResource(path).then((resource) => {
		this.mainVisible = false;
		this.viewEditorVisible = false;
		this.controllerEditorVisible = true;
		this.refreshState();
		setTimeout(() => {
			this.initEditor('controllerEditor', 'javascript', resource);
		}, 10);
	});
};

_websitesEditorController.prototype.mainView = function() {
	//save our active resource
	this.resources[this.activeResource] = this.editor.getValue();

	this.mainVisible = true;
	this.viewEditorVisible = false;
	this.controllerEditorVisible = false;
	this.refreshState();
};

_websitesEditorController.prototype.removeRoute = function(num) {
	if (this.routes.length <= 1) {
		return;
	}

	var i = 0;
	this.routes = this.routes.reduce((s, a) => {
		if (i !== num) {
			s.push(a);
		}
		i++;
		return s;
	}, []);
	this.refreshState();
};

_websitesEditorController.prototype.removeTag = function(num) {
	var i = 0;
	this.tags = this.tags.reduce((s, a) => {
		if (i !== num) {
			s.push(a);
		}
		i++;
		return s;
	}, []);
	this.refreshState();
};


_websitesEditorController.prototype.fetchWebsite = function(caller, name) {
	this.caller = caller;
	return axios
		.get(`http://localhost:8001/websites/${name}`)
		.then((response) => {
			this.website = response.data;

			//update our routes
			this.routes = Object.keys(response.data.routes).map((r) => {
				return {
					route 		: r,
					controller 	: response.data.routes[r].controller,
					view 		: response.data.routes[r].view,
				};
			});
			this.tags = response.data.tags || [];
			this.refreshState();
		});
};

_websitesEditorController.prototype.showSaveMessage = function() {
	this.caller.showAlert = true;
	this.caller.$forceUpdate();

	setTimeout(() => {
		this.caller.showAlert = false;
		this.caller.$forceUpdate();
	}, 1500);
};

_websitesEditorController.prototype.newRoute = function() {
	var name = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);

	this.routes.push({
		route 		: `/${name}`,
		view 		: `./view/${name}.json`,
		controller 	: `./controllers/${name}.js`,
	});

	//add our blank resources
	this.resources[`./view/${name}.json`] = JSON.stringify({
			"tag" : "html",
			"children" : [
			{
				"tag" : "head",
				"children" : []
			},
			{
				"tag" : "body",
				"children" : []
			}
		]
	}, null, 4);
	this.resources[`./controllers/${name}.js`] = [
"module.exports = {",
"	events : {",
"		load : function(event) {},",
"	}",
"}"
	].join("\n");
};

_websitesEditorController.prototype.newTag = function() {
	var name = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);

	this.tags.push({
		name 		: name,
		view 		: `./view/${name}.json`,
		controller 	: `./controllers/${name}.js`
	});

	this.resources[`./view/${name}.json`] = JSON.stringify({
		"tag" : "div",
		"children" : [

		]
	}, null, 4);
	this.resources[`./controllers/${name}.js`] = [
"module.exports = {",
"	events : {",
"		load : function(event) {},",
"	}",
"}"
	].join("\n");
}

const WebsiteEditor = {
	template : '#template-websiteEditor',
	data 	 : () => {
		return _websitesEditorControllerInstance.getData();
	},
	mounted  : function() {
		return _websitesEditorControllerInstance.fetchWebsite(this, this.$route.params.name);
	}
};

const _websitesEditorControllerInstance = new _websitesEditorController(WebsiteEditor);