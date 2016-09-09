/**
 * Created by fwang1 on 3/25/15.
 */
module.exports = function(RED) {
  /*
   *   MessageHub Producer
   */
  function MessageHubProducer(config) {
    RED.nodes.createNode(this, config);

    var node = this;
    var MessageHub = require('message-hub-rest');

    var apikey = config.apikey;
    var kafka_rest_url = config.kafkaresturl;
    var services = {
      "messagehub": [
        {
          "credentials": {
            "api_key": apikey,
            "kafka_rest_url": kafka_rest_url
          }
        }
      ]
    }

    var instance = new MessageHub(services);
    var topic = config.topic;

    try {
      this.on("input", function(msg) {
        var payloads = [];

        node.log(msg.payload);
        payloads.push(msg.payload);

        var list = new MessageHub.MessageList(payloads);

        instance.produce(topic, list.messages)
        .then(function(data) {
          node.log("Message sent");
          node.log(data);
        })
        .fail(function(error) {
          node.error(error);
        });
      });
    }
    catch(e) {
      node.error(e);
    }
  }

  RED.nodes.registerType("messagehub out", MessageHubProducer);

  /*
   * Message Hub Consumer
   */
  function MessageHubConsumer(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var MessageHub = require('message-hub-rest');
    var apikey = config.apikey;
    var kafka_rest_url = config.kafkaresturl;
    var services = {
      "messagehub": [
        {
          "credentials": {
            "api_key": apikey,
            "kafka_rest_url": kafka_rest_url
          }
        }
      ]
    }

    var instance = new MessageHub(services);
    var topic = config.topic;
    var consumerInstance;

    function random() {
      return Math.floor((Math.random() * 100) + 1);
    }

    instance.consume('nodered-' + topic + "-" + random(), 'nodered' + random(), { 'auto.offset.reset': 'largest' })
    .then(function(response) {
	  node.log("Consumer: " + 'nodered' + random() + " is created.");
      consumerInstance = response[0];
    })
    .fail(function(error) {
      node.error(error);
	  return;
    });

    try {
      setInterval(function() {
		if(consumerInstance){
			try{
				consumerInstance.get(topic)
				.then(function(data) {
				  for(var i=0; i<data.length; i++) {
					node.send({payload: data[i]});
				  }
				})
				.fail(function(err) {
				  node.error(err);
				});
			}catch(e){
				node.error(e);
				return;
			}
		}
      }, 2000);
    }
    catch(e){
      node.error(e);
      return;
    }
	this.on('close', function(done){
		if(consumerInstance){
			node.log("Removing consumer instance: ");
			consumerInstance.remove()
			.fin(function(response){
				try{
					node.log("res 1 " + JSON.stringify(response));
				}catch(e){
					node.log("res 2 " + response);
				}
				// reset consumerInstance if flow is redeployed
				consumerInstance = null;
				done();
			});
			
		}
	});
  }

  RED.nodes.registerType("messagehub in", MessageHubConsumer);
};
