define([
	"./env/args",
	"./env/assert",
	"./env/file",
	"./env/load",
	"./env/optmize",
	"./env/print",
	"./env/quit"
],function(args,assert,file,load,optimize,print,quit){
	return {
		args,
		assert,
		"fs":file,
		load,
		optimize,
		print,
		quit
	};
});