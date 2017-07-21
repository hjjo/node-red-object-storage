/**
 * Copyright 2017 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 * Author: hjjo
 **/


module.exports = function(RED) {
    "use strict";

    var os_lib = require('bluemix-objectstorage');
    var ObjectStorage = os_lib.ObjectStorage;
    var ObjectStorageContainer = os_lib.ObjectStorageContainer;
    var ObjectStorageObject = os_lib.ObjectStorageObject;

    RED.httpAdmin.get('/os/vcap', function(req,res) {
        var vcapServices = require('./lib/vcap');
	    var storages = vcapServices['Object-Storage'];
        console.log(storages);

        res.send(JSON.stringify(storages));
    });
    
    // Container Node
    function ContainerNode(n) {
        RED.nodes.createNode(this,n);

        this.method = n.method; // list objects, search, 
        this.container = n.container;
        this.query = n.query;

        // Retrieve the Object Storage config node
        this.osinstance = RED.nodes.getNode(n.osinstance);

        // copy "this" object in case we need it in context of callbacks of other functions.
        var node = this;

        // Check if the Config to the Service is given 
        if (this.osinstance) {
            // Do something with:
         	node.status({fill:"green",shape:"ring",text:"ready"});
        } else {
            // No config node configured
	        node.status({fill:"red",shape:"ring",text:"error"});
	        node.error('No object storage configuration found!');
	        return;
        }

        // respond to inputs....
        this.on('input', function (msg) {
         	// Local Vars and Modules

         	var method;
			var container;
			var query;

	        // Set the status to green
         	node.status({fill:"green",shape:"dot",text:"connected"});

         	// Check method 
         	if ((msg.method) && (msg.method.trim() !== "")) {
         		method = msg.method;
         	} else {
     			method = node.method;
         	}

         	// Check container
         	if ((msg.container) && (msg.container.trim() !== "")) {
         		container = msg.container;
         	} else {
     			container = node.container;
         	}

			// Check query
         	if ((msg.query) && (msg.query.trim() !== "")) {
         		query = msg.query;
         	} else {
     			query = node.query;
         	}

            var credentials = {
                projectId: node.osinstance.projectId,
                userId: node.osinstance.userId,
                password: node.osinstance.password,
                region: node.osinstance.region
            };

            var objstorage = new ObjectStorage(credentials);
            var objcontainer = new ObjectStorageContainer(container, objstorage);
            
	        if (method == "search") {
                objcontainer.search(query).then(function(objList){
                    msg.payload = objList;
                    node.status({fill:"green",shape:"ring",text:"ready"});
                    node.send(msg);
                })
                .catch(function(err){
                    msg.error = err;
                    node.error("Failed to search objects", msg);
                    node.error(msg.error);
                })
		    }
            else if(method == "list"){
                objcontainer.listObjects().then(function(objList){
                    msg.payload = objList;
                    node.status({fill:"green",shape:"ring",text:"ready"});
                    node.send(msg);
                })
                .catch(function(err){
                    msg.error = err;
                    node.error("Faild to get objects", msg);
                    node.error(msg.error);
                })
            }
        });

        // respond to close....
        this.on("close", function() {
            // Called when the node is shutdown - eg on redeploy.
            // Allows ports to be closed, connections dropped etc.
            // eg: node.client.disconnect();
        });
    }
    RED.nodes.registerType("os-container", ContainerNode);

    // Object Node
    function ObjectNode(n) {
        RED.nodes.createNode(this,n);

        this.method = n.method; // list objects, search, 
        this.container = n.container;
        this.object = n.object;
        this.tag = n.tag;

        // Retrieve the Object Storage config node
        this.osinstance = RED.nodes.getNode(n.osinstance);

        // copy "this" object in case we need it in context of callbacks of other functions.
        var node = this;

        // Check if the Config to the Service is given 
        if (this.osinstance) {
            // Do something with:
         	node.status({fill:"green",shape:"ring",text:"ready"});
        } else {
            // No config node configured
	        node.status({fill:"red",shape:"ring",text:"error"});
	        node.error('No object storage configuration found!');
	        return;
        }

        // respond to inputs....
        this.on('input', function (msg) {
         	// Local Vars and Modules

         	var method;
			var container;
			var object;
            var tag;
            var file;

	        // Set the status to green
         	node.status({fill:"green",shape:"dot",text:"connected"});

         	// Check method 
         	if ((msg.method) && (msg.method.trim() !== "")) {
         		method = msg.method;
         	} else {
     			method = node.method;
         	}

         	// Check container
         	if ((msg.container) && (msg.container.trim() !== "")) {
         		container = msg.container;
         	} else {
     			container = node.container;
         	}

			// Check object
         	if (msg.object) {
         		object = msg.object;
         	} else {
     			object = node.object;
         	}

             // Check tag
         	if ((msg.tag) && (msg.tag.trim() !== "")) {
         		tag = msg.tag;
         	} else {
     			tag = node.tag;
         	}

             // Check file
         	if ((msg.file) && (msg.file.trim() !== "")) {
         		file = msg.file;
         	} else {
     			node.error("file is not set.");
         	}

            var credentials = {
                projectId: node.osinstance.projectId,
                userId: node.osinstance.userId,
                password: node.osinstance.password,
                region: node.osinstance.region
            };

            var objstorage = new ObjectStorage(credentials);
            var objcontainer = new ObjectStorageContainer(container, objstorage);
            var objobject = new ObjectStorageObject(object, objcontainer);
            
	        if (method == "tag") {
                objobject.metadata().then(function(orginMeta){
                    tag = tag.replace(/\s+/g, '');
                    var tags = tag.split(",");
                    tags.forEach(function(t){
                        var tagObj = t.split("=");
                        orginMeta[tagObj[0]] = tagObj[1];
                    });
                    
                    objobject.updateMetadata(orginMeta).then(function(){
                        console.log(tag)
                        objobject.metadata().then(function(metadata){
                            msg.payload = metadata
                            node.status({fill:"green",shape:"ring",text:"ready"});
                            node.send(msg);
                        })
                        .catch(function(err){
                            msg.error = err;
                            node.error("Faild to get metadata", msg);
                            node.error(msg.error);
                        })
                    })
                    .catch(function(err){
                        msg.error = err;
                        node.error("Faild to update metadata", msg);
                        node.error(msg.error);
                    })
                })
                .catch(function(err){
                    msg.error = err;
                    node.error("Faild to get object", msg);
                    node.error(msg.error);
                })
		    }
            else if(method == "put"){
                console.log(file)
                //objcontainer.createObject(file)
            }
        });

        // respond to close....
        this.on("close", function() {
            // Called when the node is shutdown - eg on redeploy.
            // Allows ports to be closed, connections dropped etc.
            // eg: node.client.disconnect();
        });
    }
    RED.nodes.registerType("os-object", ObjectNode);

    // Object Storage Config Node
	function ObjectStorageConfigNode(n) {
        // Create a RED node
		RED.nodes.createNode(this,n);
		
		// check the cfgtype
		this.cfgtype = n.cfgtype;

		if (this.cfgtype == 'bluemix') {
            this.serviceName = n.serviceName;
			// get the VCAP_SERVICES
            var vcapServices = require('./lib/vcap');
	        var storages = vcapServices['Object-Storage'];

            var st = storages.find(function(s){
                return (s.name == n.serviceName);
            });

            var osCred = st.credentials;
			
			// Get them
			this.region = osCred.region;
			this.userId = osCred.userId;
			this.projectId = osCred.projectId;
			//this.userName = osCred.userName;
			this.password = osCred.password;		
		} else {			
			// Store local copies of the node configuration (as defined in the .html)
			this.region = n.region;
			this.userId = n.userId;
			this.projectId = n.projectId;
			//this.userName = n.userName;
			this.password = n.password;		
		}
		this.name = n.name;
	}
	RED.nodes.registerType("os-service-config", ObjectStorageConfigNode);
};
