define([
	"./rjs"
],function(requirejs){
    function createRjsApi() {
        //Create a method that will run the optimzer given an object
        //config.
        requirejs.optimize = function (config, callback, errback) {
            ///if (!loadedOptimizedLib) {
            ///    loadLib();
            ///    loadedOptimizedLib = true;
            ///}

            //Create the function that will be called once build modules
            //have been loaded.
            var runBuild = function (build, logger, quit) {
                //Make sure config has a log level, and if not,
                //make it "silent" by default.
                config.logLevel = config.hasOwnProperty('logLevel') ?
                                  config.logLevel : logger.SILENT;

                //Reset build internals first in case this is part
                //of a long-running server process that could have
                //exceptioned out in a bad state. It is only defined
                //after the first call though.
                if (requirejs._buildReset) {
                    requirejs._buildReset();
                    requirejs._cacheReset();
                }

                function done(result) {
                    //And clean up, in case something else triggers
                    //a build in another pathway.
                    if (requirejs._buildReset) {
                        requirejs._buildReset();
                        requirejs._cacheReset();
                    }

                    // Ensure errors get propagated to the errback
                    if (result instanceof Error) {
                      throw result;
                    }

                    return result;
                }

                errback = errback || function (err) {
                    // Using console here since logger may have
                    // turned off error logging. Since quit is
                    // called want to be sure a message is printed.
                    console.log(err);
                    quit(1);
                };

                build(config).then(done, done).then(callback, errback);
            };

            requirejs({
                context: 'build'
            }, ['build', 'logger', 'env!env/quit'], runBuild);
        };

        requirejs.tools = {
            useLib: function (contextName, callback) {
                if (!callback) {
                    callback = contextName;
                    contextName = 'uselib';
                }

                if (!useLibLoaded[contextName]) {
                    loadLib();
                    useLibLoaded[contextName] = true;
                }

                var req = requirejs({
                    context: contextName
                });

                req(['build'], function () {
                    callback(req);
                });
            }
        };

    }

    return createRjsApi;

});