const _websitesEditorController = function(page) {
	this._page 						= page;
	this.website 					= {};
	this.clients 					= [];
	this.routes 					= [];
	this.tags 						= [];
	this.mainVisible 				= true;
	this.viewEditorVisible 			= false;
	this.controllerEditorVisible 	= false;
	this.newResourceVisible 		= false;
	this.sourceMode 				= false;
	this.resources 					= {};
	this.staticfiles 				= [];
	this.tagsets 					= {};
	this.activeView 				= {};
	this.loadedTagsets 				= {};
	this.activeDefinition 			= {};
	this.activeProperties 			= {};
	this.uniqueTags 				= {};
	this.loadedProperties 			= {};
	this.propertyGroups 			= {};
	this.tagSelected 			 	= false;
	this.editor 					= null;
};

_websitesEditorController.prototype.wipeData = function() {
	this.website 					= {};
	this.routes 					= [];
	this.tags 						= [];
	this.resources 					= {};
	this.staticfiles 				= [];
	this.mainVisible 				= true;
	this.viewEditorVisible 			= false;
	this.controllerEditorVisible 	= false;
	this.newResourceVisible 		= false;
	this.sourceMode 				= false;
	this.activeProperties 			= {};
	this.activeDefinition 			= {};
	this.propertyGroups 			= {};
	this.loadedTagsets 				= {};
	this.uniqueTags 				= {};
	this.loadedProperties 			= {};
	this.tagSelected 				= false;
	this.tagsets 					= {};
};

_websitesEditorController.prototype.getData = function() {
	return {
		website 				: this.website,
		routes 					: this.routes,
		clients 				: this.clients,
		tags 					: this.tags,
		mainVisible 			: this.mainVisible,
		viewEditorVisible 		: this.viewEditorVisible,
		controllerEditorVisible : this.controllerEditorVisible,
		newResourceVisible 		: this.newResourceVisible,
		showAlert 				: false,
		sourceMode 				: this.sourceMode,
		staticfiles 			: this.staticfiles,
		tagsets 				: this.tagsets,
		activeView 				: this.activeView,
		activeProperties 		: this.activeProperties,
		allProperties 			: this.propertyGroups,
		tagSelected 			: this.tagSelected,
		activeDefinition 		: this.activeDefinition
	};
};

_websitesEditorController.prototype.autoProvisionClient = function() {
	if (!this.website.name) {
		return;
	}

	//generate a default client
	const client = {
	    "client_id": `interface-${this.website.name}-client`,
	    "client_secret": `${window.generateGuid().split('-').reverse().join('')}${window.generateGuid().split('-').reverse().join('')}${window.generateGuid().split('-').reverse().join('')}`,
	    "scope": "openid roles offline_access",
	    "grants" : [
        	"client_credentials",
			"authorization_code",
        	"refresh_token"
    	],
	    "redirect_uris": [
	        `${window.hosts.interface}/${this.website.name}/_auth`
	    ]
	};

	//save the client and set the value
	return window.axios
		.post(`${window.hosts.kernel}/security/clients`, JSON.stringify(client), {
			headers : {
				"Content-Type" : "application/json",
				Authorization : `Bearer ${window.getToken()}`
			}
		})
		.then((response) => {
			//set the client and save the website
			this.website.client_id = client.client_id;
			return this.fetchClients().then(() => {
				return this.saveAll();
			});
		}).catch((err) => {
			console.log(err);
		});
};

_websitesEditorController.prototype.initEditor = function(elem, type, value) {
	//set our editor up
	this.editor = window.ace.edit(document.getElementById(elem), {
		mode : "ace/mode/" + type,
		selectionStyle : "text"
	});
	this.editor.commands.addCommand({
		name : "save",
		bindKey : {
			win: "Ctrl-S",
			mac: "Cmd-S"
		},
		exec : () => {
			this.saveAll();
		}
	});
	this.editor.setTheme("ace/theme/twilight");
	this.editor.setValue(value);
};

_websitesEditorController.prototype.saveResource = function(path, value) {
	return new Promise((resolve, reject) => {
		if (typeof(value) === 'object') {
			value = JSON.stringify(value, null, 4);
		}

		return window.axios
			.post(`${window.hosts.kernel}/websites/${this.website.name}/resource?path=${path}`, {
				resource : value
			}, {
				headers : {
					Authorization : `Bearer ${window.getToken()}`
				}
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
				controller 	: a.controller,
				view 		: a.view,
				secure 		: a.secure,
				roles 		: a.roles,
			};
			return s;
		}, {});
		this.website.tags = this.tags;

		return window.axios
			.put(`${window.hosts.kernel}/websites/${this.website.name}`, this.website, {
				headers : {
					Authorization : `Bearer ${window.getToken()}`
				}
			})
			.then((response) => {
				return resolve();
			});
	});
};

