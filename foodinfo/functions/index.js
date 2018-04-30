'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const admin = require('firebase-admin');
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

admin.initializeApp(functions.config().firebase);
var db = admin.firestore();

function getFoodDocs(name) {
  var promise = db.collection('food').where('name',"==", name).get();
  return promise.then( snapshot => {
      return snapshot.docs;
  }).catch( err => {
      console.error('Error getting documents', err);
      return new FirebaseFirestore.QueryDocumentSnapshot[0];
  });
}

function getBE(foodDocs, amount, unit) {
  for (var i = 0; i < foodDocs.length; i++) {
    if ( foodDocs[i].get('unit') == unit ) {
      console.debug("getBE - found exact matching unit: " + unit);
      var docAmount = foodDocs[i].get('amount');
      var docBE = foodDocs[i].get('BE');
      return ( docBE / docAmount ) * amount;
    }
  }
  console.debug("getBE - could not find matching unit for " + unit);
  return -1;
}

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  
  const agent = new WebhookClient({ request, response });
 
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  function broteinheiten(agent) {
      var amount = agent.parameters["number"];
      var unit = agent.parameters["unit"];
      var food = agent.parameters["food"];
      var target = agent.parameters["request"];
      
      console.log('Amount ' + amount);
      console.log('Unit ' + unit);
      console.log('Food ' + food);
      console.log('Request ' + target);

      var promise = getFoodDocs(food);
      promise.then( docs => {
        if (docs.length > 0) {
          var bes = getBE(docs, amount, unit);
          if(bes >= 0) {
            return agent.add(amount + " " + unit + " " + food + " haben " + bes + " Broteinheiten.");
          }
          else {
            return agent.add(docs[0].get('amount') + " " + docs[0].get('unit') + " " + docs[0].get('name') + " haben " + docs[0].get('BE') + " Broteinheiten.");
          }
        } else {
          return agent.add("Leider kenne ich " + food + " nicht.");
        }
      }).catch( err => {
        console.error('Error getting documents', err);
        return agent.add("Irgendwas ist schief gelaufen.");
      });
      
      return promise;  
  }

// Run the proper function handler based on the matched Dialogflow intent name
let intentMap = new Map();
intentMap.set('Default Welcome Intent', welcome);
intentMap.set('Default Fallback Intent', fallback);
intentMap.set('broteinheiten', broteinheiten);
// intentMap.set('your intent name here', googleAssistantHandler);
agent.handleRequest(intentMap);
});