const
	express 		= require("express"),
	bodyParser 		= require("body-parser"),
	cookieParser 	= require("cookie-parser"),
	hotreload 		= require("../shared/hotReload")();

let app = null;
let server = null;
let restarting = false;

const startup = () => {
	app = express();
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended : false }));
	app.use(cookieParser());

	let websiteService 	= require("./lib/websiteService")(app);

	websiteService.init(process.env.DIR).then(() => {
		server = app.listen(process.env.PORT, () => {
			console.log("Hotreload complete");
			restarting = false;
		});
	});
};

const reload = () => {
	if (!restarting) {
		restarting = true;
		if (server) {
			console.log("Closing...");
			server.close(startup);
		} else {
			startup();
		}
	}
};

hotreload.watch(process.env.DIR, reload);