_websitesEditorController.prototype.saveAll = function() {
	//save the website object
	return this.saveWebsite().then(() => {
		if (this.activeResource) {
			//make sure our active resource is set
			if (!this.sourceMode && this.viewEditorVisible) {
				this.resources[this.activeResource] = this.getConfigFromEditor();
 			} else {
 				this.resources[this.activeResource] = this.editor.getValue();
 			}
		}

		return Promise.all(Object.keys(this.resources).map((k) => {
			return this.saveResource(k, this.resources[k]);
		}));
	}).then(() => {
		this.showSaveMessage();
	});
};

_websitesEditorController.prototype.showEditor = function() {
	this.resources[this.activeResource] = this.editor.getValue();
	this.activeView = JSON.parse(this.resources[this.activeResource]);
	this.sourceMode = false;
	this.activeDefinition = {};
	this.activeProperties = {};
	this.refreshState();
};

_websitesEditorController.prototype.showSource = function() {
	this.sourceMode = true;
	this.activeProperties = this.caller.activeProperties;
	window.selectedTags.forEach((t) => {
		t.removeSelection();
	});
	window.selectedTags = [];
	this.tagSelected = false;
	setTimeout(() => {
		this.initEditor("viewEditor", "json", this.getConfigFromEditor());
		this.refreshState();
	}, 25);
};

_websitesEditorController.prototype.refreshState = function() {
	this.caller.website = this.website;
	this.caller.clients = this.clients;
	this.caller.routes = this.routes;
	this.caller.mainVisible = this.mainVisible;
	this.caller.viewEditorVisible = this.viewEditorVisible;
	this.caller.controllerEditorVisible = this.controllerEditorVisible;
	this.caller.tags = this.tags;
	this.caller.newResourceVisible = this.newResourceVisible;
	this.caller.staticfiles = this.staticfiles;
	this.caller.sourceMode = this.sourceMode;
	this.caller.tagsets = this.tagsets;
	this.caller.activeView = this.activeView;
	this.caller.activeProperties = this.activeProperties;
	this.caller.tagSelected = this.tagSelected;
	this.caller.activeDefinition = this.activeDefinition;
	this.caller.propertyGroups = this.propertyGroups;
	this.caller.$forceUpdate();
};

_websitesEditorController.prototype.loadResource = function(path) {
	if (this.resources[path]) {
		return Promise.resolve(this.resources[path]);
	}

	return new Promise((resolve, reject) => {
		window.axios
			.get(`${window.hosts.kernel}/websites/${this.website.name}/resource?path=${path}`, {
				headers : {
					Authorization : `Bearer ${window.getToken()}`
				}
			})
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
		this.sourceMode = false;
		this.controllerEditorVisible = false;
		var rawResource = resource;

		if (typeof(resource) === "object") {
			rawResource = JSON.stringify(resource, null, 4);
		}

		this.activeView = JSON.parse(rawResource);

		//convert our custom tags into a tagset
		return this.configureCustomTagset();
	}).then(() => {
		this.refreshState();
	});
};

_websitesEditorController.prototype.findProps = function(obj, props) {
	if (!obj) {
		return props;
	}

	if (typeof(obj) === 'string') {
		if (obj.indexOf('$.') !== -1) {
			let parts = obj.split('$.');
			parts.forEach((p) => {
				let name = p.split(' ')[0];
				if (name) {
					props[name] = "";
				}
			});
		}

		return props;
	}

	if (Array.isArray(obj)) {
		obj.forEach((o) => {
			props = this.findProps(o, props);
		});

		return props;
	}

	if (typeof(obj) === 'object') {
		Object.keys(obj).forEach((k) => {
			props = this.findProps(obj[k], props);
		});

		return props;
	}


	return props;
};

_websitesEditorController.prototype.configureCustomTagset = function() {
	this.tagsets.Custom = {
		name : 'Custom',
		tags : []
	};

	return Promise.all(this.tags.map((t) => {
		return this.loadResource(t.view).then((resource) => {
			this.tagsets.Custom.tags.push({
				tag 			: t.name,
				name 			: t.name,
				properties 		: this.findProps(resource, {})
			});

			this.uniqueTags[t.name] = resource;
		});
	}));
};

_websitesEditorController.prototype.editController = function(path) {
	this.activeResource = path;
	this.loadResource(path).then((resource) => {
		this.mainVisible = false;
		this.viewEditorVisible = false;
		this.controllerEditorVisible = true;
		this.refreshState();
		setTimeout(() => {
			this.initEditor("controllerEditor", "javascript", resource);
		}, 10);
	});
};

