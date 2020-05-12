[Back to Index](/documentation)

# Services

Services are managed within an IoC (Inversion of Control) container, allowing them to be injected into:

* Website Controllers
* API Controllers

You can register your services within the Services section of the admin. Each service should follow the following pattern:

```
const service = function(serviceDep) {
	this.serviceDep = serviceDep;
};

service.prototype.something = function(value) {
	return value * this.serviceDep.getMultiplier();
};

module.exports = service;
```

Once a service is named it cannot be renamed.