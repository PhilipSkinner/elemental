const ruleService = function(request) {
	this.request = request;
};

ruleService.prototype.callRuleset = function(name, facts, token) {
	return new Promise((resolve, reject) => {
		this.request.post(`http://localhost:8007/${name}`, {
			body : JSON.stringify(facts),
			headers : {
				"content-type" : "application/json",
				Authorization : `Bearer ${token}`
			}
		}, (err, res, body) => {
			if (err) {
				return reject(err);
			}

			let result = null;
			try {
				result = JSON.parse(body);
			} catch(e) {
				return reject(new Error("Invalid response received from ruleset call"));
			}

			return resolve(result);
		});
	});
};

module.exports = function(request) {
	if (!request) {
		request = require("request");
	}

	return new ruleService(request);
};