_websitesEditorController.prototype.mainView = function() {
	//save our active resource
	if (!this.sourceMode && this.viewEditorVisible) {
		this.resources[this.activeResource] = this.getConfigFromEditor();
	} else {
		this.resources[this.activeResource] = this.editor.getValue();
	}

	this.activeResource = null;
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

_websitesEditorController.prototype.fetchProperties = function(name) {
	if (this.loadedProperties[name]) {
		return Promise.resolve();
	}

	return window.axios.get(`${window.hosts.kernel}/properties/${name}`, {
		headers : {
			Authorization : `Bearer ${window.getToken()}`
		}
	}).then((response) => {
		this.loadedProperties[name] = true;
		this.propertyGroups[name] = response.data;
		this.refreshState();
	});
};

_websitesEditorController.prototype.fetchTagset = function(name) {
	if (this.loadedTagsets[name]) {
		return Promise.resolve();
	}

	return window.axios.get(`${window.hosts.kernel}/tags/${name}`, {
		headers : {
			Authorization : `Bearer ${window.getToken()}`
		}
	}).then((response) => {
		this.loadedTagsets[name] = true;

		response.data.forEach((group) => {
			group.tags.forEach((t) => {
				this.uniqueTags[t.tag] = t;
			});

			if (!this.tagsets[group.name]) {
				this.tagsets[group.name] = group;
			} else {
				//add the elements
				this.tagsets[group.name].tags = this.tagsets[group.name].tags.concat(group.tags);
			}
		});

		this.refreshState();
	});
};

_websitesEditorController.prototype.fetchWebsite = function(caller, name) {
	this.caller = caller;
	return window.axios
		.get(`${window.hosts.kernel}/websites/${name}`, {
			headers : {
				Authorization : `Bearer ${window.getToken()}`
			}
		})
		.then((response) => {
			this.website = response.data;

			//update our routes
			this.routes = Object.keys(response.data.routes).map((r) => {
				return {
					route 		: r,
					roles 		: response.data.routes[r].roles,
					secure 		: response.data.routes[r].secure,
					controller 	: response.data.routes[r].controller,
					view 		: response.data.routes[r].view,
				};
			});
			this.tags = response.data.tags || [];
			this.refreshState();
		});
};

_websitesEditorController.prototype.fetchClients = function(caller) {
	this.caller = this.caller || caller;
	return window.axios
		.get(`${window.hosts.kernel}/security/clients`, {
			headers : {
				Authorization : `Bearer ${window.getToken()}`
			}
		})
		.then((response) => {
			this.clients = response.data;
			this.refreshState();
			return Promise.resolve();
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
	var name = Math.random().toString(36).replace(/[^a-z]+/g, "").substr(0, 5);

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
	var name = Math.random().toString(36).replace(/[^a-z]+/g, "").substr(0, 5);

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
};

_websitesEditorController.prototype.newStaticFile = function() {
	this.newResourceVisible = true;
	this.refreshState();
};

_websitesEditorController.prototype.closeUploader = function() {
	this.newResourceVisible = false;
	this.refreshState();
};

_websitesEditorController.prototype.uploadResource = function() {
	var formData = new FormData();
	var imagefile = document.querySelector("#file");
	formData.append("resource", imagefile.files[0]);
	return window.axios.post(`${window.hosts.kernel}/websites/${this.website.name}/staticfiles`, formData, {
		headers: {
	  		"Content-Type" : "multipart/form-data",
	  		Authorization  : `Bearer ${window.getToken()}`
		}
	}).then(() => {
		this.newResourceVisible = false;
		return this.fetchStaticFiles(this.caller, this.website.name);
	});
};

_websitesEditorController.prototype.fetchStaticFiles = function(caller, name) {
	this.caller = caller;
	return window.axios.get(`${window.hosts.kernel}/websites/${name}/staticfiles`, {
		headers : {
			Authorization : `Bearer ${window.getToken()}`
		}
	}).then((response) => {
		this.staticfiles = response.data;
		this.refreshState();
	});
};

_websitesEditorController.prototype.removeResource = function(filename) {
	return window.axios.delete(`${window.hosts.kernel}/websites/${this.website.name}/staticfiles/${filename}`, {
		headers : {
			Authorization : `Bearer ${window.getToken()}`
		}
	}).then(() => {
		return this.fetchStaticFiles(this.caller, this.website.name);
	});
};

_websitesEditorController.prototype.setDroppableConfig = function(event) {
	const groupName = event.target.attributes['data-group'].value;
	const tagName = event.target.attributes['data-tag'].value;

	let config = {};
	_websitesEditorControllerInstance.tagsets[groupName].tags.forEach((t) => {
		if (t.name === tagName) {
			config = t;
		}
	});

	event.dataTransfer.setData('text', JSON.stringify(config));
};

_websitesEditorController.prototype.clearProperties = function() {
	this.tagSelected = false;
	this.refreshState();
};

_websitesEditorController.prototype.isExpression = function(val) {
	return typeof(val) !== 'undefined' && val !== null && !Array.isArray(val) && val.indexOf && val.indexOf('$.') !== -1;
};

_websitesEditorController.prototype.setAsExpression = function(prop) {
	this.activeProperties[prop] = "$.";
	this.refreshState();
};

_websitesEditorController.prototype.unsetAsExpression = function(prop) {
	this.activeProperties[prop] = "";
	this.refreshState();
};

_websitesEditorController.prototype.ensureArray = function(prop) {
	if (!Array.isArray(this.caller.activeProperties[prop])) {
		if (!(typeof(this.caller.activeProperties[prop]) === 'undefined' || this.caller.activeProperties[prop] === null)) {
			this.caller.activeProperties[prop] = [this.caller.activeProperties[prop]];
		} else {
			this.caller.activeProperties[prop] = [];
		}
	}

	return this.caller.activeProperties[prop];
};

_websitesEditorController.prototype.addToArray = function(prop) {
	this.activeProperties = this.caller.activeProperties;

	if (Array.isArray(this.activeProperties[prop])) {
		this.activeProperties[prop].push('');
	} else {
		if (!(typeof(this.activeProperties[prop]) === 'undefined' || this.activeProperties[prop] === null)) {
			this.activeProperties[prop] = [this.activeProperties[prop]];
		} else {
			this.activeProperties[prop] = [''];
		}
	}

	console.log(this.activeProperties[prop]);

	this.refreshState();
};

_websitesEditorController.prototype.setProperties = function(properties) {
	//find the tags definition
	this.activeDefinition = this.uniqueTags[properties.tag];
	this.activeProperties = properties;
	this.tagSelected = true;

	if (this.activeDefinition && this.activeDefinition.includedPropertyGroups) {
		this.activeDefinition.includedPropertyGroups.forEach((group) => {
			if (this.propertyGroups[group]) {
				Object.assign(this.activeDefinition.properties, this.propertyGroups[group]);
			}
		});
	}

	if (this.activeDefinition && this.activeDefinition.events) {
		if (this.activeDefinition.events.click) {
			this.activeProperties.onclick = this.activeProperties.onclick || {};
		}
	}

	this.activeProperties.if = this.activeProperties.if || [];

	//generate our misc properties group if required
	let includedProps = [];
	Object.keys(this.activeDefinition.propertyGroups).forEach((groupName) => {
		includedProps = includedProps.concat(this.activeDefinition.propertyGroups[groupName].properties);
	});

	let remaining = [];
	Object.keys(this.activeDefinition.properties).forEach((prop) => {
		if (includedProps.indexOf(prop) === -1) {
			remaining.push(prop);
		}
	});

	if (remaining.length > 0) {
		this.activeDefinition.propertyGroups.push({
			name : "Other Properties",
			properties : remaining
		});
	}

	this.refreshState();
};

_websitesEditorController.prototype.getConfigFromEditor = function() {
	return JSON.stringify(this.activeView, null, 4);
};

window.WebsiteEditor = {
	template : "#template-websiteEditor",
	data 	 : () => {
		return window._websitesEditorControllerInstance.getData();
	},
	mounted  : function() {
		window._websitesEditorControllerInstance.wipeData();

		if (this.$route.params.name === ".new") {
			return window._websitesEditorControllerInstance.fetchClients(this).then(() => {
				//fetch our basic tagset
				return window._websitesEditorControllerInstance.fetchTagset("basic");
			}).then(() => {
				//fetch our global properties
				return window._websitesEditorControllerInstance.fetchProperties("global");
			});
		}

		return window._websitesEditorControllerInstance.fetchWebsite(this, this.$route.params.name).then(() => {
			return window._websitesEditorControllerInstance.fetchClients(this);
		}).then(() => {
			return window._websitesEditorControllerInstance.fetchStaticFiles(this, this.$route.params.name);
		}).then(() => {
			//fetch our basic tagset
			return window._websitesEditorControllerInstance.fetchTagset("basic");
		}).then(() => {
			//fetch our global properties
			return window._websitesEditorControllerInstance.fetchProperties("global");
		});
	}
};

window.selectedTags = [];

function detectValues(string, data) {
	if (!string || !string.indexOf || string.indexOf("$.") === -1) {
		return string;
	}

	const regex = /(\$\.[\w\.]+)/gm;
	let m;
	let replacements = [];

	while ((m = regex.exec(string)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === regex.lastIndex) {
			regex.lastIndex++;
		}

		// The result can be accessed through the `m`-variable.
		m.forEach((match, groupIndex) => {
			var rep = resolveValue(match, data);

			replacements.push({
				val : match,
				rep : resolveValue(match, data)
			});
		});
	}

	replacements.forEach((r) => {
		if (typeof(r.rep) === "object") {
			string = r.rep;
		} else {
			string = string.replace(r.val, r.rep);
		}
	});

	return string;
};

function resolveValue(path, data) {
	let current = data;
	let parts = path.replace("$.", "").split(".");
	parts.forEach((p) => {
		if (current) {
			current = current[p];
		}
	});

	if (typeof(current) === 'undefined') {
		return path;
	}

	return current;
};

function renderTag(tag, scope, expandChildren) {
	let parts = [];
	let needsEnd = false;

	let tagName = detectValues(tag.tag, scope);

	parts.push(`<${tagName}`);

	Object.keys(tag).forEach((k) => {
		if (["text", "tag", "onclick", "children", "repeat", "submit", "bind", "_scope", "if"].indexOf(k) === -1) {
			let value = detectValues(tag[k], scope);

			if (!(typeof(value) === 'undefined' || value === null)) {
				if (value === true) {
					parts.push(` ${k}="${k}" `);
				}

				if (!(value === false)) {
					parts.push(` ${k}="${detectValues(tag[k], scope)}" `);
				}
			}
		}
	});

	if (tag.text) {
		needsEnd = true;
		parts.push('>');
		if (Array.isArray(tag.text)) {
			parts = parts.concat(tag.text.map((t) => {
				return detectValues(t, scope);
			}));
		} else {
			parts.push(detectValues(tag.text, scope));
		}
	}

	if (tag.children && expandChildren) {
		if (!needsEnd) {
			needsEnd = true;
			parts.push('>');
		}

		tag.children.forEach((child) => {
			parts.push(renderTag(child, scope));
		});
	}

	if (needsEnd || ['textarea'].indexOf(tagName) !== -1) {
		if (!needsEnd) {
			parts.push('>');
		}

		parts.push(`</${tagName}>`);
	} else {
		parts.push('/>');
	}

	return parts.join('');
};

window.Vue.component("tagsection", {
	template : "#template-tagSection",
	props : [
		"tag"
	],
	data : function() {
		let ret = {
			droppable 	: false,
			selected 	: false,
			definition 	: _websitesEditorControllerInstance.uniqueTags[this.$options.propsData.tag.tag] || {}
		};

		ret.renderTag = ((tag) => {
			if (window._websitesEditorControllerInstance.tags.find((t) => {
				return t.name === tag.tag;
			})) {
				return renderTag(window._websitesEditorControllerInstance.uniqueTags[tag.tag], tag, true);
			}

			return renderTag(tag, {}, false);
		}).bind(ret);

		ret.removeSelection = () => {
			ret.selected = false;
		};

		ret.onClick = (event) => {
			let shouldSelect = window.selectedTags.indexOf(this) === -1;

			window.selectedTags.forEach((t) => {
				t.removeSelection();
			});
			window.selectedTags = [];

			event.preventDefault();
			event.stopPropagation();

			if (shouldSelect) {
				ret.selected = true;
				window.selectedTags.push(this);

				_websitesEditorControllerInstance.setProperties(this.$options.propsData.tag);
			} else {
				_websitesEditorControllerInstance.clearProperties();
			}

			return true;
		};

		ret.onDragOver = function(event) {
			event.preventDefault();
		};

		ret.onDragEnter = function(event) {
			event.preventDefault();
			ret.droppable = true;
		};

		ret.onDragLeave = function(event) {
			ret.droppable = false;
		};

		ret.onDrop = (event) => {
			event.stopPropagation();
			ret.droppable = false;

			const config = JSON.parse(event.dataTransfer.getData('text'));

			//construct our object
			let newTag = {
				tag 		: config.tag,
				children 	: null,
			};

			Object.keys(config.properties).forEach((prop) => {
				newTag[prop] = null;
			});

			this.$options.propsData.tag.children = this.$options.propsData.tag.children || [];
			this.$options.propsData.tag.children.push(newTag);
		};

		return ret;
	},
	mounted : function() {

	}
});

window._websitesEditorControllerInstance = new _websitesEditorController(window.WebsiteEditor);