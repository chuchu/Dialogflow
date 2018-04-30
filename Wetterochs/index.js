'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
let Parser = require('rss-parser');
var h2p = require('html2plaintext');
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcomeIntent(agent) {
    return getShortWeather().then( x => {
        return agent.add('Hallo, ' + x);
    }).catch( x => {
        console.error(x);
        return agent.add('Leider ist ein Fehler passiert. Bitte versuche es später noch einnmal.');
    });
  }
 
  function fallbackIntent(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }
  
  function getLongWeatherIntent(agent) {
    return getLongWeather().then( x => {
        return agent.add(x);
    }).catch( x => {
        console.error(x);
        return agent.add('Leider ist ein Fehler passiert. Bitte versuche es später noch einnmal.');
    });
  }
  
  let intentMap = new Map();
  intentMap.set('Default Fallback Intent', fallbackIntent);
  intentMap.set('Welcome', welcomeIntent);
  intentMap.set('LongWeather', getLongWeatherIntent);
  agent.handleRequest(intentMap);
});

function getLongWeather() {
    let parser = new Parser();
    var promise = parser.parseURL('http://www.wettermail.de/wetter/current/wettermail.rss');
    return promise.then( feed => {
        return h2p(feed.items[0].content).replace(/ *\([^)]*\) */g, "");
    }).catch( err => {
        console.error(err);
        return "";
    });
}

function getShortWeather() {
    let parser = new Parser();
    var promise = parser.parseURL('http://www.wettermail.de/wetter/current/wettermail.rss');
    return promise.then( feed => {
        return h2p(feed.items[0].title).substring(9);
    }).catch( err => {
        console.error(err);
        return "";
    });
}